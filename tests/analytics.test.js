import { test } from "node:test";
import assert from "node:assert/strict";
import { trackEvent } from "../src/lib/analytics.js";

// 規格書 §9 Phase 3 驗收:「事件送出失敗不影響任何 UI 與答題流程」——trackEvent 必須是
// fire-and-forget:不 await 呼叫端也不需要,fetch 失敗(拒絕或非 2xx)一律吞掉、不拋出。

test("trackEvent: 打 POST /api/event,body 含 event 與 payload", () => {
  const originalFetch = global.fetch;
  let calledWith;
  global.fetch = async (url, options) => {
    calledWith = { url, options };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  try {
    trackEvent("quiz_start", { quizId: "demo" });
    assert.equal(calledWith.url, "/api/event");
    assert.equal(calledWith.options.method, "POST");
    assert.deepEqual(JSON.parse(calledWith.options.body), { event: "quiz_start", quizId: "demo" });
    assert.equal(calledWith.options.keepalive, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test("trackEvent: fetch reject 時不拋出(呼叫端不需要 try/catch)", () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("network down");
  };
  try {
    assert.doesNotThrow(() => trackEvent("share_clicked", { quizId: "demo" }));
  } finally {
    global.fetch = originalFetch;
  }
});

test("trackEvent: 非 2xx 回應也不拋出", () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response("", { status: 500 });
  try {
    assert.doesNotThrow(() => trackEvent("quiz_completed", { quizId: "demo" }));
  } finally {
    global.fetch = originalFetch;
  }
});
