// 入口頁「建設中」佔位卡守護測試(規格書 §2.1 佔位卡、測試指南 Phase 4 #12、#13)。
// 沒有 jsdom,因此不測 home.js 的 DOM 渲染,改測 src/lib/placeholderQuizzes.js
// 抽出的純函式(清單本身、產出的 HTML 字串),以及既有資料管線(manifest.json)
// 確實不感知佔位卡。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PLACEHOLDER_QUIZZES, renderPlaceholderCard } from "../src/lib/placeholderQuizzes.js";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test("PLACEHOLDER_QUIZZES 只保留尚未上線的娛樂佔位卡", () => {
  const titles = PLACEHOLDER_QUIZZES.map((q) => q.title);
  assert.deepEqual(titles, ["娛樂"]);
});

test("娛樂佔位卡仍使用圖示", () => {
  const entertainment = PLACEHOLDER_QUIZZES.find((q) => q.id === "placeholder-entertainment");

  assert.equal(entertainment.icon, "🎬");
  assert.match(renderPlaceholderCard(entertainment), /quiz-card__placeholder-icon/);
});

test("PLACEHOLDER_QUIZZES 的 id 不與 manifest.json 既有題庫 id 撞名", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(PROJECT_ROOT, "src", "data", "manifest.json"), "utf-8")
  );
  const manifestIds = new Set(manifest.quizzes.map((q) => q.id));
  for (const { id } of PLACEHOLDER_QUIZZES) {
    assert.ok(!manifestIds.has(id), `佔位卡 id ${id} 不應與 manifest 題庫 id 撞名`);
  }
});

test("renderPlaceholderCard 產出的 HTML 不含連結、不可點擊", () => {
  for (const quiz of PLACEHOLDER_QUIZZES) {
    const html = renderPlaceholderCard(quiz);
    assert.doesNotMatch(html, /<a\b/i, "佔位卡不應是 <a> 標籤");
    assert.doesNotMatch(html, /href=/, "佔位卡不應帶 href");
    assert.doesNotMatch(html, /data-link/, "佔位卡不應帶 data-link(router 只認這個屬性導頁)");
  }
});

test("renderPlaceholderCard 產出的 HTML 含「建設中」標示與題庫名稱", () => {
  const html = renderPlaceholderCard(PLACEHOLDER_QUIZZES[0]);
  assert.match(html, /建設中/);
  assert.match(html, /娛樂/);
});

test("renderPlaceholderCard 不含「N 人玩過」字樣(佔位卡無統計資料)", () => {
  for (const quiz of PLACEHOLDER_QUIZZES) {
    const html = renderPlaceholderCard(quiz);
    assert.doesNotMatch(html, /人玩過/);
  }
});

test("manifest.json 不含任何佔位卡 id(合法清單 / OG 產出皆從 manifest 讀取,故一併不感知)", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(PROJECT_ROOT, "src", "data", "manifest.json"), "utf-8")
  );
  const manifestIds = manifest.quizzes.map((q) => q.id);
  const placeholderIds = PLACEHOLDER_QUIZZES.map((q) => q.id);
  for (const id of placeholderIds) {
    assert.ok(!manifestIds.includes(id));
  }
});
