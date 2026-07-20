// 分享連結組法守護測試(規格書 §9 Phase 7 修訂,2026-07-20;src/lib/resultUrl.js)。
// 原 `?d=` 編解碼(resultCode.js)已隨唯讀總結頁撤除,對應 round-trip 測試整檔刪除。

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildResultUrl } from "../src/lib/resultUrl.js";

test("buildResultUrl 組出 /quiz/<id>/r/<稱號id> 格式,不帶任何 query", () => {
  assert.equal(
    buildResultUrl("https://example.com", "daily-life", "cat-dog"),
    "https://example.com/quiz/daily-life/r/cat-dog"
  );
  assert.equal(
    buildResultUrl("https://example.com", "daily-life", "mainstream"),
    "https://example.com/quiz/daily-life/r/mainstream"
  );
});
