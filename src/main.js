import "./styles/main.css";
import { registerRoute, startRouter } from "./router.js";
import { HOME_ROUTE, QUIZ_ROUTE, RESULT_ROUTE } from "./routes.js";
import { renderHome } from "./pages/home.js";
import { renderQuizFlow } from "./pages/quizFlow.js";
import { flushPendingVotes } from "./lib/voteQueue.js";

registerRoute(HOME_ROUTE, renderHome);
// 尾斜線契約(開發設計方針.md > per-quiz OG meta / canonical「尾斜線契約」):
// pattern 定義於 src/routes.js(供 tests/router.test.js 直接引用同一份 regex)。
// RESULT_ROUTE 需先註冊?不需要——QUIZ_ROUTE 的 slug 用 [^/]+ 不吃斜線,
// /quiz/<id>/r/<稱號id> 只會匹配 RESULT_ROUTE,兩者無註冊順序依賴。
registerRoute(QUIZ_ROUTE, renderQuizFlow);
// 結果分享連結(規格書 §9 Phase 7 修訂,2026-07-20 LINE 真機實測後站方拍板):
// /quiz/<id>/r/<稱號id> 一律直接顯示該題庫首頁——稱號段只為讓 LINE/FB 抓對應
// OG 卡,不驗證(任意字串同樣落題庫首頁);query(含已散出去的舊格式 ?d=xzq)
// 一律忽略——router 只用 location.pathname 匹配,天然向後相容。進頁先把 URL
// replaceState 正規化回 /quiz/<slug>(不多產生 history entry),之後行為與直訪
// 題庫頁完全一致;題庫 id 無效維持既有「找不到題庫」(renderQuizFlow 內建)。
registerRoute(RESULT_ROUTE, (app, { slug }) => {
  history.replaceState({}, "", `/quiz/${slug}`);
  return renderQuizFlow(app, { slug });
});

startRouter();

// 可靠送票補送(規格書 §5.2、§6;開發設計方針.md > Phase 2.6):開站與恢復連線時
// 掃描所有題庫的 pendingVotes 背景補送,不阻塞畫面渲染。
flushPendingVotes();
window.addEventListener("online", () => flushPendingVotes());
