// 題庫靜態 JSON 存取(規格書 §4)。Phase 1 直接 import 本地檔案;
// 未來若改為 fetch(`/quizzes/${id}.json`) 對呼叫端介面不變(皆為 async)。

import manifest from "../data/manifest.json";

const quizModules = import.meta.glob("../data/quizzes/*.json", { eager: true });

function quizById(id) {
  const entry = Object.entries(quizModules).find(([path]) => path.endsWith(`/${id}.json`));
  return entry ? entry[1].default ?? entry[1] : undefined;
}

export async function fetchManifest() {
  return manifest;
}

export async function fetchQuiz(quizId) {
  const quiz = quizById(quizId);
  if (!quiz) throw new Error(`quiz not found: ${quizId}`);
  return quiz;
}
