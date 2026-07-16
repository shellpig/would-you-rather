// 種子票 script(規格書 §5.3):每題預填「每邊 20–50 票隨機分佈」,避免新題庫早期
// 出現「100% vs 0%」的尷尬。可安全重跑:用 INSERT ... ON CONFLICT ... DO UPDATE
// 覆寫既有 row(而非累加或報錯),重跑只會換一組新的隨機種子值,不會產生重複 row、
// 不會疊加爆量(見 開發設計方針.md > Phase 2 > 種子票)。
//
// 用法:
//   node scripts/seed-votes.mjs            # 種本機 D1(--local)
//   node scripts/seed-votes.mjs --remote    # 種正式 D1(Phase 5 上線後才用)

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const DB_NAME = "would-you-rather-db"; // 需與 wrangler.toml 的 database_name 一致

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scriptsDir, "..");
const remote = process.argv.includes("--remote");

// 先確保合法清單是最新的(題庫 JSON 若剛改過,種子票才會涵蓋到新題目)。
execSync("node scripts/generate-legal-list.mjs", { cwd: projectRoot, stdio: "inherit" });

const legalList = JSON.parse(
  readFileSync(path.join(projectRoot, "src", "data", "legalList.generated.json"), "utf-8")
);

function randCount() {
  return 20 + Math.floor(Math.random() * 31); // 20–50(含)
}

const statements = [];
for (const [quizId, { questionIds }] of Object.entries(legalList)) {
  for (const questionId of questionIds) {
    const a = randCount();
    const b = randCount();
    statements.push(
      `INSERT INTO stats (quiz_id, question_id, a_count, b_count) VALUES ('${escapeSql(
        quizId
      )}', '${escapeSql(questionId)}', ${a}, ${b}) ON CONFLICT(quiz_id, question_id) DO UPDATE SET a_count = ${a}, b_count = ${b};`
    );
  }
}

function escapeSql(s) {
  return s.replace(/'/g, "''");
}

if (statements.length === 0) {
  console.log("合法清單為空,沒有題目可種票。");
  process.exit(0);
}

const tmpFile = path.join(os.tmpdir(), `wyr-seed-${Date.now()}.sql`);
writeFileSync(tmpFile, statements.join("\n") + "\n", "utf-8");

try {
  console.log(`執行種子票(${remote ? "remote" : "local"}):共 ${statements.length} 題`);
  // 用 execSync(單一命令字串,經 shell 執行)而非 execFileSync + shell:true 傳陣列參數,
  // 避免 Node 對「shell:true 搭配陣列參數」的轉義風險警告;本命令的唯一動態片段是
  // tmpFile(來自 os.tmpdir() + 內部產生的檔名,非外部輸入),以雙引號包住即可安全處理空白路徑。
  execSync(`npx wrangler d1 execute ${DB_NAME} ${remote ? "--remote" : "--local"} --file="${tmpFile}"`, {
    cwd: projectRoot,
    stdio: "inherit",
  });
  console.log("種子票完成。");
} finally {
  unlinkSync(tmpFile);
}
