import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeQuestionResults,
  deriveIdentityLabel,
  pickLoneliestQuestion,
  pickTitleQuestion,
  computeMatchScore,
  buildShareSummary,
  lookupLoneliestTitle,
} from "../src/lib/resultSummary.js";

// demo 題庫等價的 6 題 fixture(規格書 §2.4、測試指南 Phase 3 清單以 6 題驗收)。
function makeQuiz(n) {
  return {
    questions: Array.from({ length: n }, (_, i) => ({
      id: `q${i}`,
      a: { text: `選項A-${i}` },
      b: { text: `選項B-${i}` },
    })),
  };
}

test("computeQuestionResults: 口徑與 computeRatio(答題頁同一套)一致,percent 為使用者所選邊", () => {
  const quiz = makeQuiz(1);
  const answers = { q0: "a" };
  const snapshot = { q0: { a: 9, b: 10 } }; // a=9+1=10, total=20 → 50%
  const [result] = computeQuestionResults(quiz, answers, snapshot);
  assert.equal(result.percent, 50);
  assert.equal(result.text, "選項A-0");
  assert.equal(result.isMinority, false); // 恰 50% 不算少數派
});

test("computeQuestionResults: 快照缺該題 key 時防呆為 {a:0,b:0}", () => {
  const quiz = makeQuiz(1);
  const answers = { q0: "a" };
  const [result] = computeQuestionResults(quiz, answers, {});
  assert.equal(result.percent, 100); // 快照 0/0,自己一票 → a=1,total=1 → 100%
});

// ---- 重玩情境:總結卡用「本輪選擇」覆蓋 answers(2026-07-17 code review 修正) ----
// quizFlow.js 的 showComplete() 實際傳入 computeQuestionResults 的 answers 是
// `{ ...progress.answers, ...currentChoices }`,以下測試直接驗證這個 merge 後的物件
// 餵給 computeQuestionResults 會反映本輪選擇,而非固定顯示第一輪的舊 answers。

test("computeQuestionResults: 重玩時 currentChoices 覆蓋同一題的 answers,choice/text/percent/isMinority 反映本輪選擇", () => {
  const quiz = makeQuiz(1);
  const firstRoundAnswers = { q0: "a" }; // progress.answers:第一輪選 a
  const currentChoices = { q0: "b" }; // 本輪重玩改選 b
  const snapshot = { q0: { a: 9, b: 1 } }; // a=9,b=1+1=2,total=11 → b 約 18%(少數派)
  const merged = { ...firstRoundAnswers, ...currentChoices };

  const [result] = computeQuestionResults(quiz, merged, snapshot);
  assert.equal(result.choice, "b");
  assert.equal(result.text, "選項B-0");
  assert.equal(result.percent, Math.round((2 / 11) * 100));
  assert.equal(result.isMinority, true);
});

test("merge 語意:currentChoices 覆蓋同一 key,首玩情境(兩者相同)結果不受影響", () => {
  const answers = { q0: "a", q1: "b" };

  const replayMerged = { ...answers, ...{ q0: "b" } }; // 只有 q0 這題重玩改選
  assert.deepEqual(replayMerged, { q0: "b", q1: "b" });

  const firstPlayMerged = { ...answers, ...answers }; // 首玩:currentChoices 與 answers 同值
  assert.deepEqual(firstPlayMerged, answers);
});

test("deriveIdentityLabel: 四檔邊界(以 demo 6 題為例,規格書 §2.4 / 測試指南 #2)", () => {
  assert.equal(deriveIdentityLabel(0, 6), "大眾品味代言人");
  assert.equal(deriveIdentityLabel(1, 6), "有主見的主流派"); // 1/6 ≈ 16.7% (1–24%)
  assert.equal(deriveIdentityLabel(2, 6), "少數派冒險家"); // 2/6 ≈ 33.3% (25–49%)
  assert.equal(deriveIdentityLabel(3, 6), "逆流獨行俠"); // 3/6 = 50% (≥50%)
  assert.equal(deriveIdentityLabel(6, 6), "逆流獨行俠");
});

test("deriveIdentityLabel: 邊界剛好落在 25% / 50% 時歸入較高檔次", () => {
  assert.equal(deriveIdentityLabel(1, 4), "少數派冒險家"); // 25%
  assert.equal(deriveIdentityLabel(2, 4), "逆流獨行俠"); // 50%
});

