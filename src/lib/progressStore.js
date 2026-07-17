// 單一題庫的作答進度邏輯(純函式,不碰 localStorage)。
// 資料結構照規格書 §6(Phase 2.6 擴充 sessionId / pendingVotes;孤獨稱號選題新規則
// 2026-07-17 擴充 questionTimes):
// { answers: { questionId: "a"|"b" }, sessionId: string|null,
//   pendingVotes: { questionId: { choice, queuedAt } }, completedAt: number|null,
//   questionTimes: { questionId: ms } }
// 由 src/lib/storage.js 負責讀寫 localStorage、呼叫這裡的純函式做狀態轉換。

export function createEmptyQuizProgress() {
  return { answers: {}, sessionId: null, pendingVotes: {}, completedAt: null, questionTimes: {} };
}

export function hasAnswered(quizProgress, questionId) {
  return Object.prototype.hasOwnProperty.call(quizProgress.answers, questionId);
}

/**
 * 記錄一題的作答。
 * 決策(見 開發設計方針.md > Phase 1):若該題已有紀錄(重玩情境),
 * 不覆寫原本的選擇——answers 保存的是「第一次真正送出統計的選擇」,
 * 用於重玩時顯示「你上次選的是這個」與防止重送投票;
 * 這一輪重玩使用者可以選不同答案,但不影響已存的紀錄。
 * @returns {{progress: object, isFirstAnswer: boolean}} isFirstAnswer=true 時呼叫端才需送出 vote。
 */
export function recordAnswer(quizProgress, questionId, choice) {
  if (hasAnswered(quizProgress, questionId)) {
    return { progress: quizProgress, isFirstAnswer: false };
  }
  const next = {
    ...quizProgress,
    answers: { ...quizProgress.answers, [questionId]: choice },
  };
  return { progress: next, isFirstAnswer: true };
}

/** 找出第一個尚未作答的題目 id;全部答完回傳 null(斷點續玩用,規格書 §6)。 */
export function firstUnansweredQuestionId(quizProgress, questionIds) {
  for (const id of questionIds) {
    if (!hasAnswered(quizProgress, id)) return id;
  }
  return null;
}

export function isCompleted(quizProgress) {
  return quizProgress.completedAt !== null;
}

/** 標記完成;若已完成過(重玩),保留第一次完成的時間不覆寫。 */
export function markCompleted(quizProgress, timestamp) {
  if (isCompleted(quizProgress)) return quizProgress;
  return { ...quizProgress, completedAt: timestamp };
}

// ---- Phase 2.6:可靠送票(pendingVotes / sessionId) ----

/** 確保 progress 有 sessionId(規格書 §5.2);已有則原樣回傳,同一題庫的作答與補送
 *  全程共用同一個 sessionId。id 產生方式由呼叫端注入(見 src/lib/sessionId.js),
 *  這裡保持純函式、不直接依賴 crypto。 */
export function ensureSessionId(quizProgress, generateId) {
  if (quizProgress.sessionId) return quizProgress;
  return { ...quizProgress, sessionId: generateId() };
}

/** 把一票放進 pendingVotes(規格書 §6:{ questionId: { choice, queuedAt } })。 */
export function queuePendingVote(quizProgress, questionId, choice, queuedAt) {
  return {
    ...quizProgress,
    pendingVotes: { ...quizProgress.pendingVotes, [questionId]: { choice, queuedAt } },
  };
}

/** 移除一筆已送達成功(或已判定丟棄)的 pending 票;沒有該筆時原樣回傳。 */
export function clearPendingVote(quizProgress, questionId) {
  if (!Object.prototype.hasOwnProperty.call(quizProgress.pendingVotes, questionId)) {
    return quizProgress;
  }
  const rest = { ...quizProgress.pendingVotes };
  delete rest[questionId];
  return { ...quizProgress, pendingVotes: rest };
}

const PENDING_VOTE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** 丟棄超過 7 天的 pending 票(規格書 §5.2 補送規則);沒有需丟棄的項目時原樣回傳
 *  (呼叫端可用 `=== ` 判斷是否需要重新寫回 localStorage)。 */
export function prunePendingVotes(quizProgress, now) {
  const entries = Object.entries(quizProgress.pendingVotes);
  const kept = {};
  let droppedAny = false;
  for (const [questionId, entry] of entries) {
    if (now - entry.queuedAt > PENDING_VOTE_MAX_AGE_MS) {
      droppedAny = true;
      continue;
    }
    kept[questionId] = entry;
  }
  if (!droppedAny) return quizProgress;
  return { ...quizProgress, pendingVotes: kept };
}

// ---- 孤獨稱號選題新規則(questionTimes),規格書 §2.4 擴充,2026-07-17 定案 ----

/**
 * 記錄一題「進入題目頁面 → 按下下一題」的作答耗時(毫秒)。呼叫端(quizFlow.js)只在
 * 該題本輪實際點選過選項時才呼叫本函式,避免中斷續玩 / 重玩時已答但沒重新點選的題被
 * 記成假的短時間;無條件覆寫舊值,滿足「重新點選則覆寫、沒重新點選則保留上一輪時間」。
 */
export function recordQuestionTime(quizProgress, questionId, ms) {
  return {
    ...quizProgress,
    questionTimes: { ...quizProgress.questionTimes, [questionId]: ms },
  };
}
