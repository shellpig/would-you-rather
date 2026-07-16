// 為每個題庫產生獨立的靜態 head(og:title / og:description / og:image / canonical,
// 規格書 §2.4、§9 Phase 3;開發設計方針.md > Phase 3)。
//
// 為什麼需要獨立的 build 步驟,而不是在 quizFlow.js 用 JS 動態改 <head>:分享平台的爬蟲
// (LINE / Threads / FB 等)與測試指南 Phase 3 #13 指定的「view-source 檢查」多半不執行
// JS,只看伺服器回的原始 HTML。整個網站是同一個 `dist/index.html` 的 SPA(見
// `public/_redirects` 的 `/* /index.html 200`),原本每個 `/quiz/:slug` 拿到的都是同一份
// 泛用 head,無法放入 per-quiz 的 OG 內容。
//
// 做法:vite build 產出 dist/index.html 之後(postbuild hook),讀出它的 <body>(含 build
// 後帶 hash 的 script/css 標籤)原封不動複用,只替換 <head> 為該題庫專屬的 meta,寫成
// `dist/quiz/<id>/index.html`。Cloudflare Pages(以及本機 `wrangler pages dev dist` 的
// 模擬行為一致,已實測)對靜態資產的比對優先於 `_redirects` 規則,所以請求 `/quiz/demo`
// 時會直接吃到這份客製 head,不需要動 `public/_redirects`;真人使用者點進去載入的仍是
// 同一份 SPA bundle,答題流程不受影響。
//
// 執行時機:`npm run build` 的 postbuild hook(vite build 之後自動執行)。

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(scriptsDir, "..");
const distDir = path.join(rootDir, "dist");
const dataDir = path.join(rootDir, "src", "data");

// 網站正式網域尚未拍板(見 PROJECT_BRIEF.md > 待決事項)。用可覆寫的環境變數 SITE_URL,
// Phase 5 網域定案後只需在部署設定填入正式值即可,不需改程式碼;本機/未設定時用格式正確
// 的佔位網域,og:image / canonical 仍是合法絕對網址,只是網域待換(Phase 5 真網域預覽
// 實測時一併確認)。
const SITE_URL = (process.env.SITE_URL ?? "https://would-you-rather.pages.dev").replace(/\/+$/, "");

const indexHtmlPath = path.join(distDir, "index.html");
if (!existsSync(indexHtmlPath)) {
  console.error("找不到 dist/index.html,請先執行 vite build 再跑這支 script。");
  process.exit(1);
}
const baseHtml = readFileSync(indexHtmlPath, "utf-8");

const bodyMatch = baseHtml.match(/<body>[\s\S]*<\/body>/);
const headMatch = baseHtml.match(/<head>([\s\S]*)<\/head>/);
if (!bodyMatch || !headMatch) {
  console.error("dist/index.html 結構不符預期(缺 <head> 或 <body>),中止產生 OG 頁面。");
  process.exit(1);
}
const bodyHtml = bodyMatch[0];

// 只保留 build 後的 <script>/<link> 標籤(帶 hash 的 bundle 與樣式表),原本的
// <meta charset>/<meta viewport>/<title> 由下面針對每個題庫重新產生。
const assetTags = headMatch[1]
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("<script") || line.startsWith("<link"));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const manifest = JSON.parse(readFileSync(path.join(dataDir, "manifest.json"), "utf-8"));

const quizDir = path.join(distDir, "quiz");
rmSync(quizDir, { recursive: true, force: true }); // 每次重新產生,避免題庫下架後殘留舊頁面

let count = 0;
for (const { id } of manifest.quizzes) {
  const quiz = JSON.parse(readFileSync(path.join(dataDir, "quizzes", `${id}.json`), "utf-8"));

  const title = `${quiz.title} — Would You Rather`;
  const description = quiz.description;
  const imageUrl = `${SITE_URL}${quiz.cover}`;
  const canonicalUrl = `${SITE_URL}/quiz/${id}`;

  const headTags = [
    `<meta charset="UTF-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    ...assetTags,
  ];

  const html =
    `<!doctype html>\n<html lang="zh-Hant">\n  <head>\n    ${headTags.join("\n    ")}\n  </head>\n  ${bodyHtml}\n</html>\n`;

  const outDir = path.join(quizDir, id);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "index.html"), html, "utf-8");
  count += 1;
}

console.log(`已產生 ${count} 個題庫的 OG 靜態頁面於 ${quizDir}(SITE_URL=${SITE_URL})`);
