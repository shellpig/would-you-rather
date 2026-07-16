// 從 src/data/manifest.json + src/data/quizzes/*.json 產生 Worker 用的「合法清單」。
// 用途:Worker(functions/api/_lib/legalList.js)據此驗證 quizId / questionId 是否存在,
// 拒絕非法 vote(規格書 §5.2)。設計理由見 開發設計方針.md > Phase 2 > 合法清單。
//
// 執行時機:npm run dev / npm run build 前(package.json 的 predev / prebuild hook)自動執行,
// 不需手動呼叫。輸出檔為 build 產物,已列入 .gitignore,不進 repo。

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(scriptsDir, "..", "src", "data");

const manifest = JSON.parse(readFileSync(path.join(dataDir, "manifest.json"), "utf-8"));

const legalList = {};
for (const { id } of manifest.quizzes) {
  const quizPath = path.join(dataDir, "quizzes", `${id}.json`);
  const quiz = JSON.parse(readFileSync(quizPath, "utf-8"));
  const questionIds = quiz.questions.map((q) => q.id);
  legalList[id] = {
    firstQuestionId: questionIds[0],
    questionIds,
  };
}

const outPath = path.join(dataDir, "legalList.generated.json");
writeFileSync(outPath, JSON.stringify(legalList, null, 2) + "\n", "utf-8");
console.log(`已產生合法清單:${outPath}(${Object.keys(legalList).length} 個題庫)`);
