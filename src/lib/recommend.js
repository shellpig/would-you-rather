// 「你可能也想玩」導流卡選取(純函式,規格書 §2.4)。
// 決策:manifest 既有順序取前 N 個(排除當前題庫),不做隨機/加權——題庫數量少的
// 上線初期,固定順序比隨機更容易人工核對「導向該題庫首頁」是否正確,規格也沒有要求
// 隨機或依熱門度排序,保持最小實作。

/**
 * @param {Array<{id:string}>} allQuizzes manifest.quizzes
 * @param {string} currentQuizId
 * @param {number} [count]
 */
export function pickRecommendedQuizzes(allQuizzes, currentQuizId, count = 2) {
  return allQuizzes.filter((q) => q.id !== currentQuizId).slice(0, count);
}
