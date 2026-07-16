# would-you-rather 專案簡報

本文件供新 session 快速了解專案全貌,減少每次重讀全部規格文件的成本。需要深入細節時,按下方文件索引讀對應規格。

最後更新:2026-07-16

> **當前進度**:Phase 2(後端 Workers + D1)實作完成,既有自我驗收 13 條全數通過,待 verifier 覆核。
> 公開上線檢視後已插入 Phase 2.5「公開統計可靠性」:規格 / 實作契約 / 24 條驗收清單已定稿,
> **尚未實作**。Phase 2.5 會以 Turnstile 匿名 session、D1 後端防重、pending queue、真人統計與
> 每日彙總取代 Phase 2 的 production seed + 失敗即丟棄策略;完成前不得把目前比例宣稱為可信的
> 公開真人統計。Phase 1 前端答題流程先前已實作、自我驗收通過,同樣待 verifier 覆核。

---

## 專案概述

繁體中文「二選一(Would You Rather)」趣味測驗網站。使用者從題庫逐題二選一,點選後即時看到全站選擇比例(開場快照 + 自己一票,前端計算零延遲),答完產生適合手機截圖的總結卡並分享題庫首頁連結。題庫全由站方自訂,無 UGC、無帳號。

- **傳播命脈**:OG 預覽卡(LINE / Threads / FB / IG 分享)。
- **防重複**:localStorage 到題的粒度,降噪而非防作弊。
- **明確排除**:UGC、回上一題、帳號、IP/指紋防灌票、總結卡插圖。

## 技術棧

| 層 | 選型 |
|---|---|
| 前端 | Vanilla JS + Vite 靜態 SPA @ Cloudflare Pages |
| 後端 | Cloudflare Pages Functions(Phase 2 基礎 3 API;Phase 2.5 擴充匿名 session / 事件端點) |
| 資料庫 | Cloudflare D1(真人累積統計、匿名防重收據、累積 / 每日彙總) |
| 分析 | Cloudflare Web Analytics(流量) + D1 第一方彙總事件(Phase 2.5) |
| 防護 | Turnstile 匿名 session + WAF rate limit(Phase 2.5 / 5) |

## Phase 進度

| Phase | 內容 | 狀態 |
|---|---|---|
| 1 | 前端答題流程(mock 統計) | ✅ 實作完成,待 verifier 覆核 |
| 2 | 後端(Workers + D1) | ✅ 實作完成,待 verifier 覆核 |
| 2.5 | 公開統計可靠性 | 📝 文件定稿,⬜ 尚未實作 |
| 3 | 總結卡 + 分享 | ⬜ |
| 4 | 題庫內容 ×3(逐庫子階段) | ⬜ |
| 5 | 上線(部署 / 網域 / rate limit / 實測) | ⬜ |

Flag off 待開(不排 Phase):分類 chips、點選後 2 秒自動下一題。

Phase 2.5 的統計語意:

- 公開 A/B、匹配度只計後端接受的真人有效票,並顯示樣本數;production 新題庫從 0 票開始。
- 「N 人玩過」= 成功送出至少一票的唯一匿名 session,不再用第一題票數或種子票推估。
- Turnstile + session + rate limit 是趣味網站的降噪 / 防低成本濫用,不是自然人身分證明或科學民調。
- 票先進 local pending queue,後端以 session + question 冪等;暫時斷線可補送且不重複計票。
- 長期保存累積與每日彙總;不持久化 IP、User-Agent 或瀏覽器指紋。

## 文件索引

| 文件 | 內容 | 角色歸屬 |
|---|---|---|
| `AGENTS.md` | 開場讀檔順序、查閱與歸檔規則、修改授權 | — |
| `網站規格書.md` | 系統規格、各節驗收意圖、Phase 規劃(§9) | 共同 |
| `開發設計方針.md` | 實作契約(逐 Phase 開工展開) | implementer |
| `測試指南.md` | 測試環境、手動驗收清單 | verifier |
| `驗證後已知問題.md` | 待修 / 已修復 / 已接受邊界(第一輪驗證後建立) | verifier |
| `插圖風格指引.md` | 生圖風格鎖定(Phase 4 建立) | — |
| `subdocs/題庫/<id>.md` | 各題庫題目 / 插圖 prompt / 低樣本呈現與文案(Phase 4 起) | — |

## 待決事項

- 網站名稱與網域(影響 OG 品牌感,不阻擋開發)。

## 下一步建議

先實作 Phase 2.5,再由 verifier 依 `測試指南.md > Phase 2` 與 `Phase 2.5` 合併覆核後端公開上線邊界;
通過後才開工 Phase 3(總結卡 + 分享)。Phase 2.5 實作不得順手修改由 verifier 維護的
`測試指南.md` / `驗證後已知問題.md`;若驗收清單需調整,由 verifier 另行處理。
