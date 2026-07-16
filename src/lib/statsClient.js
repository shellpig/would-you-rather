// 統計資料存取介面。Phase 1 用本地 mock 模組實作,呼叫端一律用 await 呼叫,
// Phase 2 只需把函式本體換成 fetch("/api/stats/:quizId") 等真實 API,呼叫端不必改。

import { voteSnapshots, playedCounts } from "../data/mockStats.js";

/** 對應規格書 §5.2 GET /api/stats/:quizId:回傳該題庫所有題目的 {questionId: {a,b}}。
 *  「開始作答」時呼叫一次,之後整個答題流程不再呼叫(規格書 §2.2 驗收)。 */
export async function fetchStats(quizId) {
  return voteSnapshots[quizId] ?? {};
}

/** 「N 人玩過 / 已有 N 人作答」mock 來源(見 src/data/mockStats.js 頂部註解)。 */
export async function fetchPlayedCount(quizId) {
  return playedCounts[quizId] ?? 0;
}
