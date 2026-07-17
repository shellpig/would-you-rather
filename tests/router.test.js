// 路由 pattern 守護測試(2026-07-17 code review 修正:尾斜線契約,見 開發設計方針.md >
// per-quiz OG meta / canonical「尾斜線契約」)。舊 pattern `[^/]+$` 不吃尾斜線,
// Cloudflare Pages 對 dist/quiz/<id>/index.html 一律 308 轉址到帶尾斜線的 URL,
// 導致所有外部分享連結進站後 SPA 顯示「找不到頁面」——此測試在舊 pattern 下會失敗、
// 新 pattern(src/routes.js 的 QUIZ_ROUTE)下應通過。
//
// 直接測 regex 本身(而非透過 src/main.js/src/router.js 的 registerRoute + DOM 渲染),
// 因為 main.js 有 CSS import 與啟動時的 DOM 操作副作用,專案未引入 jsdom 之類的測試
// 基礎設施;src/routes.js 是純 regex 常數,main.js 與這裡引用同一份,不會漂移。

import { test } from "node:test";
import assert from "node:assert/strict";
import { HOME_ROUTE, QUIZ_ROUTE } from "../src/routes.js";

test("QUIZ_ROUTE:無尾斜線與帶尾斜線皆匹配,slug 均不含尾斜線", () => {
  const withoutSlash = "/quiz/demo".match(QUIZ_ROUTE);
  const withSlash = "/quiz/demo/".match(QUIZ_ROUTE);
  assert.ok(withoutSlash, "/quiz/demo 應匹配 quiz route");
  assert.ok(withSlash, "/quiz/demo/ 應匹配 quiz route(Cloudflare Pages 308 轉址落地的 URL)");
  assert.equal(withoutSlash.groups.slug, "demo");
  assert.equal(withSlash.groups.slug, "demo");
});

test("QUIZ_ROUTE:雙尾斜線不需要支援", () => {
  assert.equal("/quiz/demo//".match(QUIZ_ROUTE), null);
});

test("HOME_ROUTE 與不存在路徑的行為不變", () => {
  assert.ok("/".match(HOME_ROUTE));
  assert.equal("/not-a-real-page".match(HOME_ROUTE), null);
  assert.equal("/not-a-real-page".match(QUIZ_ROUTE), null);
});
