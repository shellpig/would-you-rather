// GET /api/played-counts — 非規格書 §5.2 明文定義,Phase 2 為「N 人玩過」補的最小 API
// (決策與理由見 開發設計方針.md > Phase 2 > 「N 人玩過」資料來源決策)。
//
// 回傳所有合法題庫的 { quizId: count },count = 該題庫第一題 a_count+b_count
// (單向流動、無回上一題,故第一題人人會答,可視為「玩過」的下限估計)。
// 一次回傳全部題庫,入口頁列出多個題庫卡片時只需一次請求,API 面積最小。

import { getAllQuizIds, getFirstQuestionId } from "./_lib/legalList.js";

export async function onRequestGet({ env }) {
  const quizIds = getAllQuizIds();
  const counts = {};

  if (quizIds.length === 0) {
    return jsonResponse(counts, 200);
  }

  const statements = quizIds.map((quizId) =>
    env.DB.prepare("SELECT a_count, b_count FROM stats WHERE quiz_id = ? AND question_id = ?").bind(
      quizId,
      getFirstQuestionId(quizId)
    )
  );
  const results = await env.DB.batch(statements);

  quizIds.forEach((quizId, i) => {
    const row = results[i].results[0];
    counts[quizId] = row ? row.a_count + row.b_count : 0;
  });

  return jsonResponse(counts, 200);
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
