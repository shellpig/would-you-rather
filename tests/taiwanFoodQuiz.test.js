// 台灣美食題庫 Phase 6 子階段資料守護。
// 定稿內容來源:subdocs/題庫/taiwan-food-wars.md;此測試只把定稿表轉成
// 可精確比對的 oracle,不在測試中解析 Markdown。

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PLACEHOLDER_QUIZZES } from "../src/lib/placeholderQuizzes.js";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const quiz = JSON.parse(
  readFileSync(path.join(PROJECT_ROOT, "src", "data", "quizzes", "taiwan-food-wars.json"), "utf8")
);
const seedData = JSON.parse(
  readFileSync(path.join(PROJECT_ROOT, "scripts", "seeds", "taiwan-food-wars.json"), "utf8")
);
const manifest = JSON.parse(
  readFileSync(path.join(PROJECT_ROOT, "src", "data", "manifest.json"), "utf8")
);

const QUESTION_IDS = [
  "hotpot-taro",
  "curry-mix",
  "danbing-batter-crispy",
  "meatball-fried-steamed",
  "cold-noodle-sauce",
  "rice-noodle-thick-thin",
  "north-south-zongzi",
  "beef-noodle-braised-clear",
  "runbing-sweet-savory",
  "rice-cake-style",
  "coriander",
  "meat-soup-thickness",
  "luroufan-mix",
  "savory-food-sweetness",
  "fried-chicken-cut",
];

const EXPECTED_SEEDS = {
  "hotpot-taro": { a: 48, b: 52 },
  "curry-mix": { a: 43, b: 57 },
  "danbing-batter-crispy": { a: 41, b: 59 },
  "meatball-fried-steamed": { a: 68, b: 32 },
  "cold-noodle-sauce": { a: 76, b: 24 },
  "rice-noodle-thick-thin": { a: 58, b: 42 },
  "north-south-zongzi": { a: 51, b: 49 },
  "beef-noodle-braised-clear": { a: 71, b: 29 },
  "runbing-sweet-savory": { a: 63, b: 37 },
  "rice-cake-style": { a: 66, b: 34 },
  coriander: { a: 46, b: 54 },
  "meat-soup-thickness": { a: 42, b: 58 },
  "luroufan-mix": { a: 57, b: 43 },
  "savory-food-sweetness": { a: 44, b: 56 },
  "fried-chicken-cut": { a: 53, b: 47 },
};

test("美食題庫 metadata 與定稿 OG 文案正確", () => {
  assert.deepEqual(
    {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      cover: quiz.cover,
      category: quiz.category,
      ogTitle: quiz.ogTitle,
      ogDescription: quiz.ogDescription,
    },
    {
      id: "taiwan-food-wars",
      title: "台灣美食信仰大戰:你是哪一派?",
      description:
        "南部粽還是北部粽、咖哩拌不拌、火鍋能不能放芋頭——15 場台灣人的美食信仰大戰,看你跟多少人吃不到一塊。",
      cover: "/img/taiwan-food-wars/cover.webp",
      category: "food",
      ogTitle: "台灣美食信仰大戰|你跟大家吃得到一塊嗎?",
      ogDescription:
        "15 題台灣人吵不完的美食二選一,每題立刻看到全站比例。測完看看你是主流老饕,還是餐桌異端。",
    }
  );
  assert.equal(quiz.questions.length, 15);
});

test("美食題目順序、選項資料與 30 張正式圖片完整對應", () => {
  assert.deepEqual(quiz.questions.map((question) => question.id), QUESTION_IDS);
  for (const question of quiz.questions) {
    for (const choice of [question.a, question.b]) {
      assert.equal(typeof choice.text, "string");
      assert.match(choice.img, /^\/img\/taiwan-food-wars\/[^/]+\.webp$/);
      assert.ok(
        existsSync(path.join(PROJECT_ROOT, "public", choice.img.slice(1))),
        `${question.id} 的圖片不存在:${choice.img}`
      );
    }
  }
});

test("美食 seed key 與題目完全一致,且逐題符合定稿 100 票", () => {
  assert.deepEqual(Object.keys(seedData), QUESTION_IDS);
  assert.deepEqual(seedData, EXPECTED_SEEDS);
  for (const [questionId, { a, b }] of Object.entries(seedData)) {
    assert.ok(Number.isInteger(a) && a > 0, `${questionId} 的 a 應為正整數`);
    assert.ok(Number.isInteger(b) && b > 0, `${questionId} 的 b 應為正整數`);
    assert.equal(a + b, 100, `${questionId} 兩邊合計應為 100`);
  }
});

test("美食 titles 16 組與題目及 mainstream 完整對應,徽章圖片存在", () => {
  assert.deepEqual(Object.keys(quiz.titles), [...QUESTION_IDS, "mainstream"]);
  for (const title of Object.values(quiz.titles)) {
    assert.equal(typeof title.name, "string");
    assert.equal(typeof title.blurb, "string");
    assert.match(title.img, /^\/img\/taiwan-food-wars\/titles\/[^/]+\.webp$/);
    assert.ok(existsSync(path.join(PROJECT_ROOT, "public", title.img.slice(1))), title.img);
  }
});

test("美食已加入 manifest 並移除美食佔位卡,娛樂佔位卡仍保留", () => {
  assert.deepEqual(manifest.quizzes, [
    {
      id: "daily-life",
      title: "日常生活二選一:你是哪一派?",
      cover: "/img/daily-life/cover.webp",
      category: "life",
      questionCount: 15,
    },
    {
      id: "taiwan-food-wars",
      title: "台灣美食信仰大戰:你是哪一派?",
      cover: "/img/taiwan-food-wars/cover.webp",
      category: "food",
      questionCount: 15,
    },
  ]);
  assert.deepEqual(PLACEHOLDER_QUIZZES.map(({ id }) => id), ["placeholder-entertainment"]);
});
