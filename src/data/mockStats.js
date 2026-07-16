// Phase 1 mock 統計資料。取代規格書 §5 的 GET /api/stats/:quizId 與「N 人玩過」來源。
// Phase 2 會換成真實 API;呼叫端(見 src/lib/statsClient.js)已用 async 介面包裝,
// 屆時只需替換本檔案內容為 fetch,呼叫端程式碼不必變動。
//
// 「N 人玩過」欄位規格書 §4 的 JSON 契約未定義來源(僅定義題庫/題目結構與 stats 表),
// Phase 1 暫以此檔案的 playedCounts 為 mock 來源;Phase 2 設計後端時需另外決定實際算法
// (例如取自第一題總票數,或另建計數器),已記錄於 開發設計方針.md 待確認事項。

/** 各題庫「N 人玩過 / 已有 N 人作答」mock 值。
 *  demo 預設為高於門檻(PLAYED_COUNT_THRESHOLD=100)以便展示「顯示」情境;
 *  若要手動驗證「低於門檻不顯示」,將此值暫改為 <100 的數字重新整理頁面即可
 *  (純函式 shouldShowPlayedCount 的兩個分支另有自動化測試涵蓋,見 tests/threshold.test.js)。 */
export const playedCounts = {
  demo: 128,
};

/** 各題庫、各題的種子票快照(模擬規格書 §5.3 的種子票,每邊 20–50 票隨機分佈)。
 *  「開始作答」時一次性抓取整包(見 src/lib/statsClient.js fetchStats),
 *  之後比例計算全在前端(規格書 §2.2、§3)。 */
export const voteSnapshots = {
  demo: {
    "morning-drink": { a: 34, b: 28 },
    "work-break": { a: 22, b: 41 },
    "rainy-day": { a: 45, b: 20 },
    "dessert-pair": { a: 30, b: 30 },
    "gift-choice": { a: 26, b: 37 },
    "cafe-style": { a: 48, b: 23 },
  },
};
