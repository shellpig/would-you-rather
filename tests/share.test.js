import { test } from "node:test";
import assert from "node:assert/strict";
import { canUseWebShare, shareResult, copyResultLink } from "../src/lib/share.js";

// Node.js 內建一個唯讀 getter 形式的 `navigator` global(無 share/clipboard),
// 用 Object.defineProperty 整包替換成測試用的假物件,測完還原(configurable: true 允許替換)。
function withNavigator(fakeNavigator, fn) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: fakeNavigator, configurable: true });
  try {
    return fn();
  } finally {
    Object.defineProperty(globalThis, "navigator", original);
  }
}

test("canUseWebShare: navigator.share 存在時回傳 true", () => {
  withNavigator({ share: async () => {} }, () => {
    assert.equal(canUseWebShare(), true);
  });
});

test("canUseWebShare: 不存在時回傳 false", () => {
  withNavigator({}, () => {
    assert.equal(canUseWebShare(), false);
  });
});

test("shareResult: 呼叫 navigator.share 並帶入 text/url", async () => {
  let received;
  await withNavigator({ share: async (payload) => { received = payload; } }, () =>
    shareResult("摘要文字", "https://example.com/quiz/demo")
  );
  assert.deepEqual(received, { text: "摘要文字", url: "https://example.com/quiz/demo" });
});

test("copyResultLink: navigator.clipboard.writeText 成功時回傳 true,內容含文字與連結", async () => {
  let written;
  const ok = await withNavigator(
    { clipboard: { writeText: async (text) => { written = text; } } },
    () => copyResultLink("摘要文字", "https://example.com/quiz/demo")
  );
  assert.equal(ok, true);
  assert.equal(written, "摘要文字 https://example.com/quiz/demo");
});

test("copyResultLink: clipboard API 不存在且無 document(Node 測試環境)時回傳 false、不拋錯", async () => {
  const ok = await withNavigator({}, () => copyResultLink("摘要文字", "https://example.com/quiz/demo"));
  assert.equal(ok, false);
});

test("copyResultLink: clipboard.writeText 拋錯時落到 fallback,不拋錯地回傳 false(Node 無 document)", async () => {
  const ok = await withNavigator(
    { clipboard: { writeText: async () => { throw new Error("denied"); } } },
    () => copyResultLink("摘要文字", "https://example.com/quiz/demo")
  );
  assert.equal(ok, false);
});
