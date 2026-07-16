import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyQuizProgress,
  hasAnswered,
  recordAnswer,
  firstUnansweredQuestionId,
  isCompleted,
  markCompleted,
} from "../src/lib/progressStore.js";

test("recordAnswer: 首次作答會記錄且 isFirstAnswer=true", () => {
  const empty = createEmptyQuizProgress();
  const { progress, isFirstAnswer } = recordAnswer(empty, "q1", "a");
  assert.equal(isFirstAnswer, true);
  assert.equal(progress.answers.q1, "a");
});

test("recordAnswer: 已答過的題目重答不覆寫、isFirstAnswer=false(不重送 vote)", () => {
  const empty = createEmptyQuizProgress();
  const { progress: afterFirst } = recordAnswer(empty, "q1", "a");
  const { progress: afterReplay, isFirstAnswer } = recordAnswer(afterFirst, "q1", "b");
  assert.equal(isFirstAnswer, false);
  assert.equal(afterReplay.answers.q1, "a", "保留第一次真正送出統計的選擇");
});

test("firstUnansweredQuestionId: 斷點續玩,回傳第一個未答題", () => {
  const empty = createEmptyQuizProgress();
  const { progress } = recordAnswer(empty, "q1", "a");
  const nextId = firstUnansweredQuestionId(progress, ["q1", "q2", "q3"]);
  assert.equal(nextId, "q2");
});

test("firstUnansweredQuestionId: 全部答完回傳 null", () => {
  let progress = createEmptyQuizProgress();
  progress = recordAnswer(progress, "q1", "a").progress;
  progress = recordAnswer(progress, "q2", "b").progress;
  const nextId = firstUnansweredQuestionId(progress, ["q1", "q2"]);
  assert.equal(nextId, null);
});

test("markCompleted: 設定 completedAt,isCompleted 轉為 true", () => {
  const empty = createEmptyQuizProgress();
  assert.equal(isCompleted(empty), false);
  const completed = markCompleted(empty, 1000);
  assert.equal(isCompleted(completed), true);
  assert.equal(completed.completedAt, 1000);
});

test("markCompleted: 已完成過的不覆寫 completedAt(重玩不影響第一次完成時間)", () => {
  const empty = createEmptyQuizProgress();
  const first = markCompleted(empty, 1000);
  const second = markCompleted(first, 2000);
  assert.equal(second.completedAt, 1000);
});

test("hasAnswered: 正確判斷題目是否已作答", () => {
  const empty = createEmptyQuizProgress();
  assert.equal(hasAnswered(empty, "q1"), false);
  const { progress } = recordAnswer(empty, "q1", "a");
  assert.equal(hasAnswered(progress, "q1"), true);
});
