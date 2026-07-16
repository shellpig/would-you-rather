// Worker API 自動化測試(規格書 §5 驗收、測試指南 Phase 2 #3–#6)。
// 用真正的 `wrangler pages dev`(Miniflare/workerd 模擬)+ 獨立的本機 D1 persist 目錄
// 起一個隔離的測試伺服器,對它打 HTTP 請求驗證行為,測完整套關閉、刪除暫存目錄。
// 不使用開發者平常 `npm run dev:worker` 用的埠與 .wrangler/state,兩者互不干擾。

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST_PORT = 18788;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const PERSIST_DIR = mkdtempSync(path.join(os.tmpdir(), "wyr-test-d1-"));

let serverProcess;

before(async () => {
  // 合法清單需與目前的題庫 JSON 同步(測試不依賴開發者是否剛跑過 npm run dev/build)。
  execSync("node scripts/generate-legal-list.mjs", { cwd: PROJECT_ROOT, stdio: "ignore" });

  // 對隔離的 persist 目錄跑 migration,產生乾淨的 stats 表(每次測試皆從 0 票開始)。
  execSync(
    `npx wrangler d1 migrations apply would-you-rather-db --local --persist-to "${PERSIST_DIR}"`,
    { cwd: PROJECT_ROOT, stdio: "ignore" }
  );

  // 用單一命令字串 + shell:true 啟動(避免 shell:true 搭配陣列參數的 Node 轉義警告),
  // Windows 上 npx 需要透過 shell 解析 .cmd 才能找到。
  serverProcess = spawn(
    `npx wrangler pages dev public --port ${TEST_PORT} --persist-to "${PERSIST_DIR}"`,
    [],
    { cwd: PROJECT_ROOT, shell: true, stdio: "ignore" }
  );

  await waitForServerReady();
});

after(async () => {
  killServer();
  await removePersistDirWithRetry();
});

async function waitForServerReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/played-counts`);
      if (res.ok) return;
    } catch {
      // 伺服器尚未起來,continue polling
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("wrangler pages dev 逾時未就緒");
}

// Windows 上 taskkill 回傳時,workerd/sqlite 對 persist 目錄的檔案控點不一定已釋放,
// 緊接著 rmSync 常見 EPERM(與 AGENTS.md 提到的 pytest temp 目錄清理權限問題同類)。
// 用重試 + 短延遲取代單次 rmSync,而不是放著失敗或整份 try/catch 吞掉。
async function removePersistDirWithRetry(retries = 10, delayMs = 300) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      rmSync(PERSIST_DIR, { recursive: true, force: true });
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function killServer() {
  if (!serverProcess || serverProcess.killed) return;
  if (process.platform === "win32") {
    // spawn 透過 shell 起了 cmd.exe -> node -> workerd 的行程樹,需要 /T 才能一併砍掉。
    try {
      execSync(`taskkill /PID ${serverProcess.pid} /T /F`, { stdio: "ignore" });
    } catch {
      // 行程可能已經結束,忽略。
    }
  } else {
    serverProcess.kill("SIGKILL");
  }
}

async function vote(body) {
  return fetch(`${BASE_URL}/api/vote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function stats(quizId) {
  const res = await fetch(`${BASE_URL}/api/stats/${quizId}`);
  return { status: res.status, body: await res.json() };
}

// Phase 2.6:vote 現在需要合法格式的 sessionId(見 functions/api/vote.js)。
// 每個測試各自產生獨立 session id,模擬不同使用者/不同題庫回合。
function newSessionId() {
  return randomUUID();
}

test("GET /api/stats/demo 對尚未有票的題目回傳預設 {a:0,b:0}", async () => {
  const { status, body } = await stats("demo");
  assert.equal(status, 200);
  assert.deepEqual(body["morning-drink"], { a: 0, b: 0 });
  assert.equal(Object.keys(body).length, 6); // demo 題庫 6 題,見 src/data/quizzes/demo.json
});

test("GET /api/stats/:quizId 對不存在的 quizId 回 404", async () => {
  const res = await fetch(`${BASE_URL}/api/stats/not-a-real-quiz`);
  assert.equal(res.status, 404);
});

test("合法 POST /api/vote 使對應計數 +1", async () => {
  const before = (await stats("demo")).body["work-break"];
  const res = await vote({
    quizId: "demo",
    questionId: "work-break",
    choice: "a",
    sessionId: newSessionId(),
  });
  assert.equal(res.status, 200);
  const after = (await stats("demo")).body["work-break"];
  assert.equal(after.a, before.a + 1);
  assert.equal(after.b, before.b);
});

test("非法 quizId 的 vote 被拒絕(4xx),不產生垃圾 row", async () => {
  const res = await vote({
    quizId: "no-such-quiz",
    questionId: "morning-drink",
    choice: "a",
    sessionId: newSessionId(),
  });
  assert.ok(res.status >= 400 && res.status < 500);
  const notFound = await fetch(`${BASE_URL}/api/stats/no-such-quiz`);
  assert.equal(notFound.status, 404); // 合法清單裡本來就沒有這個 quiz,自然查不到
});

test("非法 questionId 的 vote 被拒絕(4xx),該題庫其餘計數不受影響", async () => {
  const before = await stats("demo");
  const res = await vote({
    quizId: "demo",
    questionId: "no-such-question",
    choice: "a",
    sessionId: newSessionId(),
  });
  assert.ok(res.status >= 400 && res.status < 500);
  const after = await stats("demo");
  assert.deepEqual(after.body, before.body);
  assert.equal(Object.keys(after.body).length, 6); // row 數(以合法題目數為準)不變
});

