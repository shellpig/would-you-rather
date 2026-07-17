# would-you-rather 專案簡報

本文件供新 session 快速了解專案全貌,減少每次重讀全部規格文件的成本。需要深入細節時,按下方文件索引讀對應規格。

最後更新:2026-07-17

> **當前進度**:Phase 1、2、2.6、3(含 3.5)與 Phase 4 首個子階段(daily-life 上線收尾)實作完成
> (自我驗收通過,累積待 verifier 覆核)。
> Phase 3 交付(commit `14822a3`):正式總結卡(四檔身份標籤、最孤獨的一題、匹配度、逐題摘要)、
> 分享(Web Share / 複製連結,文字帶結果摘要)、「你可能也想玩」導流卡、WAE 四事件、
> postbuild per-quiz OG 靜態頁;3.5 加孤獨稱號勳章(題庫 JSON 選配 `titles`,無欄位降級)。
> Code review 兩項 Phase 3 缺陷已修復(2026-07-17,commit `a723c12`):quiz route 接受可選尾斜線
> (外部分享經 Cloudflare 308 落地帶尾斜線 URL,原本 SPA 顯示找不到頁面);重玩總結卡改用本輪選擇
> (`{...answers, ...currentChoices}`,原「固定用 answers」決策已推翻並記入方針,勿改回)。
> Phase 4 子階段 1(2026-07-17):daily-life 題庫 JSON 接前端(15 題 + 16 稱號 + 定稿 OG 文案,
> OG script 支援選配 `ogTitle`/`ogDescription`)、定稿種子票接進 seed script
> (`scripts/seeds/daily-life.json`,不進前端 bundle、缺項 fallback 隨機)、demo 題庫全面下架
> (JSON / manifest / 圖片移除,受影響測試遷移至 daily-life)。測試 81/81 全綠,
> 端到端實走(15 題作答→總結卡勳章→分享、D1 種子值逐題比對定稿表)通過。
> Phase 2.5 維持站方決策(2026-07-16)**整體暫緩、條件觸發**(可靠送票已由 2.6 吸收、
> Turnstile 留插座、WAE 已落地)。
> 下一步:安排 verifier 覆核,之後 Phase 4 另兩庫(美食、宅宅/影視)逐題與站方討論建題。

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
| 4 | 題庫內容 ×3(逐庫子階段) | 🔶 進行中:daily-life 已上線收尾 + demo 下架;另兩庫待逐題討論 |
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

安排 verifier 覆核累積 phase(1 / 2 / 2.6 / 3 / 4 子階段 1)。Phase 4 其餘:另兩庫
(美食、宅宅/影視)題目 → 插圖 → 種子票逐題與站方討論(流程與文件格式以
`subdocs/題庫/daily-life.md` 為範本)。小待辦:不存在的 quizId(含已下架的 `/quiz/demo`)
落空白頁,建議加「找不到題庫」提示(既有邊界,非 Phase 4 引入);題庫文件第 10 / 14 題
「題目定稿表」與「種子票表」措辭微差待站方統一(實作以題目定稿表為準)。
競品研究參考 `競品研究_challengembti.md`。
