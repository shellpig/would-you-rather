// 「題庫不存在」專用錯誤(2026-07-19)。quizFlow 以 instanceof 區分「題庫不存在」
// (顯示找不到題庫提示)與其他錯誤(維持既有行為,不吞掉);它和 stats 載入失敗
// (showStatsError 可重試畫面)是兩條獨立錯誤路徑。獨立成純模組讓 node:test 可
// 直接 import 守護(quizData.js 用了 import.meta.glob,無法在 node 下載入;
// 抽出動機同 src/routes.js)。
export class QuizNotFoundError extends Error {
  constructor(quizId) {
    super(`quiz not found: ${quizId}`);
    this.name = "QuizNotFoundError";
  }
}
