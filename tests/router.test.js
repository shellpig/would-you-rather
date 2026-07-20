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
import { HOME_ROUTE, QUIZ_ROUTE, RESULT_ROUTE } from "../src/routes.js";

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

test("RESULT_ROUTE:結果分享頁匹配 slug 與 titleId,尾斜線契約同 QUIZ_ROUTE(Phase 7)", () => {
  const withoutSlash = "/quiz/daily-life/r/cat-dog".match(RESULT_ROUTE);
  const withSlash = "/quiz/daily-life/r/cat-dog/".match(RESULT_ROUTE);
  assert.ok(withoutSlash, "/quiz/daily-life/r/cat-dog 應匹配 result route");
  assert.ok(withSlash, "帶尾斜線(Cloudflare Pages 308 轉址落地的 URL)應匹配");
  assert.equal(withoutSlash.groups.slug, "daily-life");
  assert.equal(withoutSlash.groups.titleId, "cat-dog");
  assert.equal(withSlash.groups.slug, "daily-life");
  assert.equal(withSlash.groups.titleId, "cat-dog");
  assert.equal("/quiz/daily-life/r/cat-dog//".match(RESULT_ROUTE), null, "雙尾斜線不需要支援");
});

test("RESULT_ROUTE:稱號段不驗證——任意字串一樣匹配、由 SPA 落題庫首頁(Phase 7 修訂 2026-07-20)", () => {
  const match = "/quiz/daily-life/r/%E4%BA%82%E5%AD%97%E4%B8%B2".match(RESULT_ROUTE);
  assert.ok(match, "亂字串稱號段也應匹配 result route(main.js 一律委派 renderQuizFlow)");
  assert.equal(match.groups.slug, "daily-life");
});

test("RESULT_ROUTE:舊格式連結(已散出去的 ?d=xzq)向後相容——router 只用 pathname 匹配,query 一律忽略", () => {
  // 模擬 router.js 的匹配方式:matchRoute(location.pathname),query 不進 regex。
  const oldLink = new URL("https://example.com/quiz/daily-life/r/cat-dog?d=xzq");
  const match = oldLink.pathname.match(RESULT_ROUTE);
  assert.ok(match, "舊 ?d= 連結的 pathname 應照常匹配 result route");
  assert.equal(match.groups.slug, "daily-life");
  assert.equal(match.groups.titleId, "cat-dog");
});

test("RESULT_ROUTE 與 QUIZ_ROUTE 互不搶匹配(slug 的 [^/]+ 不吃斜線)", () => {
  assert.equal("/quiz/daily-life/r/cat-dog".match(QUIZ_ROUTE), null);
  assert.equal("/quiz/daily-life".match(RESULT_ROUTE), null);
  assert.equal("/quiz/daily-life/r".match(RESULT_ROUTE), null);
  assert.equal("/quiz/daily-life/r/".match(RESULT_ROUTE), null);
});

test("HOME_ROUTE 與不存在路徑的行為不變", () => {
  assert.ok("/".match(HOME_ROUTE));
  assert.equal("/not-a-real-page".match(HOME_ROUTE), null);
  assert.equal("/not-a-real-page".match(QUIZ_ROUTE), null);
});
