// localStorage 讀寫轉接層(impure)。純邏輯在 progressStore.js,這裡只負責序列化與存取。
// 規格書 §6:資料結構為 { [quizId]: { answers: {...}, completedAt } }。

import { createEmptyQuizProgress } from "./progressStore.js";

const STORAGE_KEY = "wyr:progress";

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    // 無痕模式 / 損毀資料等狀況一律視為空,規格書 §6「已知限制」接受此降級。
    return {};
  }
}

function saveAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // 寫入失敗(容量滿、隱私模式限制等)不阻塞答題流程。
  }
}

export function getQuizProgress(quizId) {
  const all = loadAll();
  const stored = all[quizId];
  if (!stored) return createEmptyQuizProgress();
  // 相容 Phase 2.6 之前存的舊資料(缺 sessionId / pendingVotes 欄位):補上預設值,
  // 已有的 answers / completedAt 不受影響。
  return { ...createEmptyQuizProgress(), ...stored };
}

export function saveQuizProgress(quizId, quizProgress) {
  const all = loadAll();
  all[quizId] = quizProgress;
  saveAll(all);
}

/** 所有題庫的 progress(Phase 2.6 補送掃描全題庫用,見 src/lib/voteQueue.js)。
 *  key 為 quizId,值皆已補上預設欄位(同 getQuizProgress)。 */
export function getAllQuizProgress() {
  const all = loadAll();
  const normalized = {};
  for (const quizId of Object.keys(all)) {
    normalized[quizId] = getQuizProgress(quizId);
  }
  return normalized;
}
