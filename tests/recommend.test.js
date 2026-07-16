import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRecommendedQuizzes } from "../src/lib/recommend.js";

const quizzes = [{ id: "demo" }, { id: "food" }, { id: "otaku" }, { id: "life" }];

test("pickRecommendedQuizzes: 排除當前題庫,取前 2 個", () => {
  const result = pickRecommendedQuizzes(quizzes, "demo", 2);
  assert.deepEqual(
    result.map((q) => q.id),
    ["food", "otaku"]
  );
});

test("pickRecommendedQuizzes: 當前題庫在中間也能正確排除", () => {
  const result = pickRecommendedQuizzes(quizzes, "otaku", 2);
  assert.deepEqual(
    result.map((q) => q.id),
    ["demo", "food"]
  );
});

test("pickRecommendedQuizzes: 題庫數不足時回傳現有數量(不補空)", () => {
  const result = pickRecommendedQuizzes([{ id: "demo" }], "demo", 2);
  assert.deepEqual(result, []);
});
