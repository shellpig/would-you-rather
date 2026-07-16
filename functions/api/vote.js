// POST /api/vote — 規格書 §5.2、Phase 2.6(可靠送票)。
// body: { quizId, questionId, choice: "a"|"b", sessionId }。非法輸入一律拒絕(4xx),
// 不寫入 D1,避免垃圾 rows(§5 驗收)。
//
// sessionId 由前端隨機產生(見 src/lib/sessionId.js),現階段後端只驗證格式、不驗證身份——
// 這是規格書 §5.4(暫緩預案)的插座,日後啟動 Turnstile 時只需在發 session 處加驗證閘,
// 這裡的格式檢查與冪等邏輯不需更動。
//
// 收據插入與計數遞增在同一個 D1 batch(單一交易)內完成,避免「收據寫了、計數沒加」
// 或反過來的半套結果:
//   1. INSERT ... ON CONFLICT(session_id, question_id) DO NOTHING 寫入收據——新收據
//      這一步的 SQLite changes() 之後會是 1,重複送達(收據已存在)則是 0。
//   2. 用同一個 changes() 當乘數決定 stats 要不要真的 +1。D1 batch 內的多個 statement
//      在同一個連線循序執行於同一個交易,changes() 的值會延續到下一個 statement,
//      不需要「先查有沒有 → 再寫」的 non-atomic read-modify-write,並發送達時
//      唯一鍵本身就會擋掉多餘的收據與多餘的計數(見 tests/api.test.js Phase 2.6 測試)。
// 重複送達(同 session 同題,無論 choice 是否相同)一律回成功,但不加票、不改寫既有 choice。

import { isLegalQuiz, isLegalQuestion } from "./_lib/legalList.js";

// 前端一律用 crypto.randomUUID()(或等價 fallback)產生 UUID v4 格式字串,
// 見 src/lib/sessionId.js;這裡只檢查格式合法,不做任何身份驗證。
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const { quizId, questionId, choice, sessionId } = body ?? {};

  if (
    typeof quizId !== "string" ||
    typeof questionId !== "string" ||
    (choice !== "a" && choice !== "b") ||
    typeof sessionId !== "string" ||
    !SESSION_ID_PATTERN.test(sessionId)
  ) {
    return jsonResponse({ error: "invalid vote payload" }, 400);
  }
  if (!isLegalQuiz(quizId) || !isLegalQuestion(quizId, questionId)) {
    return jsonResponse({ error: "unknown quizId or questionId" }, 400);
  }

  const aDelta = choice === "a" ? 1 : 0;
  const bDelta = choice === "a" ? 0 : 1;

  const insertReceipt = env.DB.prepare(
    `INSERT INTO vote_receipts (session_id, quiz_id, question_id, choice, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (session_id, question_id) DO NOTHING`
  ).bind(sessionId, quizId, questionId, choice, Date.now());

  // changes() 讀到上一個 statement(收據 INSERT)影響的 row 數:新收據為 1、
  // 重複送達(唯一鍵衝突、DO NOTHING)為 0,藉此把「是否真的加票」綁在同一個原子交易內。
  const incrementStats = env.DB.prepare(
    `INSERT INTO stats (quiz_id, question_id, a_count, b_count)
     VALUES (?, ?, ? * changes(), ? * changes())
     ON CONFLICT (quiz_id, question_id) DO UPDATE SET
       a_count = a_count + ? * changes(),
       b_count = b_count + ? * changes()`
  ).bind(quizId, questionId, aDelta, bDelta, aDelta, bDelta);

  await env.DB.batch([insertReceipt, incrementStats]);

  return jsonResponse({ ok: true }, 200);
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
