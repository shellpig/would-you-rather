// per-quiz OG 靜態頁面(規格書 §2.4、§9 Phase 3;測試指南 Phase 3 #13)。
// 用真正的 vite build + postbuild script 產出 dist/,直接讀產物驗證結構——
// 這就是「view-source 檢查」在自動化測試裡的等價做法(真網域預覽實測留待 Phase 5)。

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

before(() => {
  execSync("npx vite build", { cwd: PROJECT_ROOT, stdio: "ignore" });
  execSync("node scripts/generate-og-pages.mjs", { cwd: PROJECT_ROOT, stdio: "ignore" });
});

test("dist/quiz/demo/index.html 含完整 og:title / og:description / og:image(絕對網址) / canonical", () => {
  const htmlPath = path.join(PROJECT_ROOT, "dist", "quiz", "demo", "index.html");
  assert.ok(existsSync(htmlPath), "dist/quiz/demo/index.html 應存在");
  const html = readFileSync(htmlPath, "utf-8");

  assert.match(html, /<meta property="og:title" content="[^"]+"/);
  assert.match(html, /<meta property="og:description" content="[^"]+"/);
  assert.match(html, /<meta property="og:image" content="https?:\/\/[^"]+"/);
  assert.match(html, /<meta property="og:url" content="https?:\/\/[^"]+\/quiz\/demo"/);
  assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+\/quiz\/demo"/);
  // 仍保留 build 後帶 hash 的 script/link,確保這份客製 head 的頁面點進去照樣是可互動的 SPA。
  assert.match(html, /<script type="module"[^>]*src="\/assets\/[^"]+\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"/);
});
