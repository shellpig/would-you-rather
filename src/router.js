// 極簡 History API router。
//
// 返回鍵行為決策(規格書 §3 驗收「無任何返回上一題的途徑」、測試指南 Phase 1 #10):
// - 題庫內的答題流程(開始作答 → 逐題 → 完成)全程停留在同一個 URL(/quiz/:slug),
//   題目切換只更新頁面內的 JS 狀態、不呼叫 pushState/replaceState,URL 本身完全不變。
// - 因此瀏覽器返回鍵在答題中途按下時,會直接離開整個題庫、回到上一個 history
//   entry(通常是入口頁 /),而不會停在題目與題目之間——滿足「不會回到上一題」,
//   同時不需另外攔截 popstate 做特殊阻擋,維持最簡單實作。
// - 只有「/」→「/quiz/:slug」這一次導覽會 push 新 entry。

const routes = [];

export function registerRoute(pattern, render) {
  routes.push({ pattern, render });
}

function matchRoute(pathname) {
  for (const route of routes) {
    const match = pathname.match(route.pattern);
    if (match) return { render: route.render, params: match.groups ?? {} };
  }
  return null;
}

async function renderCurrentPath() {
  const app = document.getElementById("app");
  const match = matchRoute(location.pathname);
  if (!match) {
    app.innerHTML = `<p class="not-found">找不到頁面</p>`;
    return;
  }
  await match.render(app, match.params);
}

/** 導覽到新頁面(會產生新的 history entry)。用於「真正換頁」的操作,如首頁 → 題庫首頁。 */
export function navigate(path) {
  history.pushState({}, "", path);
  renderCurrentPath();
}

export function startRouter() {
  window.addEventListener("popstate", renderCurrentPath);
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute("href"));
  });
  renderCurrentPath();
}
