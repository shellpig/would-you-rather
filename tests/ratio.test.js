import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRatio, shouldShowPlayedCount } from "../src/lib/ratio.js";

test("computeRatio: 兩邊加總恆為 100,整數顯示", () => {
  const { aPercent, bPercent } = computeRatio({ a: 34, b: 28 }, "a");
  assert.equal(aPercent + bPercent, 100);
  assert.equal(Number.isInteger(aPercent), true);
  assert.equal(Number.isInteger(bPercent), true);
});

test("computeRatio: 比例含使用者自己這一票", () => {
  // a=9,b=10,使用者投 a → a變10, 總20 → 50%
  const { aPercent, bPercent } = computeRatio({ a: 9, b: 10 }, "a");
  assert.equal(aPercent, 50);
  assert.equal(bPercent, 50);
});

test("computeRatio: 投 b 時另一邊用 100-x 推得,不重算 rounding", () => {
  const { aPercent, bPercent } = computeRatio({ a: 1, b: 2 }, "b");
  // a=1, b=3, total=4 → aPercent=round(25)=25, bPercent=75
  assert.equal(aPercent, 25);
  assert.equal(bPercent, 75);
});

test("computeRatio: total 為 0 時不拋錯,回傳 50/50", () => {
  const { aPercent, bPercent } = computeRatio({ a: 0, b: 0 }, "a");
  assert.equal(aPercent + bPercent, 100);
});

test("shouldShowPlayedCount: 低於門檻不顯示", () => {
  assert.equal(shouldShowPlayedCount(42, 100), false);
});

test("shouldShowPlayedCount: 高於或等於門檻才顯示", () => {
  assert.equal(shouldShowPlayedCount(100, 100), true);
  assert.equal(shouldShowPlayedCount(128, 100), true);
});
