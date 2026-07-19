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

test("dist/quiz/daily-life/index.html 含完整 og:title / og:description / og:image(絕對網址) / canonical", () => {
  const htmlPath = path.join(PROJECT_ROOT, "dist", "quiz", "daily-life", "index.html");
  assert.ok(existsSync(htmlPath), "dist/quiz/daily-life/index.html 應存在");
  const html = readFileSync(htmlPath, "utf-8");

  assert.match(html, /<meta property="og:title" content="[^"]+"/);
  assert.match(html, /<meta property="og:description" content="[^"]+"/);
  assert.match(html, /<meta property="og:image" content="https?:\/\/[^"]+"/);
  assert.match(html, /<meta property="og:url" content="https?:\/\/[^"]+\/quiz\/daily-life"/);
  assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+\/quiz\/daily-life"/);
  // og 專用欄位(daily-life 定稿文案)套用,不是 Phase 3 的 title/description fallback 公式。
  assert.match(html, /<meta property="og:title" content="日常生活二選一\|你真的和大家一樣嗎\?"/);
  assert.match(
    html,
    /<meta property="og:description" content="15 題沒有標準答案的二選一,每題立刻看到全站比例。測完告訴你是主流派還是少數派,還有最孤獨的那一題。"/
  );
  // 仍保留 build 後帶 hash 的 script/link,確保這份客製 head 的頁面點進去照樣是可互動的 SPA。
  assert.match(html, /<script type="module"[^>]*src="\/assets\/[^"]+\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"/);
});

test("dist/quiz/taiwan-food-wars/index.html 使用美食題庫定稿 OG 文案", () => {
  const htmlPath = path.join(PROJECT_ROOT, "dist", "quiz", "taiwan-food-wars", "index.html");
  assert.ok(existsSync(htmlPath), "dist/quiz/taiwan-food-wars/index.html 應存在");
  const html = readFileSync(htmlPath, "utf-8");

  assert.match(html, /<meta property="og:title" content="台灣美食信仰大戰\|你跟大家吃得到一塊嗎\?"/);
  assert.match(
    html,
    /<meta property="og:description" content="15 題台灣人吵不完的美食二選一,每題立刻看到全站比例。測完看看你是主流老饕,還是餐桌異端。"/
  );
  assert.match(html, /<meta property="og:image" content="https?:\/\/[^"]+\/img\/taiwan-food-wars\/cover\.webp"/);
  assert.match(html, /<meta property="og:url" content="https?:\/\/[^"]+\/quiz\/taiwan-food-wars"/);
  assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+\/quiz\/taiwan-food-wars"/);
});
