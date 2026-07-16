// 送票的底層 fetch 呼叫(規格書 §5.2)。Phase 2.6 起呼叫端改為 src/lib/voteQueue.js,
// 由它決定「成功才清 pending、失敗留待補送」——這裡只負責發送並把 Promise 交回去,
// 不吞錯誤、不自己重試。檔名維持 voteStub.js 不改(沿用 Phase 2 決策:呼叫端不動,
// 重新命名檔案的效益不足以抵銷改動面)。
// keepalive:true 確保按下「下一題」瞬間切頁/送出時,請求仍會在背景送出而不被頁面卸載中斷。

export function submitVote(quizId, questionId, choice, sessionId) {
  return fetch("/api/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quizId, questionId, choice, sessionId }),
    keepalive: true,
  });
}
