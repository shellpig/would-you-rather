// 分頁標題單一事實來源(2026-07-19):SPA 路由切換時的 document.title 與 postbuild
// OG 靜態頁的 <title>(scripts/generate-og-pages.mjs)共用同一組法,避免兩處各自
// 複製字串後漂移(同 src/routes.js 供測試引用同一份 regex 的作法)。

/** index.html 的 <title>;入口頁與非題庫路由使用(字樣以 index.html 為準)。 */
export const DEFAULT_PAGE_TITLE = "你是哪一派?— 二選一測驗";

/**
 * 題庫相關頁(/quiz/:id 的題庫首頁/答題/總結卡)標題:有定稿 ogTitle 直接整段套用,
 * 沒有的題庫 fallback 回 Phase 3 公式(語意說明見 generate-og-pages.mjs 呼叫處註解)。
 */
export function quizPageTitle(quiz) {
  return quiz.ogTitle ?? `${quiz.title} — 你是哪一派?`;
}
