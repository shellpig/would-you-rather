import "./styles/main.css";
import { registerRoute, startRouter } from "./router.js";
import { renderHome } from "./pages/home.js";
import { renderQuizFlow } from "./pages/quizFlow.js";
import { flushPendingVotes } from "./lib/voteQueue.js";

registerRoute(/^\/$/, renderHome);
registerRoute(/^\/quiz\/(?<slug>[^/]+)$/, renderQuizFlow);

startRouter();

// 可靠送票補送(規格書 §5.2、§6;開發設計方針.md > Phase 2.6):開站與恢復連線時
// 掃描所有題庫的 pendingVotes 背景補送,不阻塞畫面渲染。
flushPendingVotes();
window.addEventListener("online", () => flushPendingVotes());
