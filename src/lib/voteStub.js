// Phase 1 送票 stub。規格書 §5.2 的 POST /api/vote 在此 phase 不發任何網路請求,
// 只 console.log,方便驗收「按下一題才送票、改選不送票、已答題不重送」等規則(§3、§6)。
// Phase 2 會把這裡換成 fetch(..., { keepalive: true }) fire-and-forget。

export function submitVote(quizId, questionId, choice) {
  console.log(`[mock-vote] quiz=${quizId} question=${questionId} choice=${choice}`);
}