test("pickLoneliestQuestion: 取少數派中所選邊比例最低者", () => {
  const results = [
    { id: "q0", index: 0, percent: 40, isMinority: true, text: "A" },
    { id: "q1", index: 1, percent: 20, isMinority: true, text: "B" },
    { id: "q2", index: 2, percent: 80, isMinority: false, text: "C" },
  ];
  const loneliest = pickLoneliestQuestion(results);
  assert.equal(loneliest.id, "q1");
  assert.equal(loneliest.isFallback, false);
});

test("pickLoneliestQuestion: 同率取題序在前", () => {
  const results = [
    { id: "q0", index: 0, percent: 20, isMinority: true, text: "A" },
    { id: "q1", index: 1, percent: 20, isMinority: true, text: "B" },
  ];
  const loneliest = pickLoneliestQuestion(results);
  assert.equal(loneliest.id, "q0");
});

test("pickLoneliestQuestion: 全站多數派時 fallback 取比例最高者,標記 isFallback", () => {
  const results = [
    { id: "q0", index: 0, percent: 60, isMinority: false, text: "A" },
    { id: "q1", index: 1, percent: 90, isMinority: false, text: "B" },
    { id: "q2", index: 2, percent: 90, isMinority: false, text: "C" },
  ];
  const loneliest = pickLoneliestQuestion(results);
  assert.equal(loneliest.isFallback, true);
  assert.equal(loneliest.id, "q1"); // 90% 同率,取題序在前
});

// ---- 孤獨稱號選題新規則:pickTitleQuestion(規格書 §2.4 擴充,2026-07-17 定案) ----

test("pickTitleQuestion: 選題池內比作答耗時,最短者得稱號(不一定是 percent 最低者)", () => {
  const results = [
    { id: "q0", index: 0, percent: 10, isMinority: true, text: "A" }, // percent 最低但耗時長
    { id: "q1", index: 1, percent: 40, isMinority: true, text: "B" }, // 耗時最短
    { id: "q2", index: 2, percent: 90, isMinority: false, text: "C" },
  ];
  const times = { q0: 5000, q1: 1200 };
  const picked = pickTitleQuestion(results, times);
  assert.equal(picked.id, "q1");
  assert.equal(picked.isFallback, false);
});

test("pickTitleQuestion: 時間平手時取 percent 低者", () => {
  const results = [
    { id: "q0", index: 0, percent: 30, isMinority: true, text: "A" },
    { id: "q1", index: 1, percent: 20, isMinority: true, text: "B" },
  ];
  const times = { q0: 2000, q1: 2000 };
  const picked = pickTitleQuestion(results, times);
  assert.equal(picked.id, "q1"); // 同時間,percent 較低者優先
});

test("pickTitleQuestion: 時間、percent 都平手時取題序在前者", () => {
  const results = [
    { id: "q0", index: 0, percent: 20, isMinority: true, text: "A" },
    { id: "q1", index: 1, percent: 20, isMinority: true, text: "B" },
  ];
  const times = { q0: 2000, q1: 2000 };
  const picked = pickTitleQuestion(results, times);
  assert.equal(picked.id, "q0");
});

test("pickTitleQuestion: 選題池全無計時資料時 fallback 取 percent 最低者", () => {
  const results = [
    { id: "q0", index: 0, percent: 40, isMinority: true, text: "A" },
    { id: "q1", index: 1, percent: 20, isMinority: true, text: "B" },
    { id: "q2", index: 2, percent: 90, isMinority: false, text: "C" },
  ];
  const picked = pickTitleQuestion(results, {});
  assert.equal(picked.id, "q1"); // percent 最低
  assert.equal(picked.isFallback, false);
});

test("pickTitleQuestion: 少數派題不足 3 題時,池取全部少數派題", () => {
  const results = [
    { id: "q0", index: 0, percent: 30, isMinority: true, text: "A" },
    { id: "q1", index: 1, percent: 90, isMinority: false, text: "B" },
  ];
  const times = { q0: 3000 };
  const picked = pickTitleQuestion(results, times);
  assert.equal(picked.id, "q0");
});

