# would-you-rather 專案簡報

本文件供新 session 快速了解專案全貌,減少每次重讀全部規格文件的成本。需要深入細節時,按下方文件索引讀對應規格。

最後更新:2026-07-16

> **當前進度**:Phase 1、2、2.6 實作完成(自我驗收通過,待 verifier 覆核)。原阻擋 Phase 1/2 驗收的
> 「首次選擇後比例百分比不顯示」問題已修復(見 `驗證後已知問題.md`),Phase 1/2 驗收阻擋已解除。
> Phase 2.5「公開統計可靠性」
> 經站方決策(2026-07-16)**整體暫緩、條件觸發**,但其中三項經逐項評估後部分吸收:可靠送票
> → Phase 2.6 已實作完成(D1 收據表冪等、`pendingVotes` 補送、9 條驗收清單自我驗收通過);
> Turnstile 防灌票 → 維持暫緩、Phase 2.6 收據表已留插座(sessionId per-quiz、格式驗證但不驗身份);
> 產品統計 → WAE 四事件併入 Phase 3。「日常生活二選一」題庫 15 題已定稿(`subdocs/題庫/daily-life.md`)。
> Phase 2.6 手動驗收過程中另外發現一個 Phase 2 遺留的邊界 bug(`GET /api/stats` 失敗時
> `computeRatio(undefined, ...)` 會拋例外、選項點擊失效),記錄於 `開發設計方針.md > Phase 2.6`,
> 建議 verifier 列入 `驗證後已知問題.md`;不在 Phase 2.6 範圍內未修改。
> 下一步:Phase 2.6 待 verifier 覆核,之後進 Phase 3。

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
| 後端 | Cloudflare Pages Functions(3 支 API:stats / vote / played-counts) |
| 資料庫 | Cloudflare D1(一張 stats 表) |
| 分析 | Cloudflare Web Analytics |
| 防護 | WAF rate limit(Phase 5);進階加固為 §5.4 暫緩預案 |

## Phase 進度

| Phase | 內容 | 狀態 |
|---|---|---|
| 1 | 前端答題流程(mock 統計) | ✅ 實作完成,待 verifier 覆核 |
| 2 | 後端(Workers + D1) | ✅ 實作完成,待 verifier 覆核 |
| 2.5 | 公開統計可靠性 | ⏸️ 暫緩(條件觸發預案,見規格書 §5.4) |
| 2.6 | 可靠送票(pending queue + 冪等收據) | ✅ 實作完成,待 verifier 覆核 |
| 3 | 總結卡 + 分享 + WAE 產品事件 | ⬜ |
| 4 | 題庫內容 ×3(逐庫子階段) | ⬜ |
| 5 | 上線(部署 / 網域 / rate limit / 實測) | ⬜ |

Flag off 待開(不排 Phase):分類 chips、點選後 2 秒自動下一題。

統計定位(站方決策,2026-07-16):本站是趣味測驗不是民調;種子票(每題兩邊合計約 100 票)計入比例與「N 人玩過」;若上線後出現灌票或流量成長到數字可信度變重要,再啟動 Phase 2.5 預案(種子/真人分離、Turnstile、pending queue)。

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

1. Phase 2.6(可靠送票)待 verifier 依測試指南 9 條清單覆核;實作契約見
   `開發設計方針.md > Phase 2.6`(含手動驗收中發現並修正的 quizFlow.js pending 分歧 bug、
   以及一個記錄但未修的 Phase 2 遺留邊界問題)。
2. Phase 3(總結卡 + 分享 + WAE 事件):開工前待站方拍板——結果主標敘事(少數派題數、
   「最孤獨的一題」,競品研究建議)是否納入 §2.4。競品研究參考 `競品研究_challengembti.md`。
