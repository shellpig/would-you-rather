// 「找不到題庫」錯誤型別守護測試(2026-07-19)。quizFlow 的 renderQuizFlow 以
// `err instanceof QuizNotFoundError` 分流「題庫不存在」與其他錯誤;此測試鎖住這個
// 判別契約,防止改回訊息字串比對或一般 Error(那會讓網路類錯誤被誤判成找不到題庫)。
// 不透過 quizData.js 測(其 import.meta.glob 無法在 node 下載入,抽純模組動機見
// src/lib/quizNotFoundError.js 開頭註解)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { QuizNotFoundError } from "../src/lib/quizNotFoundError.js";

test("QuizNotFoundError:是 Error 子類且可用 instanceof 判別", () => {
  const err = new QuizNotFoundError("nonexistent-xyz");
  assert.ok(err instanceof QuizNotFoundError);
  assert.ok(err instanceof Error);
  assert.equal(err.name, "QuizNotFoundError");
  assert.equal(err.message, "quiz not found: nonexistent-xyz");
});

test("一般 Error(如網路錯誤)不會被判別成 QuizNotFoundError", () => {
  assert.ok(!(new Error("network down") instanceof QuizNotFoundError));
  assert.ok(!(new TypeError("Failed to fetch") instanceof QuizNotFoundError));
});