test("pickTitleQuestion: 選題池只取 percent 最低的前 3 題,第 4 題耗時再短也不會入選", () => {
  const results = [
    { id: "q0", index: 0, percent: 10, isMinority: true, text: "A" },
    { id: "q1", index: 1, percent: 20, isMinority: true, text: "B" },
    { id: "q2", index: 2, percent: 30, isMinority: true, text: "C" },
    { id: "q3", index: 3, percent: 40, isMinority: true, text: "D" }, // 第 4 低,不入池
  ];
  const times = { q0: 5000, q1: 4000, q2: 3000, q3: 100 }; // q3 耗時最短但不在池內
  const picked = pickTitleQuestion(results, times);
  assert.equal(picked.id, "q2"); // 池內(q0,q1,q2)耗時最短者
});

test("pickTitleQuestion: 全站多數派(無少數派題)時,與 pickLoneliestQuestion 結果相同,mainstream fallback 不變", () => {
  const results = [
    { id: "q0", index: 0, percent: 60, isMinority: false, text: "A" },
    { id: "q1", index: 1, percent: 90, isMinority: false, text: "B" },
  ];
  const viaTitleQuestion = pickTitleQuestion(results, { q0: 100, q1: 200 });
  const viaLoneliestQuestion = pickLoneliestQuestion(results);
  assert.deepEqual(viaTitleQuestion, viaLoneliestQuestion);
  assert.equal(viaTitleQuestion.isFallback, true);
});

test("computeMatchScore: 所選邊全站比例平均,整數顯示", () => {
  const results = [{ percent: 40 }, { percent: 41 }, { percent: 40 }];
  assert.equal(computeMatchScore(results), Math.round((40 + 41 + 40) / 3));
});

test("buildShareSummary: 少數派情境含 X/N 與最孤獨題百分比", () => {
  const text = buildShareSummary(1, 6, { percent: 7, isFallback: false });
  assert.match(text, /1\/6/);
  assert.match(text, /7%/);
  assert.match(text, /最孤獨的一題/);
});

test("buildShareSummary: 全站多數派情境改用「最大眾的一題」措辭", () => {
  const text = buildShareSummary(0, 6, { percent: 96, isFallback: true });
  assert.match(text, /0\/6/);
  assert.match(text, /96%/);
  assert.match(text, /最大眾的一題/);
});

// ---- Phase 3.5:孤獨稱號同框展示(規格書 §2.4 擴充,3 條驗收) ----

const titledQuiz = {
  titles: {
    "sugar-free-full-sugar": { name: "糖度異端", blurb: "手搖店店員記得你,因為只有你這樣點。" },
    mainstream: { name: "人間平均值", blurb: "15 題,題題與大家同行——你就是「大家」本人。" },
  },
};

test("驗收 1:lookupLoneliestTitle 與最孤獨的一題的 questionId 查表一致", () => {
  const loneliest = { id: "sugar-free-full-sugar", isFallback: false, percent: 7 };
  const title = lookupLoneliestTitle(titledQuiz, loneliest);
  assert.deepEqual(title, {
    name: "糖度異端",
    blurb: "手搖店店員記得你,因為只有你這樣點。",
  });
});

test("驗收 1:全多數派(isFallback)時查 mainstream 稱號", () => {
  const loneliest = { id: "sugar-free-full-sugar", isFallback: true, percent: 96 };
  const title = lookupLoneliestTitle(titledQuiz, loneliest);
  assert.deepEqual(title, {
    name: "人間平均值",
    blurb: "15 題,題題與大家同行——你就是「大家」本人。",
  });
});

test("驗收 2:題庫無 titles 欄位時 lookupLoneliestTitle 回傳 null(demo 等舊題庫降級,不報錯)", () => {
  const quizWithoutTitles = { questions: [] }; // 等價 demo.json:無 titles 欄位
  const loneliest = { id: "morning-drink", isFallback: false, percent: 40 };
  assert.equal(lookupLoneliestTitle(quizWithoutTitles, loneliest), null);
});

test("驗收 2:題庫有 titles 但該 questionId 未收錄時同樣回傳 null,不拋錯", () => {
  const loneliest = { id: "not-in-table", isFallback: false, percent: 40 };
  assert.equal(lookupLoneliestTitle(titledQuiz, loneliest), null);
});

