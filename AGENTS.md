# Agent Instructions

# would-you-rather(網站名稱暫定)

繁體中文「二選一(Would You Rather)」趣味測驗網站。使用者逐題二選一、即時看全站比例、答完產生可分享總結卡;題庫全由站方自訂,無 UGC。

- **技術棧**:Cloudflare Pages(靜態前端)+ Workers + D1(SQLite)
- **目前進度**:以 `PROJECT_BRIEF.md` 頂部「當前進度」一行與「Phase 進度」表為單一事實來源;詳細規劃見 `網站規格書.md > 9. Phase 規劃`。

## New Conversation Opening Check

At conversation start, read in this layered order. `舊文件/` 是本機歷史 archive(不在 repo 中),永遠忽略。

**Layer 1 — 必讀(建立全貌):**
1. `AGENTS.md`(本檔)
2. `PROJECT_BRIEF.md`(頂部「當前進度」+ Phase 進度表 + 文件索引)
3. `git log --oneline -10`(近期變更)

**Layer 2 — 按任務讀對應段落(勿整份讀,見下方「按 Phase 查閱規則」):**
- `網站規格書.md` — 系統規格與各 Phase 驗收意圖(what must be true)
- `開發設計方針.md` — 實作契約:檔案結構、API 細節、資料契約、實作決策(逐 Phase 開工時展開)
- `測試指南.md` — 測試環境命令、各 Phase 手動驗收清單
- `subdocs/操作說明/驗證後已知問題.md` — 待修清單與已接受的邊界決定;修 bug 前先看(第一輪驗證後才建立)

**Layer 3 — 任務相關細節與實作參考:**
- `插圖風格指引.md` — 任何生圖 / 素材任務**必讀**(Phase 4 建題時建立;建立前的生圖任務先與使用者確認風格)
- `subdocs/題庫/<id>.md` — 各題庫內容文件:題目定稿、插圖 prompt、種子票分佈(Phase 4 起逐庫建立)
- 前端 / Worker source code

Report to user: current progress, and any issues with their scope of impact.

### 按 Phase 查閱規則

三份主文件(`網站規格書.md` / `開發設計方針.md` / `測試指南.md`)會隨 Phase 成長,**不要整份讀**。查 Phase N 的規格 / 契約 / 測試清單時,用標題 grep 定位、只讀該段(讀到下一個同級標題為止):

```
grep -n "Phase N" 網站規格書.md 開發設計方針.md 測試指南.md
```

- **不要依賴文件行號**——行號隨編輯漂移;一律以標題定位。
- 若主檔中該標題下只有一行「已完成,全文歸檔於…」stub,表示段落已搬到 `subdocs/歸檔/<主檔名>_歸檔.md`——用**同一個標題** grep 歸檔檔即可。

### 文件歸檔規則(滑動窗)

目的:讓主文件的「活文件」部分維持有界大小。文件還小時不觸發,規則先立。

- **時機**:Phase N 完成並通過驗收,且其後已有 ≥2 個更新的 phase 完成時,把 Phase N 在各文件中的段落搬入 `subdocs/歸檔/<主檔名>_歸檔.md`(append 到檔尾)。
- **做法**:原位置**保留原標題一字不改** + 一行 stub `>(已完成,全文歸檔於 \`subdocs/歸檔/<主檔名>_歸檔.md\`,同標題可 grep。)`;歸檔內容一字不改,維持可 grep。
- **不歸檔的例外**:規格書 §1–§8 通用規格全部段落;測試指南「測試環境」;跨 Phase 仍在使用的契約段落。
- 歸檔檔為 append-only,不回頭改寫;歷史修正一律改主檔或以新段落記錄。

## 修改授權與驗證規則

(單一事實來源;其他文件不重複本節內容。)

除非使用者明確要求「修」、「修改」、「實作」、「處理某個 phase」、「commit」或「提交」,否則不得:

- 修改任何程式碼、文件或設定檔
- 自行套 patch
- stage 檔案
- 建立 commit

當使用者要求「驗證」,或只是描述錯誤、貼截圖、詢問原因、要求解釋、要求列出問題、詢問某功能怎麼使用時:只能進行檢查、讀檔、執行測試、code review、啟動本機服務與回報結果。若發現問題,只列出問題、影響範圍與建議修法,等待使用者下一步指示。

(English mirror: only modify files when the user explicitly requests fix / implement / commit. Verify / diagnose = report only.)

## 角色歸屬

- 實作者(implementer)維護:程式碼、測試、fixtures、`開發設計方針.md`。
- 驗證者(verifier)維護:`測試指南.md`、`subdocs/操作說明/驗證後已知問題.md`。實作者照清單建測試與自我驗收,不得放寬清單、不改這兩檔(只列建議)。

## 素材生成規則

- 任何生圖 / 素材任務前必讀 `插圖風格指引.md`(存在後),防止 AI 生成素材風格漂移。
- 生成輸出落回 `assets/generated/<題庫id>/...`,保留 prompt / raw / processed / metadata;檔名帶時間戳後綴避免覆蓋。
- 正式採用的圖轉為 WebP(30–50KB,正方形或 4:3)放入前端靜態目錄,路徑與題庫 JSON 一致。

## 本機環境

- 本機開發 / 測試命令:見 `測試指南.md > 測試環境`(Phase 1 建置後填入實際命令)。
- `.claude/` 為本機工具設定,已列入 `.gitignore`,永不 commit。
