# would-you-rather 專案簡報

本文件供新 session 快速了解專案全貌,減少每次重讀全部規格文件的成本。需要深入細節時,按下方文件索引讀對應規格。

最後更新:2026-07-17

> **當前進度**:Phase 1、2、2.6、3(含 3.5)實作完成(自我驗收通過,累積待 verifier 覆核)。
> Phase 3 交付(2026-07-17,commit `14822a3`):正式總結卡(四檔身份標籤、少數派題數、最孤獨的一題、
> 匹配度、逐題摘要)、分享(Web Share 優先 / 複製連結 fallback,分享文字帶結果摘要 + 題庫首頁連結)、
> 「你可能也想玩」導流卡、WAE 四事件 fire-and-forget、postbuild per-quiz OG 靜態頁;
> Phase 3.5 加上孤獨稱號勳章(題庫 JSON 選配 `titles` 欄位查表,無欄位降級回原版面;16 稱號定稿於
> daily-life 題庫文件)。測試 73/73 全綠,本機答題→總結卡→分享→D1 計票全流程驗證通過。
> Phase 2.5「公開統計可靠性」維持站方決策(2026-07-16)**整體暫緩、條件觸發**;其中可靠送票已由
> Phase 2.6 吸收(D1 收據表冪等、`pendingVotes` 補送)、Turnstile 維持暫緩(收據表已留插座)、
> 產品統計 WAE 已隨 Phase 3 落地。
> 「日常生活二選一」15 題定稿(`subdocs/題庫/daily-life.md`),30 張選項圖與封面已落地
> `public/img/daily-life/`,種子票分佈定稿;daily-life 尚缺:題庫 JSON 接前端、seed script、
> 標題/簡述/OG 文案定稿、demo 下架。
> 下一步:安排 verifier 覆核(Phase 1 / 2 / 2.6 / 3 累積四個 phase),之後進 Phase 4(題庫內容)。

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
| 3 | 總結卡 + 分享 + WAE 產品事件(含 3.5 孤獨稱號勳章) | ✅ 實作完成,待 verifier 覆核 |
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
| `插圖風格指引.md` | 生圖風格鎖定(已建立 2026-07-16,生圖任務必讀) | — |
| `subdocs/題庫/<id>.md` | 各題庫題目 / 插圖 prompt / 低樣本呈現與文案(Phase 4 起) | — |

## 待決事項

- 網站名稱與網域(影響 OG 品牌感,不阻擋開發)。

## 下一步建議

安排 verifier 覆核累積的四個 phase(1 / 2 / 2.6 / 3)。之後開工 Phase 4(題庫內容):
首庫 daily-life 收尾——題庫 JSON 接前端、seed script、標題/簡述/OG 文案定稿、demo 題庫下架;
再建另兩庫。競品研究參考 `競品研究_challengembti.md`。
