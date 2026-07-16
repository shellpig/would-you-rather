// POST /api/event — WAE 產品事件(規格書 §9 Phase 3;開發設計方針.md > Phase 3)。
// 四種事件:quiz_start / question_answered / quiz_completed / share_clicked。
// fire-and-forget、無 PII:呼叫端(src/lib/analytics.js)不 await、不重試,失敗吞掉、
// 不影響任何 UI 與答題流程(規格書 §9 Phase 3 驗收意圖)。這支 API 對稱地把「best-effort」
// 貫徹到底——即使 body 格式合法但寫入 Analytics Engine 失敗(binding 未設定、寫入出錯),
// 仍一律回 200,因為前端本來就不處理這支 API 的回應內容。
//
// env.ANALYTICS 為選用 binding(見 wrangler.toml):本機 `wrangler pages dev` 在 local 模式下
// 有模擬實作(已實測);未設定時(理論上不會發生於本機/正式環境,留作防呆)一律跳過寫入。

import { isLegalQuiz, isLegalQuestion } from "./_lib/legalList.js";

const ALLOWED_EVENTS = new Set([
  "quiz_start",
  "question_answered",
  "quiz_completed",
  "share_clicked",
]);

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const { event, quizId, questionId, choice } = body ?? {};

  if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
    return jsonResponse({ error: "unknown event" }, 400);
  }
  // quizId/questionId 為選用欄位(目前四個事件皆會帶 quizId,questionId 只有
  // question_answered 會帶),但格式錯誤或不在合法清單內時不視為硬錯誤——事件遺失
  // 不影響答題流程,寧可略過寫入也不要因為埋點格式問題擋掉前端。
  const quizIdValid = typeof quizId !== "string" || isLegalQuiz(quizId);
  const questionIdValid =
    typeof questionId !== "string" ||
    (typeof quizId === "string" && isLegalQuestion(quizId, questionId));

  if (quizIdValid && questionIdValid && typeof env.ANALYTICS?.writeDataPoint === "function") {
    try {
      env.ANALYTICS.writeDataPoint({
        blobs: [event, quizId ?? "", questionId ?? "", choice ?? ""],
        doubles: [1],
        indexes: [quizId ?? "unknown"],
      });
    } catch {
      // 寫入失敗不回報錯誤給前端,埋點遺失是可接受的(fire-and-forget)。
    }
  }

  return jsonResponse({ ok: true }, 200);
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
