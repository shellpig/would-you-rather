# Would You Rather — 你是哪一派？

**English** | [繁體中文](./README_zh-TW.md) | [简体中文](./README_zh-CN.md)

![Cloudflare](https://img.shields.io/badge/CLOUDFLARE-PAGES%20%7C%20WORKERS%20%7C%20D1-F38020?logo=cloudflare&logoColor=white)
![Vite](https://img.shields.io/badge/VITE-6.x-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/VANILLA-JAVASCRIPT-F7DF1E?logo=javascript&logoColor=black)
![Status](https://img.shields.io/badge/STATUS-LIVE-brightgreen)

> A Traditional-Chinese "Would You Rather" quiz site — pick one of two every round, watch the live site-wide ratio update instantly, and get a shareable result card at the end.

There are no accounts and no user-generated content. Every quiz is curated by the site itself; players just tap through and see how they compare to everyone else.

---

## ⚠️ Development Status

This is a **personal project, live and actively iterating**. The core flow (Phase 1–5) has shipped to production, and quiz content, share features, and result pages are still expanding. Data model, routes, and copy may still change between phases.

---

## Concept

Each quiz is a short series of binary "would you rather" questions. On every question the player picks one side and instantly sees the live ratio across all players so far — computed client-side from an opening snapshot plus their own vote, with zero perceived latency. No going back, no accounts, no user submissions.

After the last question, the player gets a **result card**: an identity label, their "loneliest pick" (the question where they were most in the minority), a match score against the crowd, a per-question summary, and — where the quiz defines them — a **loneliness title badge**. The card is built to be screenshotted and shared (Web Share API / copy link), and every quiz ships with OG preview cards so links look right on LINE, Threads, Facebook, and Instagram.

**Live site**: https://would-you-rather-tw.pages.dev

---

## Features

- **Binary choice flow**: one question at a time, two options, no undo.
- **Live ratio display**: opening snapshot + the player's own vote, computed instantly on the client — no waiting on a round trip per tap.
- **Result card**: identity label (4 tiers), loneliest question, match score, per-question summary, optional loneliness title badge (per-quiz, defined in quiz JSON).
- **Sharing**: Web Share API with a copy-link fallback, share text includes a result summary; "you might also like" cross-quiz recommendation card.
- **Result sharing page** *(Phase 7, in progress)*: a shareable link to a specific result, a read-only summary page, and static OG cards per title badge.
- **Reliable vote delivery**: a pending-vote queue with idempotent receipts, so a flaky network doesn't lose or double-count a vote.
- **Product analytics**: Cloudflare Web Analytics events for question-answered / quiz-completed / share flows.
- **Placeholder cards**: quizzes still in development show a non-clickable "coming soon" card on the homepage instead of a dead link.

---

## Tech Stack

- **Frontend**: Vanilla JS + Vite, static SPA, deployed to Cloudflare Pages
- **Backend**: Cloudflare Pages Functions — 3 APIs (`stats`, `vote`, `played-counts`)
- **Database**: Cloudflare D1 (single `stats` table)
- **Analytics**: Cloudflare Web Analytics
- **Protection**: WAF rate limiting (deferred to custom domain); Turnstile socket reserved but not wired in

---

## Quick Start

**Requirements**: Node.js + npm.

```bash
npm install         # install dependencies
npm run dev         # Vite dev server (HMR), http://localhost:5173
npm run dev:worker  # Pages Functions + local D1, port 8788
npm run build       # produce dist/ for Cloudflare Pages deploy
npm run preview     # preview the build output locally
npm test            # node:test, runs tests/**/*.test.js
npm run db:migrate  # apply local D1 migrations
npm run db:seed     # seed local/staging fake votes only — never against production
```

Full API + D1 local dev needs two terminals: `npm run dev:worker` (port 8788) and `npm run dev` (port 5173, Vite proxies `/api`). For a single-origin check closer to production: `npm run build` then `npx wrangler pages dev dist --port 8788`.

---

## Current Progress

| Phase | Content | Status |
|---|---|---|
| 1 | Frontend answer flow (mock stats) | ✅ Done, verifier-reviewed |
| 2 | Backend (Workers + D1) | ✅ Done, verifier-reviewed |
| 2.5 | Public stats reliability | ⏸️ Paused — conditional trigger plan (see spec §5.4) |
| 2.6 | Reliable vote delivery (pending queue + idempotent receipts) | ✅ Done, verifier-reviewed |
| 3 | Result card + sharing + WAE product events (incl. 3.5 loneliness title badges) | ✅ Done, verifier-reviewed |
| 4 | Quiz content (site decision: scoped down to one quiz + placeholder cards) | ✅ Done, verifier-reviewed |
| 5 | Launch (deploy / domain / rate limit / real-device test) | 🔶 Live at `would-you-rather-tw.pages.dev` (2026-07-17); remaining: enable Web Analytics, real-device share test; rate limit deferred to custom domain |
| 6 | Quiz expansion ×2 (food, entertainment — post-launch) | 🔶 Food quiz live in production (2026-07-19); entertainment quiz still pending discussion |
| 7 | Title sharing page (result link + title OG cards, fully static) | 🔶 Started 2026-07-20, in progress |

See [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) for the up-to-date single source of truth.

---

## Directory Structure (condensed)

```text
.
├── index.html
├── src/
│   ├── main.js / router.js / routes.js   # SPA entry & routing
│   ├── pages/            # home, quizFlow
│   ├── lib/               # ratio, statsClient, voteQueue, share, resultSummary, recommend, ...
│   ├── data/               # manifest.json, quizzes/, generated legal-list
│   └── styles/
├── functions/api/         # Pages Functions: stats/, vote.js, played-counts.js, event.js
├── migrations/             # D1 schema migrations
├── scripts/                 # seed-votes, generate-og-pages, generate-legal-list, ...
├── public/                  # static assets, _redirects, img/
├── assets/generated/        # AI-generated illustrations per quiz
├── tests/                   # node:test automated tests
├── subdocs/                 # per-quiz content docs, ops guides
└── 舊文件/                  # historical archive (ignored)
```

---

## Documentation Guide

| Document | Purpose |
|---|---|
| [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) | **Entry point for a new session**; current progress, phase table, doc index |
| [`網站規格書.md`](./網站規格書.md) | System spec, per-phase acceptance intent (what must be true), phase planning (§9) |
| [`開發設計方針.md`](./開發設計方針.md) | Implementation contracts: file structure, API details, data contracts, decisions (expanded per phase) |
| [`測試指南.md`](./測試指南.md) | Test environment commands, manual acceptance checklists per phase |
| [`subdocs/操作說明/驗證後已知問題.md`](./subdocs/操作說明/驗證後已知問題.md) | Known issues and accepted boundary decisions |
| [`插圖風格指引.md`](./插圖風格指引.md) | Illustration style guide — required reading before any asset-generation task |
| `subdocs/題庫/<id>.md` | Per-quiz content docs: finalized questions, illustration prompts, seed-vote distribution |

---

## Validation

```bash
npm test
```

Automated tests (`node:test`) cover ratio/match-score computation, localStorage rules, vote queueing, and Worker APIs; manual acceptance walkthroughs follow the checklists in [`測試指南.md`](./測試指南.md). See [`subdocs/操作說明/驗證後已知問題.md`](./subdocs/操作說明/驗證後已知問題.md) for verifier review history and known issues.

---

## License

This is a personal project with no formal license attached yet (all rights reserved). For development and internal testing only.
