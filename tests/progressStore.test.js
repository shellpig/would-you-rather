import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyQuizProgress,
  hasAnswered,
  recordAnswer,
  firstUnansweredQuestionId,
  isCompleted,
  markCompleted,
  ensureSessionId,
  queuePendingVote,
  clearPendingVote,
  prunePendingVotes,
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

// ---- Phase 2.6:可靠送票(sessionId / pendingVotes) ----

test("ensureSessionId: 沒有 sessionId 時產生一個", () => {
  const empty = createEmptyQuizProgress();
  const progress = ensureSessionId(empty, () => "generated-id");
  assert.equal(progress.sessionId, "generated-id");
});

test("ensureSessionId: 已有 sessionId 時不重新產生(同題庫共用同一個)", () => {
  const withId = { ...createEmptyQuizProgress(), sessionId: "existing-id" };
  const progress = ensureSessionId(withId, () => "new-id");
  assert.equal(progress.sessionId, "existing-id");
});

test("queuePendingVote: 寫入 { questionId: { choice, queuedAt } }", () => {
  const empty = createEmptyQuizProgress();
  const progress = queuePendingVote(empty, "q1", "a", 1000);
  assert.deepEqual(progress.pendingVotes.q1, { choice: "a", queuedAt: 1000 });
});

test("clearPendingVote: 移除指定題目的 pending,其餘不受影響", () => {
  let progress = createEmptyQuizProgress();
  progress = queuePendingVote(progress, "q1", "a", 1000);
  progress = queuePendingVote(progress, "q2", "b", 2000);
  progress = clearPendingVote(progress, "q1");
  assert.equal(Object.prototype.hasOwnProperty.call(progress.pendingVotes, "q1"), false);
  assert.deepEqual(progress.pendingVotes.q2, { choice: "b", queuedAt: 2000 });
});

test("clearPendingVote: 沒有該筆 pending 時原樣回傳", () => {
  const empty = createEmptyQuizProgress();
  const progress = clearPendingVote(empty, "not-pending");
  assert.equal(progress, empty);
});

test("prunePendingVotes: 丟棄超過 7 天的 pending 票,未過期的保留", () => {
  const now = 10 * 24 * 60 * 60 * 1000; // 第 10 天
  let progress = createEmptyQuizProgress();
  progress = queuePendingVote(progress, "old", "a", 0); // 第 0 天,已過 7 天
  progress = queuePendingVote(progress, "fresh", "b", now - 1000); // 剛剛才排入

  const pruned = prunePendingVotes(progress, now);
  assert.equal(Object.prototype.hasOwnProperty.call(pruned.pendingVotes, "old"), false);
  assert.deepEqual(pruned.pendingVotes.fresh, { choice: "b", queuedAt: now - 1000 });
});

test("prunePendingVotes: 沒有過期項目時原樣回傳(呼叫端可用 === 判斷免寫回)", () => {
  const now = 1000;
  let progress = createEmptyQuizProgress();
  progress = queuePendingVote(progress, "fresh", "a", now);
  const pruned = prunePendingVotes(progress, now);
  assert.equal(pruned, progress);
});
