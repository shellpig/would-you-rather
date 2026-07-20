// 路由 pattern 獨立成檔,供 src/main.js 註冊路由與 tests/router.test.js 直接引用同一份
// regex——避免測試另外複製一份可能與正式路由漂移的副本(守護 2026-07-17 code review
// 修正的尾斜線 bug:舊 pattern 不吃尾斜線,見 開發設計方針.md > 尾斜線契約)。

export const HOME_ROUTE = /^\/$/;

// 尾斜線需可選:Cloudflare Pages 對 dist/quiz/<id>/index.html 靜態資產一律 308 轉址到
// 帶尾斜線的 URL,外部分享連結/canonical/搜尋進站都會落在 /quiz/<id>/。slug 用
// [^/]+ 排除斜線,故尾斜線不會被吃進 group;不支援 /quiz/<id>// 這種雙斜線。
// SPA 內部 navigate() 產生的無尾斜線 URL 一樣能匹配,不受影響。
export const QUIZ_ROUTE = /^\/quiz\/(?<slug>[^/]+)\/?$/;

// 結果分享頁(規格書 §9 Phase 7):/quiz/<id>/r/<稱號id>,尾斜線契約同 QUIZ_ROUTE
// (Cloudflare Pages 對 dist/quiz/<id>/r/<稱號id>/index.html 一樣 308 轉址到帶尾斜線)。
export const RESULT_ROUTE = /^\/quiz\/(?<slug>[^/]+)\/r\/(?<titleId>[^/]+)\/?$/;
