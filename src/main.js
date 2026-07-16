import "./styles/main.css";
import { registerRoute, startRouter } from "./router.js";
import { renderHome } from "./pages/home.js";
import { renderQuizFlow } from "./pages/quizFlow.js";

registerRoute(/^\/$/, renderHome);
registerRoute(/^\/quiz\/(?<slug>[^/]+)$/, renderQuizFlow);

startRouter();
