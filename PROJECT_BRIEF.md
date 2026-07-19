# would-you-rather 專案簡報

本文件供新 session 快速了解專案全貌,減少每次重讀全部規格文件的成本。需要深入細節時,按下方文件索引讀對應規格。

最後更新:2026-07-19

> **當前進度**:Phase 1、2、2.6、3(含 3.5)與 Phase 4 已完成並通過 verifier 正式覆核。
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
> **站方決策(2026-07-17)**:Phase 4 縮減為**單庫上線**,另兩庫(名稱暫定「美食」「娛樂」)
> **移至新設的 Phase 6(上線後擴充)**;入口頁「建設中」佔位卡已實作完成(commit `2dc672a`:
> 清單常數 + 渲染純函式,不進 manifest、資料管線零感知、不可點;測試 87/87 全綠,
> 本機實走通過,樣式觀感待站方本機過目)。測試指南 Phase 4 驗收清單已展開
> (13 條,含佔位卡 2 條),回應 verifier P2 發現。**Phase 4 至此全部完成**。
> verifier 已完成 Phase 1–4 正式覆核(2026-07-17,65 條清單 63 通過 0 缺陷,詳見
> `subdocs/操作說明/驗證後已知問題.md`)。**Phase 5 已於 2026-07-17 首次上線**:站名定案「你是哪一派?」、
> 正式網址 https://would-you-rather-tw.pages.dev;production D1 建庫 + migration + 種子票
> 灌入驗證一致、WAE dataset 啟用、線上實走(直訪路由 / stats / 比例 / 佔位卡)通過,
> 部署記錄與命令見方針 Phase 5。剩:Web Analytics 開通、真機分享實測(站方)、
> rate limit(順延至自訂網域)。P6 美食庫題目 / 種子票 / 稱號已定稿,封面、30 張選項圖與
> 16 張稱號徽章已完成;尚缺題庫 JSON、seed 檔與接前端,目前仍維持不可點的建設中卡。
> 下一步:站方真機實測分享 → 關閉 Phase 5;同步推進 P6 美食庫 JSON / seed / 前端接線。

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
| 1 | 前端答題流程(mock 統計) | ✅ 完成並通過 verifier 覆核 |
| 2 | 後端(Workers + D1) | ✅ 完成並通過 verifier 覆核 |
| 2.5 | 公開統計可靠性 | ⏸️ 暫緩(條件觸發預案,見規格書 §5.4) |
| 2.6 | 可靠送票(pending queue + 冪等收據) | ✅ 完成並通過 verifier 覆核 |
| 3 | 總結卡 + 分享 + WAE 產品事件(含 3.5 孤獨稱號勳章) | ✅ 完成並通過 verifier 覆核 |
| 4 | 題庫內容(站方決策縮減為單庫 + 佔位卡) | ✅ 完成並通過 verifier 覆核(daily-life + demo 下架 + 佔位卡) |
| 5 | 上線(部署 / 網域 / rate limit / 實測) | 🔶 已上線 `would-you-rather-tw.pages.dev`(2026-07-17);剩 Web Analytics 開通、真機分享實測;rate limit 順延至自訂網域 |
| 6 | 題庫擴充 ×2(美食、娛樂;上線後) | 🔶 美食庫內容與素材完成,待 JSON / seed / 接前端;娛樂庫待討論 |

Flag off 待開(不排 Phase):分類 chips、點選後 2 秒自動下一題。

統計定位(站方決策,2026-07-16):本站是趣味測驗不是民調;種子票(每題兩邊合計約 100 票)計入比例與「N 人玩過」;若上線後出現灌票或流量成長到數字可信度變重要,再啟動 Phase 2.5 預案(種子/真人分離、Turnstile、pending queue)。

## 文件索引

| 文件 | 內容 | 角色歸屬 |
|---|---|---|
| `AGENTS.md` | 開場讀檔順序、查閱與歸檔規則、修改授權 | — |
| `網站規格書.md` | 系統規格、各節驗收意圖、Phase 規劃(§9) | 共同 |
| `開發設計方針.md` | 實作契約(逐 Phase 開工展開) | implementer |
| `測試指南.md` | 測試環境、手動驗收清單 | verifier |
| `subdocs/操作說明/驗證後已知問題.md` | 待修 / 已修復 / 已接受邊界(第一輪驗證後建立) | verifier |
| `插圖風格指引.md` | 生圖風格鎖定(已建立 2026-07-16,生圖任務必讀) | — |
| `subdocs/題庫/<id>.md` | 各題庫題目 / 插圖 prompt / 低樣本呈現與文案(Phase 4 起) | — |

## 待決事項

- ~~網站名稱與網域~~ → 已定案(2026-07-17):名稱「你是哪一派?」,網址 `would-you-rather-tw.pages.dev`(自訂網域未購,屆時改 `SITE_URL` 重 build 即可)。

## 下一步建議

站方完成真機分享與 Web Analytics 後關閉 Phase 5;rate limit 待自訂網域。
Phase 6 下一步為美食庫建立題庫 JSON、seed 檔並接入前端;娛樂庫之後逐題討論建題。
小待辦:不存在的 quizId(含已下架的 `/quiz/demo`)落空白頁,建議加「找不到題庫」提示
(既有邊界,非 Phase 4 引入);題庫文件第 10 / 14 題「題目定稿表」與「種子票表」措辭微差
待站方統一(實作以題目定稿表為準)。競品研究參考 `競品研究_challengembti.md`。
