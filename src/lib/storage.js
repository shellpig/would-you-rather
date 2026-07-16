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
  return all[quizId] ?? createEmptyQuizProgress();
}

export function saveQuizProgress(quizId, quizProgress) {
  const all = loadAll();
  all[quizId] = quizProgress;
  saveAll(all);
}
