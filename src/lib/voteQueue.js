// 可靠送票佇列(規格書 §5.2、§6;開發設計方針.md > Phase 2.6)。
//
// 流程:quizFlow.js 在按下「下一題」時,先把票寫進 localStorage 的 pendingVotes
// (與 answers、sessionId 一起原子寫入),再呼叫本檔的 sendVote 背景送出、不 await、
// 不阻塞切題;只有掛上的 .then() 收到成功回應才清除該筆 pending。
//
// 補送(flushPendingVotes)在 app 啟動與 browser online 事件時掃描所有題庫的
// pendingVotes:超過 7 天的票直接丟棄、不發請求;同一題同時最多一個 in-flight
// request(inFlight 集合防止同一題重疊發送)。

import { getAllQuizProgress, getQuizProgress, saveQuizProgress } from "./storage.js";
import { clearPendingVote, prunePendingVotes } from "./progressStore.js";
import { submitVote } from "./voteStub.js";

/** 目前正在送出中的 (quizId, questionId),防止同一題同時發出第二個請求(規格書 §5.2)。 */
const inFlight = new Set();

function inFlightKey(quizId, questionId) {
  return `${quizId}::${questionId}`;
}

/** 背景送出一票;不 await、不阻塞呼叫端(答題/切題全程零等待)。
 *  成功(2xx)才清除 pending;失敗(斷網、4xx/5xx)留在 pending,交給下次補送時機重試。 */
export function sendVote(quizId, questionId, choice, sessionId) {
  const key = inFlightKey(quizId, questionId);
  if (inFlight.has(key)) return; // 同題同時最多一個 in-flight。
  inFlight.add(key);

  submitVote(quizId, questionId, choice, sessionId)
    .then((res) => {
      if (!res.ok) return; // 未成功一律視為未送達,pending 保留。
      const progress = getQuizProgress(quizId);
      saveQuizProgress(quizId, clearPendingVote(progress, questionId));
    })
    .catch(() => {
      // 斷網等狀況:不影響前端流程(規格書 §5 驗收),pending 保留待補送。
    })
    .finally(() => {
      inFlight.delete(key);
    });
}

/** 開站 / 恢復連線(`online` 事件)時補送所有題庫的 pendingVotes(規格書 §6 驗收)。
 *  超過 7 天的票直接丟棄、不發請求,丟棄結果立即寫回 localStorage。 */
export function flushPendingVotes(now = Date.now()) {
  const allProgress = getAllQuizProgress();
  for (const [quizId, progress] of Object.entries(allProgress)) {
    if (!progress.sessionId || Object.keys(progress.pendingVotes).length === 0) continue;

    const pruned = prunePendingVotes(progress, now);
    if (pruned !== progress) {
      saveQuizProgress(quizId, pruned);
    }
    for (const [questionId, entry] of Object.entries(pruned.pendingVotes)) {
      sendVote(quizId, questionId, entry.choice, pruned.sessionId);
    }
  }
}
