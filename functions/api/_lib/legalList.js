// 合法清單存取與驗證。清單本身由 scripts/generate-legal-list.mjs 從
// src/data/manifest.json + src/data/quizzes/*.json 產生(見該檔頭註解與
// 開發設計方針.md > Phase 2 > 合法清單)。此處純 import 靜態 JSON,由 wrangler 在
// bundle 時一併打包進 Worker,執行期零額外 I/O。
//
// 目錄名稱以底線開頭(_lib):Cloudflare Pages Functions 路由慣例會忽略底線開頭的
// 目錄與檔案,不會把本檔誤判成一支 API route。

import legalList from "../../../src/data/legalList.generated.json";

export function isLegalQuiz(quizId) {
  return Object.prototype.hasOwnProperty.call(legalList, quizId);
}

export function isLegalQuestion(quizId, questionId) {
  const quiz = legalList[quizId];
  return !!quiz && quiz.questionIds.includes(questionId);
}

export function getQuestionIds(quizId) {
  return legalList[quizId]?.questionIds ?? [];
}

export function getFirstQuestionId(quizId) {
  return legalList[quizId]?.firstQuestionId;
}

export function getAllQuizIds() {
  return Object.keys(legalList);
}
