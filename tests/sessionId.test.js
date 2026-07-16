import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSessionId } from "../src/lib/sessionId.js";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("generateSessionId: 產生 UUID v4 格式字串(供後端 vote.js 格式驗證)", () => {
  const id = generateSessionId();
  assert.match(id, UUID_V4_PATTERN);
});

test("generateSessionId: 每次呼叫產生不同的 id", () => {
  const a = generateSessionId();
  const b = generateSessionId();
  assert.notEqual(a, b);
});
