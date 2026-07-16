// 單一題庫的作答進度邏輯(純函式,不碰 localStorage)。
// 資料結構照規格書 §6:{ answers: { questionId: "a"|"b" }, completedAt: number|null }
// 由 src/lib/storage.js 負責讀寫 localStorage、呼叫這裡的純函式做狀態轉換。

export function createEmptyQuizProgress() {
  return { answers: {}, completedAt: null };
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
