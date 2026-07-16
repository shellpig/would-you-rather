// 統計資料存取介面。Phase 1 用本地 mock 模組實作,Phase 2 換成真實 API,
// 呼叫端(home.js、quizFlow.js)一律用 await 呼叫,介面不變、呼叫端不需改動。

/** 對應規格書 §5.2 GET /api/stats/:quizId:回傳該題庫所有題目的 {questionId: {a,b}}。
 *  「開始作答」時呼叫一次,之後整個答題流程不再呼叫(規格書 §2.2 驗收)。 */
export async function fetchStats(quizId) {
  const res = await fetch(`/api/stats/${encodeURIComponent(quizId)}`);
  if (!res.ok) return {};
  return res.json();
}

/** 「N 人玩過 / 已有 N 人作答」資料來源(Phase 2 決策,見 開發設計方針.md > Phase 2 >
 *  「N 人玩過」資料來源決策):取自 GET /api/played-counts,一次回傳所有題庫的值
 *  (該題庫第一題 a_count+b_count)。home.js 對 manifest 內每個題庫各呼叫一次
 *  fetchPlayedCount,此處用模組層級的快取 Promise 把它們合併成同一次網路請求,
 *  維持「API 面積最小」而不必更動呼叫端。 */
let playedCountsPromise = null;

async function loadPlayedCounts() {
  if (!playedCountsPromise) {
    playedCountsPromise = fetch("/api/played-counts")
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return playedCountsPromise;
}

export async function fetchPlayedCount(quizId) {
  const counts = await loadPlayedCounts();
  return counts[quizId] ?? 0;
}
