// 總結卡資料推導(純函式,規格書 §2.4;開發設計方針.md > Phase 3)。
// 輸入為題庫定義、作答記錄與開始作答時抓的統計快照——與答題頁用的是同一份快照與
// 同一個 computeRatio,確保「主標區所有比例與答題頁口徑一致」(規格書 §2.4 驗收)。
//
// 決策(總結卡用「本輪選擇」覆蓋 answers;2026-07-17 推翻原決策):呼叫端(quizFlow.js
// 的 showComplete)傳入 `{ ...progress.answers, ...currentChoices }`,不是單純的
// progress.answers。理由:規格書 §6 明寫重玩可看到「新的總結卡」,§2.4 驗收也要求主標
// 區比例與答題頁口徑一致(答題頁重玩時本來就是用 currentChoices 算比例、顯示「你上次
// 選的是這個」提示的同時仍可改選);若總結卡固定顯示第一輪的舊答案,會與答題頁畫面
// 對不上。原決策(採用 progress.answers,理由是 answers 才是真正被計票的那一票)已被
// 上述規格條文推翻——但這只影響總結卡「顯示」哪一輪答案,不影響送票:recordAnswer 的
// 「第一次答案不覆寫、已答不重送」語意、progress.answers 本身完全不受影響。

import { computeRatio } from "./ratio.js";

/**
 * @param {{questions: Array<{id:string, a:{text:string}, b:{text:string}}>}} quiz
 * @param {Record<string, "a"|"b">} answers 答題記錄;呼叫端傳入 `{ ...progress.answers,
 *   ...currentChoices }`(總結卡以本輪選擇覆蓋,見檔頭決策),而非單純的 progress.answers
 * @param {Record<string, {a:number,b:number}>} snapshot 開始作答時的統計快照
 * @returns {Array<{id:string, index:number, choice:"a"|"b", text:string, percent:number, isMinority:boolean}>}
 */
export function computeQuestionResults(quiz, answers, snapshot) {
  return quiz.questions.map((question, index) => {
    const choice = answers[question.id];
    // 快照缺該題 key 時防呆為 {a:0,b:0},與 quizFlow.js 的 selectChoice 同一套規則。
    const questionSnapshot = snapshot[question.id] ?? { a: 0, b: 0 };
    const { aPercent, bPercent } = computeRatio(questionSnapshot, choice);
    const percent = choice === "a" ? aPercent : bPercent;
    const text = choice === "a" ? question.a.text : question.b.text;
    // 恰 50% 不算少數派(規格書 §2.4 定案文字)。
    return { id: question.id, index, choice, text, percent, isMinority: percent < 50 };
  });
}

/**
 * 身份標籤四檔(規格書 §2.4):依「少數派題數 / 總題數」佔比判定,題庫題數不定,
 * 用佔比不用絕對值。用 minorityCount/total 的原始分數比較(不對佔比先四捨五入),
 * 避免整數化後在邊界題數上跟規格的區間定義兜不起來。
 */
export function deriveIdentityLabel(minorityCount, total) {
  if (minorityCount === 0) return "大眾品味代言人";
  const ratio = minorityCount / total;
  if (ratio >= 0.5) return "逆流獨行俠";
  if (ratio >= 0.25) return "少數派冒險家";
  return "有主見的主流派";
}

/**
 * 「最孤獨的一題」/「你最大眾的一題」(規格書 §2.4):
 * - 有少數派題時:取其中所選邊比例最低者,同率取題序在前。
 * - 全站多數派(無少數派題,含全部恰 50% 的邊界情況)時:改取全部題目中比例最高者,
 *   同率一樣取題序在前,並標記 isFallback=true 供呼叫端切換文案,不留空白區塊。
 *
 * 註(2026-07-17,孤獨稱號選題新規則定案):`quizFlow.js` 已改用下方 `pickTitleQuestion`
 * 決定總結卡勳章要顯示哪一題,不再直接呼叫本函式——但本函式的 mainstream 分支被
 * `pickTitleQuestion` 在「全站多數派」情境直接委派呼叫(fallback 行為完全不變),
 * 少數派分支的邏輯也等價於 `pickTitleQuestion` 選題池全無計時資料時的 fallback 結果。
 * 本函式保留、獨立測試語意不變,理由見 開發設計方針.md > Phase 3.5 補充。
 * @returns {{id:string,index:number,choice:string,text:string,percent:number,isMinority:boolean,isFallback:boolean}}
 */
