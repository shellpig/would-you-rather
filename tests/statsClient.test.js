import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchStats } from "../src/lib/statsClient.js";

// 回歸測試(驗證後已知問題.md「stats API 失敗時點選項 TypeError,答題卡死」):
// fetchStats 失敗時必須拋錯,不可降級回傳 {}——否則呼叫端會用空快照繼續呼叫
// computeRatio(undefined, ...) 導致 TypeError。

test("fetchStats: 回應非 2xx 時拋錯,不降級回傳 {}", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response("", { status: 500 });
  try {
    await assert.rejects(() => fetchStats("demo"));
  } finally {
    global.fetch = originalFetch;
  }
});

test("fetchStats: 回應 2xx 時正常回傳 JSON", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ q1: { a: 1, b: 2 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  try {
    const stats = await fetchStats("demo");
    assert.deepEqual(stats, { q1: { a: 1, b: 2 } });
  } finally {
    global.fetch = originalFetch;
  }
});
