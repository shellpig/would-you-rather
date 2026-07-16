// 總結卡資料推導(純函式,規格書 §2.4;開發設計方針.md > Phase 3)。
// 輸入為題庫定義、作答記錄(progress.answers)與開始作答時抓的統計快照——與答題頁
// 用的是同一份快照與同一個 computeRatio,確保「主標區所有比例與答題頁口徑一致」
// (規格書 §2.4 驗收)。
//
// 決策(答題記錄取哪一份):採用 progress.answers(規格書 §6「第一次真正送出統計的
// 選擇」),不是本輪 UI 暫存的 currentChoices。理由:answers 是唯一被計入後端 stats 的
// 選擇,總結卡呈現的「你是多數派/少數派」「匹配度」都必須對應到真正被計票的那一票;
// 重玩時就算使用者這輪選了不同答案,總結卡仍顯示原始計票結果,與「你上次選的是這個」
// 提示、recordAnswer 的「已答不重送」設計精神一致。

import { computeRatio } from "./ratio.js";

/**
 * @param {{questions: Array<{id:string, a:{text:string}, b:{text:string}}>}} quiz
 * @param {Record<string, "a"|"b">} answers progress.answers
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

/** 匹配度(規格書 §2.4):使用者所選那邊的全站比例平均,整數顯示。 */
export function computeMatchScore(results) {
  const sum = results.reduce((acc, r) => acc + r.percent, 0);
  return Math.round(sum / results.length);
}

/**
 * 分享文字(規格書 §2.4:「分享文字帶結果摘要」;§2.4 擴充:「分享文字帶稱號」,Phase 3.5)。
 *
 * `title` 為 `lookupLoneliestTitle` 的查表結果(可省略):
 * - 不傳 / 傳 `null`(題庫無 `titles` 欄位,或該 questionId 未收錄):維持 Phase 3 原格式,
 *   `identityLabel` 參數不使用——向下相容,Phase 3 既有呼叫端(僅傳前三個參數)行為不變。
 * - 有值:改用規格書 §2.4 擴充例句格式(「我是『少數派冒險家』,還拿到『糖度異端』
 *   稱號——只有 7% 和我一樣。換你選看看?」),需要呼叫端一併傳入 `identityLabel`
 *   (`deriveIdentityLabel` 的結果,本函式不重算)。
 */
export function buildShareSummary(minorityCount, total, loneliest, identityLabel, title) {
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
  return `我是『${identityLabel}』,還拿到『${title.name}』稱號——${percentLine}。換你選看看?`;
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