export function pickLoneliestQuestion(results) {
  const minorityResults = results.filter((r) => r.isMinority);
  const isFallback = minorityResults.length === 0;
  const pool = isFallback ? results : minorityResults;

  // pool 沿用 results 的題序(quiz.questions 原始順序),用嚴格不等式比較可以让
  // 先出現(題序在前)的候選在同率時保留,天然滿足「同率取題序在前」。
  let best = pool[0];
  for (const r of pool.slice(1)) {
    if (isFallback ? r.percent > best.percent : r.percent < best.percent) {
      best = r;
    }
  }
  return { ...best, isFallback };
}

/**
 * 孤獨稱號選題新規則(規格書 §2.4 擴充,2026-07-17 定案,取代單純比 percent 的舊制;
 * 決策背景與模擬數據見 開發設計方針.md > Phase 3.5 補充)。問題:種子分佈極端的題永遠
 * 是 percent 最低者,導致模擬結果集中在少數幾個稱號(前兩個稱號吃掉近半使用者)。
 * 新規則改為「選題池內比作答耗時」,把稱號分散到耗時最短(通常代表直覺反應)的那題。
 *
 * 規則(不足處一律 fallback,最終仍與 pickLoneliestQuestion 相容):
 * 1. 選題池:少數派題(percent<50)依 percent 升冪、同 % 依題序排序,取前 3 題
 *    (不足 3 題取全部)。
 * 2. 池內有計時資料(`times[questionId]` 有值)的題比時間,最短者得稱號;
 *    平手依序比 percent(低者優先)、題序(前者優先)。
 * 3. 池內全部沒有計時資料:fallback 用「現行規則」——pool 已依 percent 升冪排序,
 *    pool[0] 即 percent 最低者,等同 pickLoneliestQuestion 少數派分支的結果。
 * 4. 全站多數派(無少數派題):完全委派 pickLoneliestQuestion,mainstream fallback
 *    行為維持不變(規格明定)。
 *
 * @param {Array} results computeQuestionResults 的回傳值
 * @param {Record<string, number>} [times] 該題庫的 questionTimes map(questionId → 作答耗時
 *   毫秒),對應 progress.questionTimes;省略時視為空 map(等同全部走步驟 3 的 fallback)。
 * @returns {{id:string,index:number,choice:string,text:string,percent:number,isMinority:boolean,isFallback:boolean}}
 *   回傳形狀與 pickLoneliestQuestion 相容。
 */
export function pickTitleQuestion(results, times = {}) {
  const minorityResults = results.filter((r) => r.isMinority);
  if (minorityResults.length === 0) {
    return pickLoneliestQuestion(results); // 全多數派:mainstream fallback,完全不變。
  }

  const pool = [...minorityResults]
    .sort((a, b) => a.percent - b.percent || a.index - b.index)
    .slice(0, 3);

  const timed = pool.filter((r) => times[r.id] != null);
  if (timed.length === 0) {
    return { ...pool[0], isFallback: false }; // 池內全無計時:fallback 用 percent 最低者。
  }

  // timed 沿用 pool 的排序(percent 升冪、同率題序在前),用嚴格不等式比較讓先出現者
  // 在同率(含時間平手需再比 percent/題序)時保留,天然滿足「平手→percent 低者→題序
  // 前者」(與 pickLoneliestQuestion 同一套技巧)。
  let best = timed[0];
  for (const r of timed.slice(1)) {
    if (times[r.id] < times[best.id]) {
      best = r;
    }
  }
  return { ...best, isFallback: false };
}

/** 匹配度(規格書 §2.4):使用者所選那邊的全站比例平均,整數顯示。 */
export function computeMatchScore(results) {
  const sum = results.reduce((acc, r) => acc + r.percent, 0);
  return Math.round(sum / results.length);
}

