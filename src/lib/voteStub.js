// 送票:規格書 §5.2 POST /api/vote,fire-and-forget——不等回應、失敗不重試、
// 不阻塞 UI(呼叫端 quizFlow.js 也不 await 這個函式)。keepalive:true 確保按下
// 「下一題」瞬間切頁時,請求仍會在背景送出而不被頁面卸載中斷。

export function submitVote(quizId, questionId, choice) {
  fetch("/api/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quizId, questionId, choice }),
    keepalive: true,
  }).catch(() => {
    // 失敗（斷網、被拒等）不影響前端流程，規格書 §5 驗收。
  });
}
