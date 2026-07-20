// 稱號 OG 卡圖產生器(規格書 §9 Phase 7):每題庫 × 16 稱號各產一張 1200×630 WebP
// (目標 ≤80KB),輸出至 public/img/<題庫id>/og-titles/<稱號id>.webp。
//
// 版面仿現網站總結卡的稱號框(色票取自 src/styles/main.css):米白底(--color-bg
// #faf7f2)、珊瑚紅(--color-primary #ff6b5e)實線框 + 內圈虛線、框上緣置中「孤獨稱號」
// 標籤(現網站 CSS ::after 對 mainstream 也一律顯示「孤獨稱號」,照現狀沿用)、左側
// 圓形徽章(public/img/<id>/titles/<稱號id>.webp,雙環框仿 .result-badge__img 的
// box-shadow)、右側稱號名(大字)+ 判詞,下方兩行定稿文案(2026-07-20 站方拍板,
// 一字不可改):
// - 一般稱號:「你的孤獨戰場:<A 短標籤> vs <B 短標籤>」+「只有少數人和你一樣」
// - mainstream:「N 題,場場站在多數派」(N = 題庫題數)+「大家都和你同一掛」
// 短標籤表:scripts/og-cards/<題庫id>.json(值取自題庫文件「種子票分佈」A/B 簡稱欄)。
//
// 生成方式:sharp + SVG 合成——文字與框線用 SVG 交給 librsvg 渲染(中文字型走系統
// fontconfig,本機 Windows 以 Microsoft JhengHei 出字,已驗證繁體無豆腐字),徽章圖
// 先縮至 300px 圓形裁切再 composite。長文字自動縮字級(estimateWidth/fitFontSize),
// 文案不刪改。全程純腳本合成、無一次性 raw 檔,重跑即可重生(新題庫加 titles +
// 短標籤表後直接重用)。
//
// 用法:node scripts/generate-og-title-cards.mjs

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(scriptsDir, "..");
const dataDir = path.join(rootDir, "src", "data");
const publicDir = path.join(rootDir, "public");

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_BYTES = 80 * 1024;

// 色票(src/styles/main.css :root 與 .result-badge 系列)。
const COLOR_BG = "#faf7f2";
const COLOR_PRIMARY = "#ff6b5e";
const COLOR_TEXT = "#2b2622";
const COLOR_MUTED = "#8a8078";
const COLOR_RING_INNER = "#fce4dc";
const FONT = "Microsoft JhengHei, PingFang TC, Noto Sans TC, sans-serif";

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 估寬:CJK/全形字寬 ≈ 字級,ASCII ≈ 0.55 倍(librsvg 實際渲染的保守近似)。 */
function estimateWidth(text, fontSize) {
  let units = 0;
  for (const ch of text) {
    units += ch.codePointAt(0) > 0x2e7f ? 1 : 0.55;
  }
  return units * fontSize;
}

