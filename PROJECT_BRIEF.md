# would-you-rather 專案簡報

本文件供新 session 快速了解專案全貌,減少每次重讀全部規格文件的成本。需要深入細節時,按下方文件索引讀對應規格。

最後更新:2026-07-16

> **當前進度**:Phase 2(後端 Workers + D1)實作完成,自我驗收依 `測試指南.md` Phase 2 清單 13 條走查(自動化 9 條 + 手動/瀏覽器實測 4 條)全數通過。後端載體:Cloudflare Pages Functions(見 `開發設計方針.md > Phase 2`)。待 verifier 覆核。Phase 1 前端答題流程(mock 統計)先前已完成、自我驗收通過。

---

## 專案概述

繁體中文「二選一(Would You Rather)」趣味測驗網站。使用者從題庫逐題二選一,點選後即時看到全站選擇比例(開場快照 + 自己一票,前端計算零延遲),答完產生適合手機截圖的總結卡並分享題庫首頁連結。題庫全由站方自訂,無 UGC、無帳號。

- **傳播命脈**:OG 預覽卡(LINE / Threads / FB / IG 分享)。
- **防重複**:localStorage 到題的粒度,降噪而非防作弊。
- **明確排除**:UGC、回上一題、帳號、IP/指紋防灌票、總結卡插圖。

## 技術棧

| 層 | 選型 |
|---|---|
| 前端 | 靜態網站 @ Cloudflare Pages(框架未定,輕量為準) |
| 後端 | Cloudflare Workers(兩支 API) |
| 資料庫 | Cloudflare D1(一張 stats 表) |
| 分析 | Cloudflare Web Analytics |
| 防護 | Cloudflare WAF rate limit |

## Phase 進度

| Phase | 內容 | 狀態 |
|---|---|---|
| 1 | 前端答題流程(mock 統計) | ✅ 實作完成,待 verifier 覆核 |
| 2 | 後端(Workers + D1) | ✅ 實作完成,待 verifier 覆核 |
| 3 | 總結卡 + 分享 | ⬜ |
| 4 | 題庫內容 ×3(逐庫子階段) | ⬜ |
| 5 | 上線(部署 / 網域 / rate limit / 實測) | ⬜ |

Flag off 待開(不排 Phase):分類 chips、點選後 2 秒自動下一題。

## 文件索引

| 文件 | 內容 | 角色歸屬 |
|---|---|---|
| `AGENTS.md` | 開場讀檔順序、查閱與歸檔規則、修改授權 | — |
| `網站規格書.md` | 系統規格、各節驗收意圖、Phase 規劃(§9) | 共同 |
| `開發設計方針.md` | 實作契約(逐 Phase 開工展開) | implementer |
| `測試指南.md` | 測試環境、手動驗收清單 | verifier |
| `驗證後已知問題.md` | 待修 / 已修復 / 已接受邊界(第一輪驗證後建立) | verifier |
| `插圖風格指引.md` | 生圖風格鎖定(Phase 4 建立) | — |
| `subdocs/題庫/<id>.md` | 各題庫題目 / 插圖 prompt / 種子票(Phase 4 起) | — |

## 待決事項

- 網站名稱與網域(影響 OG 品牌感,不阻擋開發)。

## 下一步建議

Phase 2 已完成,待 verifier 依 `測試指南.md > Phase 2` 清單覆核。覆核通過後可開工 Phase 3(總結卡 + 分享)。
