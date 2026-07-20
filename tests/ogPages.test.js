// per-quiz OG 靜態頁面(規格書 §2.4、§9 Phase 3;測試指南 Phase 3 #13)。
// 用真正的 vite build + postbuild script 產出 dist/,直接讀產物驗證結構——
// 這就是「view-source 檢查」在自動化測試裡的等價做法(真網域預覽實測留待 Phase 5)。

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
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

// ---- 稱號 OG 靜態頁(規格書 §9 Phase 7)----

test("每題庫每稱號各產出一頁 dist/quiz/<id>/r/<稱號id>/index.html(共 32 頁)", () => {
  let total = 0;
  for (const quizId of ["daily-life", "taiwan-food-wars"]) {
    const quiz = JSON.parse(
      readFileSync(path.join(PROJECT_ROOT, "src", "data", "quizzes", `${quizId}.json`), "utf-8")
    );
    const rDir = path.join(PROJECT_ROOT, "dist", "quiz", quizId, "r");
    const produced = readdirSync(rDir).sort();
    assert.deepEqual(produced, Object.keys(quiz.titles).sort(), `${quizId} 稱號頁目錄應與 titles 完全對應`);
    for (const titleId of produced) {
      assert.ok(existsSync(path.join(rDir, titleId, "index.html")), `${quizId}/r/${titleId} 缺 index.html`);
      total += 1;
    }
  }
  assert.equal(total, 32);
});

test("一般稱號頁:og:title 帶「孤獨稱號」、og:description 用判詞、og:image 指向稱號卡圖、canonical 為稱號頁", () => {
  const html = readFileSync(
    path.join(PROJECT_ROOT, "dist", "quiz", "daily-life", "r", "cat-dog", "index.html"),
    "utf-8"
  );
  assert.match(html, /<meta property="og:title" content="我拿到孤獨稱號『毛孩孤勇者』\|日常生活二選一:你是哪一派\?"/);
  assert.match(html, /<meta property="og:description" content="在最大的戰場上,你站了人少的那邊。"/);
  assert.match(html, /<meta property="og:image" content="https?:\/\/[^"]+\/img\/daily-life\/og-titles\/cat-dog\.webp"/);
  assert.match(html, /<meta property="og:url" content="https?:\/\/[^"]+\/quiz\/daily-life\/r\/cat-dog"/);
  assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+\/quiz\/daily-life\/r\/cat-dog"/);
  // 稱號頁一樣是可互動的 SPA(hashed bundle 標籤原封複用)。
  assert.match(html, /<script type="module"[^>]*src="\/assets\/[^"]+\.js"><\/script>/);
});

test("mainstream 稱號頁:og:title 不帶「孤獨」字眼", () => {
  const html = readFileSync(
    path.join(PROJECT_ROOT, "dist", "quiz", "taiwan-food-wars", "r", "mainstream", "index.html"),
    "utf-8"
  );
  assert.match(html, /<meta property="og:title" content="我拿到稱號『國民舌頭』\|台灣美食信仰大戰:你是哪一派\?"/);
  assert.doesNotMatch(html, /<meta property="og:title" content="[^"]*孤獨[^"]*"/);
  assert.match(html, /<meta property="og:image" content="https?:\/\/[^"]+\/img\/taiwan-food-wars\/og-titles\/mainstream\.webp"/);
});
