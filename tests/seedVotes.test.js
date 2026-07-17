// 種子票定稿值守護(開發設計方針.md > Phase 4 > 種子票資料)。
// scripts/seeds/daily-life.json 是 subdocs/題庫/daily-life.md「種子票分佈表」轉成
// script 可讀格式的檔案,兩者需保持一致;本測試把定稿表原樣抄錄一份作為 oracle
// (不引入 markdown parser),逐題核對數值,並確保 seed 檔與題庫 JSON 的
// questionIds 一一對應(無缺漏、無多餘)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const seedData = JSON.parse(
  readFileSync(path.join(PROJECT_ROOT, "scripts", "seeds", "daily-life.json"), "utf-8")
);
const quiz = JSON.parse(
  readFileSync(path.join(PROJECT_ROOT, "src", "data", "quizzes", "daily-life.json"), "utf-8")
);

// 抄自 subdocs/題庫/daily-life.md > 種子票分佈表(2026-07-16 站方拍板定稿,單一事實來源)。
const EXPECTED_SEEDS = {
  "cat-dog": { a: 52, b: 48 },
  "romcom-horror": { a: 62, b: 38 },
  "coffee-tea": { a: 57, b: 43 },
  "cook-dine-out": { a: 36, b: 64 },
  "movie-book": { a: 68, b: 32 },
  "stay-home-go-out": { a: 58, b: 42 },
  "sleep-in-early-bird": { a: 76, b: 24 },
  "sushi-pasta": { a: 51, b: 49 },
  "beach-mountain": { a: 53, b: 47 },
  "park-home-date": { a: 44, b: 56 },
  "world-local-travel": { a: 66, b: 34 },
  "sugar-free-full-sugar": { a: 47, b: 53 },
  "country-city": { a: 41, b: 59 },
  "favorite-first-last": { a: 46, b: 54 },
  "summer-winter": { a: 39, b: 61 },
};

test("scripts/seeds/daily-life.json 的 questionId 集合與 daily-life.json 完全一致(無缺漏、無多餘)", () => {
  const quizQuestionIds = quiz.questions.map((q) => q.id).sort();
  const seedQuestionIds = Object.keys(seedData).sort();
  assert.deepEqual(seedQuestionIds, quizQuestionIds);
});

test("scripts/seeds/daily-life.json 逐題數值與 subdocs/題庫/daily-life.md 定稿表一致", () => {
  assert.deepEqual(seedData, EXPECTED_SEEDS);
});

test("scripts/seeds/daily-life.json 每題 a/b 皆為正整數,且兩邊合計約 100(規格書 §5.3)", () => {
  for (const [questionId, { a, b }] of Object.entries(seedData)) {
    assert.ok(Number.isInteger(a) && a > 0, `${questionId} 的 a 應為正整數`);
    assert.ok(Number.isInteger(b) && b > 0, `${questionId} 的 b 應為正整數`);
    assert.equal(a + b, 100, `${questionId} 兩邊合計應為 100`);
  }
});
