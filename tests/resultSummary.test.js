import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeQuestionResults,
  deriveIdentityLabel,
  pickLoneliestQuestion,
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
