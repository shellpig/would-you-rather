import "./styles/main.css";
import { registerRoute, startRouter } from "./router.js";
import { HOME_ROUTE, QUIZ_ROUTE, RESULT_ROUTE } from "./routes.js";
import { renderHome } from "./pages/home.js";
import { renderQuizFlow } from "./pages/quizFlow.js";
import { renderSharedResult } from "./pages/sharedResult.js";
import { flushPendingVotes } from "./lib/voteQueue.js";

registerRoute(HOME_ROUTE, renderHome);
// 尾斜線契約(開發設計方針.md > per-quiz OG meta / canonical「尾斜線契約」):
// pattern 定義於 src/routes.js(供 tests/router.test.js 直接引用同一份 regex)。
// RESULT_ROUTE 需先註冊?不需要——QUIZ_ROUTE 的 slug 用 [^/]+ 不吃斜線,
// /quiz/<id>/r/<稱號id> 只會匹配 RESULT_ROUTE,兩者無註冊順序依賴。
registerRoute(QUIZ_ROUTE, renderQuizFlow);
registerRoute(RESULT_ROUTE, renderSharedResult);

startRouter();

// 可靠送票補送(規格書 §5.2、§6;開發設計方針.md > Phase 2.6):開站與恢復連線時
// 掃描所有題庫的 pendingVotes 背景補送,不阻塞畫面渲染。
flushPendingVotes();
window.addEventListener("online", () => flushPendingVotes());
