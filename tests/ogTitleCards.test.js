// 稱號 OG 卡圖與短標籤表守護測試(規格書 §9 Phase 7;scripts/generate-og-title-cards.mjs)。
// 卡圖為 committed 素材(public/img/<id>/og-titles/),測試直接驗檔案存在、尺寸 1200×630
// 與 ≤80KB;短標籤表(scripts/og-cards/<id>.json)須與題庫題目 id 完全對應。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUIZ_IDS = ["daily-life", "taiwan-food-wars"];

function loadQuiz(id) {
  return JSON.parse(
    readFileSync(path.join(PROJECT_ROOT, "src", "data", "quizzes", `${id}.json`), "utf-8")
  );
}

function loadLabels(id) {
  const raw = JSON.parse(
    readFileSync(path.join(PROJECT_ROOT, "scripts", "og-cards", `${id}.json`), "utf-8")
  );
  delete raw._comment;
  return raw;
}

for (const quizId of QUIZ_IDS) {
  test(`短標籤表 scripts/og-cards/${quizId}.json 與題庫題目 id 完全對應且值非空`, () => {
    const quiz = loadQuiz(quizId);
    const labels = loadLabels(quizId);
    const questionIds = quiz.questions.map((q) => q.id);
    assert.deepEqual(Object.keys(labels).sort(), [...questionIds].sort());
    for (const [qid, pair] of Object.entries(labels)) {
      assert.ok(typeof pair.a === "string" && pair.a.length > 0, `${qid}.a 不可為空`);
      assert.ok(typeof pair.b === "string" && pair.b.length > 0, `${qid}.b 不可為空`);
    }
  });

  test(`${quizId}:16 張稱號 OG 卡圖存在、1200×630、≤80KB`, async () => {
    const quiz = loadQuiz(quizId);
    const titleIds = Object.keys(quiz.titles);
    assert.equal(titleIds.length, 16, "每題庫應有 16 個稱號(15 題 + mainstream)");
    for (const titleId of titleIds) {
      const file = path.join(PROJECT_ROOT, "public", "img", quizId, "og-titles", `${titleId}.webp`);
      assert.ok(existsSync(file), `缺卡圖:${file}`);
      assert.ok(statSync(file).size <= 80 * 1024, `${titleId}.webp 超過 80KB`);
      const meta = await sharp(file).metadata();
      assert.equal(meta.width, 1200, `${titleId}.webp 寬度應為 1200`);
      assert.equal(meta.height, 630, `${titleId}.webp 高度應為 630`);
      assert.equal(meta.format, "webp");
    }
  });
}
