// 結果連結 `d` 參數編解碼守護測試(規格書 §9 Phase 7;src/lib/resultCode.js)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeChoices, decodeChoices, buildResultUrl } from "../src/lib/resultCode.js";

const N = 15;

test("round-trip:任意 15 題選擇編碼後可原樣解回", () => {
  const cases = [
    Array(N).fill("a"),
    Array(N).fill("b"),
    Array.from({ length: N }, (_, i) => (i % 2 === 0 ? "a" : "b")),
    Array.from({ length: N }, (_, i) => (i < 7 ? "b" : "a")),
  ];
  for (const choices of cases) {
    const code = encodeChoices(choices);
    assert.deepEqual(decodeChoices(code, N), choices, `round-trip 失敗:${choices.join("")}`);
  }
});

test("round-trip:窮舉全部 2^15 種組合皆無損(bitmask 編碼的完整守護)", () => {
  for (let mask = 0; mask < 2 ** N; mask++) {
    const choices = Array.from({ length: N }, (_, i) =>
      Math.floor(mask / 2 ** i) % 2 === 1 ? "b" : "a"
    );
    assert.deepEqual(decodeChoices(encodeChoices(choices), N), choices);
  }
});

test("編碼為 base36 短字串:15 題至多 4 字元、不含個資欄位", () => {
  const code = encodeChoices(Array(N).fill("b"));
  assert.match(code, /^[0-9a-z]{1,4}$/);
});

test("無效輸入一律回傳 null(降級顯示題庫首頁的觸發條件)", () => {
  const valid = encodeChoices(Array(N).fill("a"));
  assert.notEqual(decodeChoices(valid, N), null);

  assert.equal(decodeChoices(null, N), null, "d 缺漏");
  assert.equal(decodeChoices(undefined, N), null, "d 缺漏");
  assert.equal(decodeChoices("", N), null, "空字串");
  assert.equal(decodeChoices("XYZ!", N), null, "非 base36 字元(大寫/符號)");
  assert.equal(decodeChoices("0", N), null, "無 sentinel(值域過小)");
  assert.equal(decodeChoices("zzzzzzzzzz", N), null, "值域過大");
  assert.equal(decodeChoices(valid, N + 1), null, "題數不符(題庫改版後的舊連結)");
  assert.equal(decodeChoices(valid, N - 1), null, "題數不符");
});

test("buildResultUrl 組出 /quiz/<id>/r/<稱號id>?d=<code> 格式", () => {
  assert.equal(
    buildResultUrl("https://example.com", "daily-life", "cat-dog", "abc1"),
    "https://example.com/quiz/daily-life/r/cat-dog?d=abc1"
  );
  assert.equal(
    buildResultUrl("https://example.com", "daily-life", "mainstream", "abc1"),
    "https://example.com/quiz/daily-life/r/mainstream?d=abc1"
  );
});
