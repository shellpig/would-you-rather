# Would You Rather — 你是哪一派？

[English](./README.md) | [繁體中文](./README_zh-TW.md) | **简体中文**

![Cloudflare](https://img.shields.io/badge/CLOUDFLARE-PAGES%20%7C%20WORKERS%20%7C%20D1-F38020?logo=cloudflare&logoColor=white)
![Vite](https://img.shields.io/badge/VITE-6.x-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/VANILLA-JAVASCRIPT-F7DF1E?logo=javascript&logoColor=black)
![Status](https://img.shields.io/badge/STATUS-LIVE-brightgreen)

> 一个繁体中文「二选一（Would You Rather）」趣味测验网站——逐题二选一，实时看到全站选择比例，答完拿到一张可分享的总结卡。

无账号、无 UGC。题库全部由站方自定，玩家只需一路点下去，看看自己跟大家比起来算哪一派。

---

## ⚠️ 开发状态

本项目为**已上线、持续迭代中的个人作品**。核心流程（Phase 1–5）已部署到生产环境，题库内容、分享功能与结果页仍在扩充；数据结构、路由与文案在不同 Phase 之间仍可能调整。

---

## 项目概念

每个题库是一系列简短的二选一问题。每题点选其中一边后，立刻看到当前全站的选择比例——由「开场快照 + 自己这一票」在前端实时计算得出，感觉不到延迟。不能返回上一题、无账号、无用户投稿。

答完最后一题后，玩家会拿到一张**总结卡**：身份标签、「最孤独的一题」（自己选最少数那一边的题目）、与全站的匹配度、逐题摘要，以及（若题库有设定）专属的**孤独称号勋章**。总结卡设计成适合手机截图分享（Web Share API / 复制链接），每个题库都配有 OG 预览卡，确保在 LINE、Threads、Facebook、Instagram 分享时预览正常显示。

**正式网站**：https://would-you-rather-tw.pages.dev

---

## 功能特色

- **二选一答题流程**：一次一题、两个选项，不可返回上一题。
- **实时比例显示**：开场快照 + 自己一票，前端实时计算，无需每次点击都等 API 往返。
- **总结卡**：四档身份标签、最孤独的一题、匹配度、逐题摘要，选配孤独称号勋章（题库 JSON 自定）。
- **分享**：Web Share API，不支持时降级为复制链接，分享文字带结果摘要；「你可能也想玩」跨题库导流卡。
- **称号分享页**（*Phase 7，实现中*）：结果链接可分享、只读总结页、每张称号的静态 OG 卡。
- **可靠送票**：待发送队列 + 幂等回执，网络不稳定时不漏票、不重复计票。
- **产品分析**：Cloudflare Web Analytics 事件，涵盖答题 / 完成测验 / 分享等行为。
- **占位卡**：仍在开发中的题库在首页显示不可点的「建设中」卡片，而非死链接。

---

## 技术栈

- **前端**：Vanilla JS + Vite 静态 SPA，部署于 Cloudflare Pages
- **后端**：Cloudflare Pages Functions（3 个 API：`stats` / `vote` / `played-counts`）
- **数据库**：Cloudflare D1（单一 `stats` 表）
- **分析**：Cloudflare Web Analytics
- **防护**：WAF 限流（顺延至自定义域名）；Turnstile 预留接口，尚未接入

---

## Quick Start

**前置要求**：Node.js + npm。

```bash
npm install         # 安装依赖
npm run dev         # Vite 开发服务器（HMR），http://localhost:5173
npm run dev:worker  # Pages Functions + 本地 D1，8788 端口
npm run build       # 生成 dist/（Cloudflare Pages 部署用）
npm run preview     # 本地预览构建产物
npm test            # node:test，运行 tests/**/*.test.js
npm run db:migrate  # 应用本地 D1 迁移
npm run db:seed     # 仅供 local / staging 假数据，禁止对生产环境执行
```

完整 API + D1 本地开发需要两个终端：`npm run dev:worker`（8788 端口）与 `npm run dev`（5173 端口，Vite 代理 `/api`）。想贴近生产环境的单一 origin 验证：先 `npm run build`，再运行 `npx wrangler pages dev dist --port 8788`。

---

## 当前进度

| Phase | 内容 | 状态 |
|---|---|---|
| 1 | 前端答题流程（mock 统计） | ✅ 完成并通过验证复核 |
| 2 | 后端（Workers + D1） | ✅ 完成并通过验证复核 |
| 2.5 | 公开统计可靠性 | ⏸️ 暂缓（条件触发预案，见规格书 §5.4） |
| 2.6 | 可靠送票（待发送队列 + 幂等回执） | ✅ 完成并通过验证复核 |
| 3 | 总结卡 + 分享 + WAE 产品事件（含 3.5 孤独称号勋章） | ✅ 完成并通过验证复核 |
| 4 | 题库内容（站方决策缩减为单题库 + 占位卡） | ✅ 完成并通过验证复核 |
| 5 | 上线（部署 / 域名 / 限流 / 实机测试） | 🔶 已上线 `would-you-rather-tw.pages.dev`（2026-07-17）；剩 Web Analytics 开通、实机分享测试；限流顺延至自定义域名 |
| 6 | 题库扩充 ×2（美食、娱乐；上线后） | 🔶 美食题库已上线生产环境（2026-07-19）；娱乐题库待讨论 |
| 7 | 称号分享页（结果链接 + 称号 OG 卡，全静态） | 🔶 2026-07-20 立项，实现中 |

最新进度以 [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) 为单一事实来源。

---

## 目录结构（精简）

```text
.
├── index.html
├── src/
│   ├── main.js / router.js / routes.js   # SPA 入口与路由
│   ├── pages/            # home、quizFlow
│   ├── lib/               # ratio、statsClient、voteQueue、share、resultSummary、recommend、…
│   ├── data/               # manifest.json、quizzes/、构建产物 legal-list
│   └── styles/
├── functions/api/         # Pages Functions：stats/、vote.js、played-counts.js、event.js
├── migrations/             # D1 schema 迁移
├── scripts/                 # seed-votes、generate-og-pages、generate-legal-list、…
├── public/                  # 静态资源、_redirects、img/
├── assets/generated/        # 各题库 AI 生成插图
├── tests/                   # node:test 自动化测试
├── subdocs/                 # 各题库内容文档、操作说明
└── 舊文件/                  # 历史归档（忽略）
```

---

## 文档导览

| 文档 | 用途 |
|---|---|
| [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) | **新 session 入口**；当前进度、Phase 进度表、文档索引 |
| [`網站規格書.md`](./網站規格書.md) | 系统规格、各节验收意图（what must be true）、Phase 规划（§9） |
| [`開發設計方針.md`](./開發設計方針.md) | 实现契约：文件结构、API 细节、数据契约、实现决策（逐 Phase 展开） |
| [`測試指南.md`](./測試指南.md) | 测试环境命令、各 Phase 手动验收清单 |
| [`subdocs/操作說明/驗證後已知問題.md`](./subdocs/操作說明/驗證後已知問題.md) | 待修清单与已接受的边界决定 |
| [`插圖風格指引.md`](./插圖風格指引.md) | 生图风格指引——任何生图 / 素材任务必读 |
| `subdocs/題庫/<id>.md` | 各题库内容文档：题目定稿、插图 prompt、种子票分布 |

---

## 验证

```bash
npm test
```

自动化测试（`node:test`）涵盖比例 / 匹配度计算、localStorage 规则、送票队列与 Worker API；手动验收走查依 [`測試指南.md`](./測試指南.md) 清单进行。验证复核历史与已知问题见 [`subdocs/操作說明/驗證後已知問題.md`](./subdocs/操作說明/驗證後已知問題.md)。

---

## 授权

本项目为个人作品，目前尚未附正式授权条款（保留所有权利）。仅供开发与内部测试使用。