test("非法 choice 的 vote 被拒絕(4xx)", async () => {
  const res = await vote({
    quizId: "demo",
    questionId: "morning-drink",
    choice: "c",
    sessionId: newSessionId(),
  });
  assert.ok(res.status >= 400 && res.status < 500);
});

test("缺欄位 / 非法 JSON body 被拒絕(4xx)", async () => {
  const res1 = await vote({ quizId: "demo" });
  assert.ok(res1.status >= 400 && res1.status < 500);

  const res2 = await fetch(`${BASE_URL}/api/vote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not json",
  });
  assert.ok(res2.status >= 400 && res2.status < 500);
});

test("缺 sessionId 的 vote 被拒絕(4xx),不寫入計數(Phase 2.6)", async () => {
  const before = (await stats("demo")).body["morning-drink"];
  const res = await vote({ quizId: "demo", questionId: "morning-drink", choice: "a" });
  assert.ok(res.status >= 400 && res.status < 500);
  const after = (await stats("demo")).body["morning-drink"];
  assert.deepEqual(after, before);
});

test("sessionId 格式不合法的 vote 被拒絕(4xx)(Phase 2.6)", async () => {
  const before = (await stats("demo")).body["morning-drink"];
  const res = await vote({
    quizId: "demo",
    questionId: "morning-drink",
    choice: "a",
    sessionId: "not-a-uuid",
  });
  assert.ok(res.status >= 400 && res.status < 500);
  const after = (await stats("demo")).body["morning-drink"];
  assert.deepEqual(after, before);
});

test("並發投票不掉票:不同 session 同一題同時發 40 發,增量等於發出數", async () => {
  const N = 40;
  const before = (await stats("demo")).body["rainy-day"];
  await Promise.all(
    Array.from({ length: N }, () =>
      vote({ quizId: "demo", questionId: "rainy-day", choice: "b", sessionId: newSessionId() })
    )
  );
  const after = (await stats("demo")).body["rainy-day"];
  assert.equal(after.b, before.b + N);
  assert.equal(after.a, before.a);
});

// ---- Phase 2.6:收據表冪等 / 並發唯一鍵 / 交易原子性 ----

test("同一 (sessionId, questionId) 重送 10 次(相同 choice)→ 皆回成功、計數只 +1", async () => {
  const sessionId = newSessionId();
  const before = (await stats("demo")).body["dessert-pair"];

  for (let i = 0; i < 10; i++) {
    const res = await vote({
      quizId: "demo",
      questionId: "dessert-pair",
      choice: "a",
      sessionId,
    });
    assert.equal(res.status, 200);
  }

  const after = (await stats("demo")).body["dessert-pair"];
  assert.equal(after.a, before.a + 1);
  assert.equal(after.b, before.b);
});

test("同一 (sessionId, questionId) 重送但 choice 不同 → 回成功、計數不變、既有 choice 不被改寫", async () => {
  const sessionId = newSessionId();
  const questionId = "work-break";

  const first = await vote({ quizId: "demo", questionId, choice: "a", sessionId });
  assert.equal(first.status, 200);
  const afterFirst = (await stats("demo")).body[questionId];

  // 同一 session 同一題,這次改送 "b":不得加 b_count、也不得把已計入的 a_count 扣回。
  const second = await vote({ quizId: "demo", questionId, choice: "b", sessionId });
  assert.equal(second.status, 200);
  const afterSecond = (await stats("demo")).body[questionId];

  assert.deepEqual(afterSecond, afterFirst);
});

test("並發補送:同一 session 同一題同時發 10 發 → 唯一鍵擋住,計數恰 +1", async () => {
  const sessionId = newSessionId();
  const questionId = "rainy-day";
  const before = (await stats("demo")).body[questionId];

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      vote({ quizId: "demo", questionId, choice: "a", sessionId })
    )
  );
  for (const res of results) {
    assert.equal(res.status, 200); // 重複送達仍回成功(只是不加票)
  }

  const after = (await stats("demo")).body[questionId];
  assert.equal(after.a, before.a + 1);
  assert.equal(after.b, before.b);
});

test("GET /api/played-counts 回傳所有合法題庫,值為該題庫第一題 a+b", async () => {
  const res = await fetch(`${BASE_URL}/api/played-counts`);
  assert.equal(res.status, 200);
  const body = await res.json();
  const demoFirstQuestion = (await stats("demo")).body["morning-drink"];
  assert.equal(body.demo, demoFirstQuestion.a + demoFirstQuestion.b);
});

// ---- Phase 3:WAE 產品事件(POST /api/event) ----

async function sendEvent(body) {
  return fetch(`${BASE_URL}/api/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("POST /api/event: 四種合法事件皆回 200 { ok: true }", async () => {
  for (const event of ["quiz_start", "question_answered", "quiz_completed", "share_clicked"]) {
    const res = await sendEvent({ event, quizId: "demo", questionId: "morning-drink", choice: "a" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  }
});

test("POST /api/event: 不認得的 event 名稱回 4xx", async () => {
  const res = await sendEvent({ event: "not_a_real_event", quizId: "demo" });
  assert.ok(res.status >= 400 && res.status < 500);
});

test("POST /api/event: 非法 JSON body 回 4xx", async () => {
  const res = await fetch(`${BASE_URL}/api/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not json",
  });
  assert.ok(res.status >= 400 && res.status < 500);
});

test("POST /api/event: quizId 不在合法清單時仍回 200(埋點格式問題不得擋住前端)", async () => {
  const res = await sendEvent({ event: "quiz_start", quizId: "no-such-quiz" });
  assert.equal(res.status, 200);
});

test("POST /api/event: 缺 quizId/questionId 的事件(如單純 share_clicked)仍回 200", async () => {
  const res = await sendEvent({ event: "share_clicked" });
  assert.equal(res.status, 200);
});