/** 長文字縮字級:由 startSize 逐級縮到能塞進 maxWidth 為止(下限 minSize)。 */
function fitFontSize(text, maxWidth, startSize, minSize) {
  let size = startSize;
  while (size > minSize && estimateWidth(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

/** 行首禁則:收尾標點不可落在行首(避免斷行後行首懸掛「。」之類)。 */
const CLOSING_PUNCT = new Set(["。", ",", "、", "!", "?", ";", ":", "」", "』", ")", "%"]);

/** 判詞換行:依估寬切成至多 maxLines 行(定稿判詞最長 21 字,兩行必然足夠)。
 *  收尾標點遇到換行點時直接留在當行行尾(微幅超寬,版面留白吃得下),不落行首。 */
function wrapText(text, fontSize, maxWidth, maxLines) {
  const lines = [];
  let current = "";
  for (const ch of text) {
    if (
      estimateWidth(current + ch, fontSize) > maxWidth &&
      current !== "" &&
      !CLOSING_PUNCT.has(ch)
    ) {
      lines.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current !== "") lines.push(current);
  if (lines.length > maxLines) {
    throw new Error(`文字過長,${maxLines} 行放不下(請縮字級或調版面):${text}`);
  }
  return lines;
}

/** 右欄文字區(徽章右側)。 */
const TEXT_X = 468;
const TEXT_MAX_WIDTH = 1090 - TEXT_X;

function buildCardSvg({ titleName, blurb, line1, line2 }) {
  // 稱號名:68px 起跳,過長縮級。
  const nameSize = fitFontSize(titleName, TEXT_MAX_WIDTH, 68, 40);
  // 判詞:30px,至多兩行。
  const blurbLines = wrapText(blurb, 30, TEXT_MAX_WIDTH, 2);
  // 兩行定稿文案:33px / 30px 起跳,過長縮級(文案不可刪改,只縮字級)。
  const line1Size = fitFontSize(line1, TEXT_MAX_WIDTH, 33, 20);
  const line2Size = fitFontSize(line2, TEXT_MAX_WIDTH, 30, 20);

  const blurbSvg = blurbLines
    .map(
      (line, i) =>
        `<text x="${TEXT_X}" y="${288 + i * 44}" font-family="${FONT}" font-size="30" fill="${COLOR_MUTED}">${escapeXml(line)}</text>`
    )
    .join("\n  ");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="frameGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff4f0" />
      <stop offset="0.65" stop-color="#fffdfc" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLOR_BG}" />
  <!-- 稱號框:實線外框 + 內圈虛線(仿 .result-badge 與其 ::before) -->
  <rect x="56" y="84" width="1088" height="478" rx="30" fill="url(#frameGrad)" stroke="${COLOR_PRIMARY}" stroke-width="5" />
  <rect x="70" y="98" width="1060" height="450" rx="20" fill="none" stroke="rgba(255,107,94,0.4)" stroke-width="2.5" stroke-dasharray="10 8" />
  <!-- 「孤獨稱號」標籤(仿 .result-badge::after;mainstream 現網站同樣顯示此字樣) -->
  <rect x="490" y="56" width="220" height="56" rx="28" fill="${COLOR_PRIMARY}" />
  <text x="600" y="95" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffffff" letter-spacing="4">孤獨稱號</text>
  <!-- 徽章雙環框(仿 .result-badge__img 的 box-shadow:內細淺色環 + 外粗珊瑚紅環) -->
  <circle cx="256" cy="323" r="150" fill="#ffffff" />
  <circle cx="256" cy="323" r="153" fill="none" stroke="${COLOR_RING_INNER}" stroke-width="6" />
  <circle cx="256" cy="323" r="161" fill="none" stroke="${COLOR_PRIMARY}" stroke-width="11" />
  <!-- 右欄:稱號名(大字)+ 判詞 -->
  <text x="${TEXT_X}" y="228" font-family="${FONT}" font-size="${nameSize}" font-weight="700" fill="${COLOR_TEXT}">${escapeXml(titleName)}</text>
  ${blurbSvg}
  <!-- 兩行定稿文案 -->
  <text x="${TEXT_X}" y="452" font-family="${FONT}" font-size="${line1Size}" font-weight="700" fill="${COLOR_TEXT}">${escapeXml(line1)}</text>
  <text x="${TEXT_X}" y="510" font-family="${FONT}" font-size="${line2Size}" font-weight="700" fill="${COLOR_PRIMARY}">${escapeXml(line2)}</text>
</svg>`);
}

/** 徽章圖:縮至 300px 後圓形裁切(卡圖不用生圖自帶的方框,與網站呈現一致)。 */
async function circularBadge(badgePath) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><circle cx="150" cy="150" r="150" fill="#fff"/></svg>`
  );
  return sharp(badgePath)
    .resize(300, 300)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function renderCard({ svg, badgePng, outPath }) {
  const base = sharp(svg).composite([{ input: badgePng, left: 106, top: 173 }]);
  // 目標 ≤80KB:由高品質往下試,取第一個達標的品質(插畫 + 素面底通常 q80 即過)。
  for (const quality of [82, 72, 62, 50]) {
    const buf = await base.clone().webp({ quality }).toBuffer();
    if (buf.length <= MAX_BYTES) {
      await sharp(buf).toFile(outPath);
      return buf.length;
    }
  }
  throw new Error(`壓不到 ${MAX_BYTES} bytes:${outPath}`);
}

const manifest = JSON.parse(readFileSync(path.join(dataDir, "manifest.json"), "utf-8"));
let count = 0;

for (const { id } of manifest.quizzes) {
  const quiz = JSON.parse(readFileSync(path.join(dataDir, "quizzes", `${id}.json`), "utf-8"));
  if (!quiz.titles) continue; // 無稱號的題庫(如早期 demo)不產卡。

  const labelsPath = path.join(scriptsDir, "og-cards", `${id}.json`);
  if (!existsSync(labelsPath)) {
    throw new Error(`缺少短標籤表 scripts/og-cards/${id}.json(有 titles 的題庫必備)`);
  }
  const labels = JSON.parse(readFileSync(labelsPath, "utf-8"));

  const outDir = path.join(publicDir, "img", id, "og-titles");
  mkdirSync(outDir, { recursive: true });

  for (const [titleId, title] of Object.entries(quiz.titles)) {
    const isMainstream = titleId === "mainstream";
    if (!isMainstream && !labels[titleId]) {
      throw new Error(`短標籤表 scripts/og-cards/${id}.json 缺 ${titleId}`);
    }
    const line1 = isMainstream
      ? `${quiz.questions.length} 題,場場站在多數派`
      : `你的孤獨戰場:${labels[titleId].a} vs ${labels[titleId].b}`;
    const line2 = isMainstream ? "大家都和你同一掛" : "只有少數人和你一樣";

    const badgePath = path.join(publicDir, "img", id, "titles", `${titleId}.webp`);
    if (!existsSync(badgePath)) {
      throw new Error(`缺徽章圖 ${badgePath}`);
    }

    const svg = buildCardSvg({ titleName: title.name, blurb: title.blurb, line1, line2 });
    const badgePng = await circularBadge(badgePath);
    const outPath = path.join(outDir, `${titleId}.webp`);
    const bytes = await renderCard({ svg, badgePng, outPath });
    console.log(`${id}/og-titles/${titleId}.webp — ${(bytes / 1024).toFixed(1)}KB`);
    count += 1;
  }
}

console.log(`共產生 ${count} 張稱號 OG 卡圖`);
