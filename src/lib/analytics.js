// WAE 產品事件送出(規格書 §9 Phase 3;開發設計方針.md > Phase 3)。
// fire-and-forget:不 await、失敗吞掉、絕不拋出——呼叫端(quizFlow.js)不需要 try/catch
// 包住每一次呼叫,任何失敗都不得影響 UI 或答題流程。無 PII:只送事件名稱 + quizId /
// questionId / choice 這些題庫本身就公開的資料,不含使用者身份。

const EVENT_ENDPOINT = "/api/event";

/**
 * @param {"quiz_start"|"question_answered"|"quiz_completed"|"share_clicked"} event
 * @param {{quizId?: string, questionId?: string, choice?: "a"|"b"}} [payload]
 */
export function trackEvent(event, payload = {}) {
  try {
    fetch(EVENT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, ...payload }),
      keepalive: true,
    }).catch(() => {
      // 網路錯誤 / 非 2xx:埋點遺失可接受,不重試、不影響流程。
    });
  } catch {
    // fetch 本身同步拋錯的極端情況(理論上不會發生於瀏覽器環境),同樣不可外洩。
  }
}