test("驗收 3:buildShareSummary 有稱號時分享文字含身份標籤與稱號名,與畫面顯示一致", () => {
  const loneliest = { percent: 7, isFallback: false };
  const title = { name: "糖度異端", blurb: "……" };
  const text = buildShareSummary(1, 15, loneliest, "少數派冒險家", title);
  assert.match(text, /少數派冒險家/);
  assert.match(text, /糖度異端/);
  assert.match(text, /7%/);
});

test("驗收 3:buildShareSummary 全多數派 + 有稱號時同樣含身份標籤與 mainstream 稱號名", () => {
  const loneliest = { percent: 96, isFallback: true };
  const title = { name: "人間平均值", blurb: "……" };
  const text = buildShareSummary(0, 15, loneliest, "大眾品味代言人", title);
  assert.match(text, /大眾品味代言人/);
  assert.match(text, /人間平均值/);
  assert.match(text, /96%/);
});

test("驗收 3:buildShareSummary 無稱號(title 為 null/未傳)時維持 Phase 3 原格式,不含稱號措辭", () => {
  const loneliest = { percent: 7, isFallback: false };
  const textWithoutTitleArg = buildShareSummary(1, 6, loneliest);
  const textWithNullTitle = buildShareSummary(1, 6, loneliest, "少數派冒險家", null);
  for (const text of [textWithoutTitleArg, textWithNullTitle]) {
    assert.match(text, /我在 1\/6 題站少數派/);
    assert.match(text, /最孤獨的一題只有 7% 的人和你一樣/);
    assert.doesNotMatch(text, /還拿到/);
  }
});

// ---- 分享文字計時句(孤獨稱號選題新規則,規格書 §2.4 擴充,2026-07-17 定案) ----

test("buildShareSummary: 有稱號 + 耗時 <10 秒時加計時句,毫秒轉秒取一位小數", () => {
  const loneliest = { percent: 24, isFallback: false };
  const title = { name: "時差星人", blurb: "……" };
  const text = buildShareSummary(3, 6, loneliest, "逆流獨行俠", title, 1800);
  assert.equal(
    text,
    "我是『逆流獨行俠』,還拿到『時差星人』稱號——只有 24% 和我一樣,這題我 1.8 秒就選了。換你選看看?"
  );
});

test("buildShareSummary: 耗時 ≥10 秒時不加計時句,維持原句", () => {
  const loneliest = { percent: 24, isFallback: false };
  const title = { name: "時差星人", blurb: "……" };
  const text = buildShareSummary(3, 6, loneliest, "逆流獨行俠", title, 10000);
  assert.doesNotMatch(text, /這題我/);
  assert.equal(text, "我是『逆流獨行俠』,還拿到『時差星人』稱號——只有 24% 和我一樣。換你選看看?");
});

test("buildShareSummary: 無計時資料(elapsedMs 未傳 / null)時不加計時句", () => {
  const loneliest = { percent: 24, isFallback: false };
  const title = { name: "時差星人", blurb: "……" };
  const withoutArg = buildShareSummary(3, 6, loneliest, "逆流獨行俠", title);
  const withNull = buildShareSummary(3, 6, loneliest, "逆流獨行俠", title, null);
  for (const text of [withoutArg, withNull]) {
    assert.doesNotMatch(text, /這題我/);
  }
});

test("buildShareSummary: isFallback(全多數派)時即使傳了耗時也不加計時句", () => {
  const loneliest = { percent: 96, isFallback: true };
  const title = { name: "人間平均值", blurb: "……" };
  const text = buildShareSummary(0, 15, loneliest, "大眾品味代言人", title, 500);
  assert.doesNotMatch(text, /這題我/);
});

test("buildShareSummary: 毫秒轉秒一位小數(邊界值 9999ms → 10.0 秒,仍 <10000 門檻內加句)", () => {
  const loneliest = { percent: 24, isFallback: false };
  const title = { name: "時差星人", blurb: "……" };
  const text = buildShareSummary(3, 6, loneliest, "逆流獨行俠", title, 9999);
  assert.match(text, /這題我 10\.0 秒就選了/);
});
