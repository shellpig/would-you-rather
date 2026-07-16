// GET /api/stats/:quizId — 規格書 §5.2。
// 回傳該題庫所有題目的 { questionId: { a, b } }。「開始作答」時呼叫一次(§2.2)。

import { isLegalQuiz, getQuestionIds } from "../_lib/legalList.js";

export async function onRequestGet({ params, env }) {
  const quizId = params.quizId;

  if (!isLegalQuiz(quizId)) {
    return jsonResponse({ error: "unknown quizId" }, 404);
  }

  const questionIds = getQuestionIds(quizId);
  const { results } = await env.DB.prepare(
    "SELECT question_id, a_count, b_count FROM stats WHERE quiz_id = ?"
  )
    .bind(quizId)
    .all();

  const rowsByQuestion = Object.fromEntries(
    results.map((r) => [r.question_id, { a: r.a_count, b: r.b_count }])
  );

  // 尚未有票的題目(例如種子票尚未執行)預設 {a:0,b:0},不因缺 row 而漏欄位。
  const stats = {};
  for (const questionId of questionIds) {
    stats[questionId] = rowsByQuestion[questionId] ?? { a: 0, b: 0 };
  }

  return jsonResponse(stats, 200);
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