/**
 * 分享文字(規格書 §2.4:「分享文字帶結果摘要」;§2.4 擴充:「分享文字帶稱號」,Phase 3.5;
 * 「分享文字加計時句」,孤獨稱號選題新規則,2026-07-17 定案)。
 *
 * `title` 為 `lookupLoneliestTitle` 的查表結果(可省略):
 * - 不傳 / 傳 `null`(題庫無 `titles` 欄位,或該 questionId 未收錄):維持 Phase 3 原格式,
 *   `identityLabel` 參數不使用——向下相容,Phase 3 既有呼叫端(僅傳前三個參數)行為不變。
 * - 有值:改用規格書 §2.4 擴充例句格式(「我是『少數派冒險家』,還拿到『糖度異端』
 *   稱號——只有 7% 和我一樣。換你選看看?」),需要呼叫端一併傳入 `identityLabel`
 *   (`deriveIdentityLabel` 的結果,本函式不重算)。
 *
 * `elapsedMs`(選配,尾端新增參數,舊呼叫不帶此參數行為不變):`loneliest` 那題本輪的
 * 作答耗時毫秒(對應 progress.questionTimes)。非 fallback 且 `elapsedMs` 有值且
 * < 10000(10 秒)時,在稱號句的百分比後面加「,這題我 N.N 秒就選了」(毫秒轉秒,
 * 一位小數);否則(≥10 秒、無計時資料、或 isFallback)維持原句不變——mainstream
 * fallback 分支的句子完全不受此參數影響。
 */
export function buildShareSummary(minorityCount, total, loneliest, identityLabel, title, elapsedMs) {
  if (!title) {
    const line = loneliest.isFallback
      ? `你最大眾的一題有 ${loneliest.percent}% 的人都和你一樣`
      : `最孤獨的一題只有 ${loneliest.percent}% 的人和你一樣`;
    return `我在 ${minorityCount}/${total} 題站少數派,${line}。換你選看看?`;
  }
  // isFallback(全多數派)時規格未給例句,沿用既有 fallback 措辭「都和我一樣」與非
  // fallback 分支「只有 X% 和我一樣」對稱,維持句型一致(決策點,見開發設計方針.md)。
  const percentLine = loneliest.isFallback
    ? `${loneliest.percent}% 的人都和我一樣`
    : `只有 ${loneliest.percent}% 和我一樣`;
  const timeSuffix =
    !loneliest.isFallback && elapsedMs != null && elapsedMs < 10000
      ? `,這題我 ${(elapsedMs / 1000).toFixed(1)} 秒就選了`
      : "";
  return `我是『${identityLabel}』,還拿到『${title.name}』稱號——${percentLine}${timeSuffix}。換你選看看?`;
}

/**
 * 孤獨稱號查表(規格書 §2.4 擴充,Phase 3.5)。稱號表為題庫內容,放題庫 JSON 選配欄位
 * `quiz.titles`:`{ <questionId>: {name, blurb}, mainstream: {name, blurb} }`。
 *
 * 查表 key:`loneliest.isFallback`(全站多數派)時用 `"mainstream"`,否則用
 * `loneliest.id`(即 `pickLoneliestQuestion` 回傳的 questionId)。
 *
 * 降級:題庫沒有 `titles` 欄位,或該 key 未收錄於表中,回傳 `null`——呼叫端據此判斷
 * 是否顯示勳章元件(demo 等舊題庫零改動,規格書 §2.4 擴充「降級」)。
 * @param {{titles?: Record<string, {name:string, blurb:string}>}} quiz
 * @param {{id:string, isFallback:boolean}} loneliest pickLoneliestQuestion 的回傳值
 * @returns {{name:string, blurb:string}|null}
 */
export function lookupLoneliestTitle(quiz, loneliest) {
  if (!quiz.titles) return null;
  const key = loneliest.isFallback ? "mainstream" : loneliest.id;
  return quiz.titles[key] ?? null;
}
