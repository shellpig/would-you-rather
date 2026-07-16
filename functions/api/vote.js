// POST /api/vote — 規格書 §5.2。
// body: { quizId, questionId, choice: "a"|"b" }。非法輸入一律拒絕(4xx),不寫入 D1,
// 避免垃圾 rows(§5 驗收)。合法請求以 UPSERT 原子遞增對應計數。

import { isLegalQuiz, isLegalQuestion } from "./_lib/legalList.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const { quizId, questionId, choice } = body ?? {};

  if (
    typeof quizId !== "string" ||
    typeof questionId !== "string" ||
    (choice !== "a" && choice !== "b")
  ) {
    return jsonResponse({ error: "invalid vote payload" }, 400);
  }
  if (!isLegalQuiz(quizId) || !isLegalQuestion(quizId, questionId)) {
    return jsonResponse({ error: "unknown quizId or questionId" }, 400);
  }

  const column = choice === "a" ? "a_count" : "b_count";
  // INSERT ... ON CONFLICT ... DO UPDATE 是單一 SQL statement,D1(SQLite)保證原子性,
  // 並發寫入不會互相覆蓋、不掉票(規格書 §5 驗收「並發投票不掉票」)。
  await env.DB.prepare(
    `INSERT INTO stats (quiz_id, question_id, a_count, b_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(quiz_id, question_id) DO UPDATE SET ${column} = ${column} + 1`
  )
    .bind(quizId, questionId, choice === "a" ? 1 : 0, choice === "b" ? 1 : 0)
    .run();

  return jsonResponse({ ok: true }, 200);
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
