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
import { quizPageTitle } from "../src/lib/pageTitle.js";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(scriptsDir, "..");
const distDir = path.join(rootDir, "dist");
const dataDir = path.join(rootDir, "src", "data");

// 正式網址已定案(2026-07-17,規格書 §5):Pages 專案 would-you-rather-tw 的免費子網域,
// 預設值即正式網址。仍保留可覆寫的環境變數 SITE_URL——日後購入自訂網域時只需在部署設定
// 填入新值即可,不需改程式碼。
const SITE_URL = (process.env.SITE_URL ?? "https://would-you-rather-tw.pages.dev").replace(/\/+$/, "");

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

/** 組一份完整 OG 靜態頁 HTML 並寫入 outDir/index.html(per-quiz 頁與稱號頁共用)。 */
function writeOgPage(outDir, { title, description, imageUrl, canonicalUrl }) {
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
    // Discord 只在頁面帶 twitter:card=summary_large_image 時才顯示全寬大圖,
    // 否則 og:image 被縮成右側小縮圖;LINE / FB 只看 og:* 標籤,不受影響。
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    ...assetTags,
  ];

  const html =
    `<!doctype html>\n<html lang="zh-Hant">\n  <head>\n    ${headTags.join("\n    ")}\n  </head>\n  ${bodyHtml}\n</html>\n`;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "index.html"), html, "utf-8");
}

let count = 0;
let titleCount = 0;
for (const { id } of manifest.quizzes) {
  const quiz = JSON.parse(readFileSync(path.join(dataDir, "quizzes", `${id}.json`), "utf-8"));

  // ogTitle/ogDescription 為選配欄位(開發設計方針.md > Phase 4 > OG 文案):有定稿
  // OG 文案的題庫直接整段套用(不再疊加「— Would You Rather」後綴,定稿文案本身已是
  // 完整標題);沒有這兩個欄位的題庫 fallback 回 Phase 3 既有公式,行為不變。
  // 標題組法抽至 src/lib/pageTitle.js,與 SPA 路由切換的 document.title 共用(2026-07-19)。
  writeOgPage(path.join(quizDir, id), {
    title: quizPageTitle(quiz),
    description: quiz.ogDescription ?? quiz.description,
    imageUrl: `${SITE_URL}${quiz.cover}`,
    canonicalUrl: `${SITE_URL}/quiz/${id}`,
  });
  count += 1;

  // 稱號 OG 靜態頁(規格書 §9 Phase 7):每題庫每稱號一頁 dist/quiz/<id>/r/<稱號id>/,
  // og:image 指向 generate-og-title-cards.mjs 產出的稱號卡圖;og:title 定稿格式
  // (mainstream 不帶「孤獨」字眼);og:description 用判詞。無 titles 的題庫自然跳過。
  for (const [titleId, t] of Object.entries(quiz.titles ?? {})) {
    const ogTitle =
      titleId === "mainstream"
        ? `我拿到稱號『${t.name}』|${quiz.title}`
        : `我拿到孤獨稱號『${t.name}』|${quiz.title}`;
    writeOgPage(path.join(quizDir, id, "r", titleId), {
      title: ogTitle,
      description: t.blurb,
      imageUrl: `${SITE_URL}/img/${id}/og-titles/${titleId}.webp`,
      canonicalUrl: `${SITE_URL}/quiz/${id}/r/${titleId}`,
    });
    titleCount += 1;
  }
}

console.log(
  `已產生 ${count} 個題庫的 OG 靜態頁面與 ${titleCount} 個稱號 OG 頁面於 ${quizDir}(SITE_URL=${SITE_URL})`
);
