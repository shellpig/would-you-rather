# Would You Rather — 你是哪一派？

[English](./README.md) | **繁體中文** | [简体中文](./README_zh-CN.md)

![Cloudflare](https://img.shields.io/badge/CLOUDFLARE-PAGES%20%7C%20WORKERS%20%7C%20D1-F38020?logo=cloudflare&logoColor=white)
![Vite](https://img.shields.io/badge/VITE-6.x-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/VANILLA-JAVASCRIPT-F7DF1E?logo=javascript&logoColor=black)
![Status](https://img.shields.io/badge/STATUS-LIVE-brightgreen)

> 一個繁體中文「二選一(Would You Rather)」趣味測驗網站——逐題二選一，即時看到全站選擇比例，答完拿到一張可分享的總結卡。

無帳號、無 UGC。題庫全由站方自訂，玩家只要一路點下去，看看自己跟大家比起來算哪一派。

---

## ⚠️ 開發狀態

本專案為**已上線、持續迭代中的個人作品**。核心流程（Phase 1–5）已部署 production，題庫內容、分享功能與結果頁仍在擴充；資料結構、路由與文案在不同 Phase 間仍可能調整。

---

## 專案概念

每個題庫是一系列簡短的二選一問題。每題點選其中一邊後，立刻看到目前全站的選擇比例——由「開場快照 + 自己這一票」在前端即時算出，感覺不到延遲。不能回上一題、無帳號、無使用者投稿。

答完最後一題後，玩家會拿到一張**總結卡**：身份標籤、「最孤獨的一題」（自己選最少數那一邊的題目）、與全站的匹配度、逐題摘要，以及（若題庫有設定）專屬的**孤獨稱號勳章**。總結卡設計成適合手機截圖分享（Web Share API / 複製連結），每個題庫都配有 OG 預覽卡，確保在 LINE、Threads、Facebook、Instagram 分享時預覽正常顯示。

**正式網站**：https://would-you-rather-tw.pages.dev

---

## 功能特色

- **二選一答題流程**：一次一題、兩個選項，不可回上一題。
- **即時比例顯示**：開場快照 + 自己一票，前端即時計算，不需每次點擊都等 API 往返。
- **總結卡**：四檔身份標籤、最孤獨的一題、匹配度、逐題摘要，選配孤獨稱號勳章（題庫 JSON 自訂）。
- **分享**：Web Share API，不支援時降級為複製連結，分享文字帶結果摘要；「你可能也想玩」跨題庫導流卡。
- **稱號分享頁**（*Phase 7，實作中*）：結果連結可分享、唯讀總結頁、每張稱號的靜態 OG 卡。
- **可靠送票**：pending queue + 冪等收據，網路不穩時不漏票、不重複計票。
- **產品分析**：Cloudflare Web Analytics 事件，涵蓋答題 / 完成測驗 / 分享等行為。
- **佔位卡**：仍在開發中的題庫在首頁顯示不可點的「建設中」卡片，而非死連結。

---

## 技術棧

- **前端**：Vanilla JS + Vite 靜態 SPA，部署於 Cloudflare Pages
- **後端**：Cloudflare Pages Functions（3 支 API：`stats` / `vote` / `played-counts`）
- **資料庫**：Cloudflare D1（單一 `stats` 表）
- **分析**：Cloudflare Web Analytics
- **防護**：WAF rate limit（順延至自訂網域）；Turnstile 留插座、尚未接線

---

## Quick Start

**前置要求**：Node.js + npm。

```bash
npm install         # 安裝依賴
npm run dev         # Vite 開發伺服器（HMR），http://localhost:5173
npm run dev:worker  # Pages Functions + 本機 D1，8788 埠
npm run build       # 產出 dist/（Cloudflare Pages 部署用）
npm run preview     # 本機預覽 build 產物
npm test            # node:test，執行 tests/**/*.test.js
npm run db:migrate  # 套用本機 D1 migration
npm run db:seed     # 僅供 local / staging 假資料，禁止對 production 執行
```

完整 API + D1 本機開發需要兩個終端機：`npm run dev:worker`（8788 埠）與 `npm run dev`（5173 埠，Vite proxy `/api`）。想貼近 production 的單一 origin 驗證：先 `npm run build`，再執行 `npx wrangler pages dev dist --port 8788`。

---

## 目前進度

| Phase | 內容 | 狀態 |
|---|---|---|
| 1 | 前端答題流程（mock 統計） | ✅ 完成並通過 verifier 覆核 |
| 2 | 後端（Workers + D1） | ✅ 完成並通過 verifier 覆核 |
| 2.5 | 公開統計可靠性 | ⏸️ 暫緩（條件觸發預案，見規格書 §5.4） |
| 2.6 | 可靠送票（pending queue + 冪等收據） | ✅ 完成並通過 verifier 覆核 |
| 3 | 總結卡 + 分享 + WAE 產品事件（含 3.5 孤獨稱號勳章） | ✅ 完成並通過 verifier 覆核 |
| 4 | 題庫內容（站方決策縮減為單庫 + 佔位卡） | ✅ 完成並通過 verifier 覆核 |
| 5 | 上線（部署 / 網域 / rate limit / 實測） | 🔶 已上線 `would-you-rather-tw.pages.dev`（2026-07-17）；剩 Web Analytics 開通、真機分享實測；rate limit 順延至自訂網域 |
| 6 | 題庫擴充 ×2（美食、娛樂；上線後） | 🔶 美食庫已上線 production（2026-07-19）；娛樂庫待討論 |
| 7 | 稱號分享頁（結果連結 + 稱號 OG 卡，全靜態） | 🔶 2026-07-20 立項，實作中 |

最新進度以 [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) 為單一事實來源。

---

## 目錄結構（精簡）

```text
.
├── index.html
├── src/
│   ├── main.js / router.js / routes.js   # SPA 進入點與路由
│   ├── pages/            # home、quizFlow
│   ├── lib/               # ratio、statsClient、voteQueue、share、resultSummary、recommend、…
│   ├── data/               # manifest.json、quizzes/、build 產物 legal-list
│   └── styles/
├── functions/api/         # Pages Functions：stats/、vote.js、played-counts.js、event.js
├── migrations/             # D1 schema migration
├── scripts/                 # seed-votes、generate-og-pages、generate-legal-list、…
├── public/                  # 靜態資源、_redirects、img/
├── assets/generated/        # 各題庫 AI 生成插圖
├── tests/                   # node:test 自動化測試
├── subdocs/                 # 各題庫內容文件、操作說明
└── 舊文件/                  # 歷史 archive（忽略）
```

---

## 文件導覽

| 文件 | 用途 |
|---|---|
| [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) | **新 session 入口**；當前進度、Phase 進度表、文件索引 |
| [`網站規格書.md`](./網站規格書.md) | 系統規格、各節驗收意圖（what must be true）、Phase 規劃（§9） |
| [`開發設計方針.md`](./開發設計方針.md) | 實作契約：檔案結構、API 細節、資料契約、實作決策（逐 Phase 展開） |
| [`測試指南.md`](./測試指南.md) | 測試環境命令、各 Phase 手動驗收清單 |
| [`subdocs/操作說明/驗證後已知問題.md`](./subdocs/操作說明/驗證後已知問題.md) | 待修清單與已接受的邊界決定 |
| [`插圖風格指引.md`](./插圖風格指引.md) | 生圖風格指引——任何生圖 / 素材任務必讀 |
| `subdocs/題庫/<id>.md` | 各題庫內容文件：題目定稿、插圖 prompt、種子票分佈 |

---

## 驗證

```bash
npm test
```

自動化測試（`node:test`）涵蓋比例 / 匹配度計算、localStorage 規則、送票佇列與 Worker API；手動驗收走查依 [`測試指南.md`](./測試指南.md) 清單進行。verifier 覆核歷史與已知問題見 [`subdocs/操作說明/驗證後已知問題.md`](./subdocs/操作說明/驗證後已知問題.md)。

---

## 授權

本專案為個人作品，目前尚未附正式授權條款（保留所有權利）。僅供開發與內部測試使用。
