# Google Flow 生圖操作指南(Chrome 自動化)

> 用 AI agent 操作 Chrome 上的 Google Flow(labs.google/fx)輸入 prompt 並按下生成的實戰流程。
> 首次驗證:2026-07-19,連續 5 組 prompt 全數送出成功(Nano Banana 2 × 4)。
> 生成素材的風格與落地規則見 `插圖風格指引.md`;本檔只講「怎麼把 prompt 送進去」。

## 前置條件

- Chrome 已登入 Google 帳號,Flow 專案頁已可正常手動操作。
- 專案 URL 形如 `https://labs.google/fx/zh/tools/flow/project/<id>`。
- 模型與張數(如 Nano Banana 2 □ x4)由人先在頁面上設定好;agent 只負責輸入 + 送出。
- Agent 的瀏覽器自動化必須能發**原生(trusted)輸入事件**(CDP `Input.dispatchMouseEvent` /
  Playwright / Puppeteer 等級)。只能 dispatch 合成 JS 事件的工具鏈會在「送出」這一步失敗,見陷阱 3。

## 操作流程(每組 prompt)

1. **點擊輸入框**:畫面下方置中、placeholder 為「您希望创作什么内容?」的區塊。
   它是 **contenteditable `<div>`,不是 `<textarea>`**——不要用 set value / form 填值 API(會失敗),
   一律走「真實點擊 + 鍵盤模擬打字」。
2. **Warmup 假字**:點擊後先打一段丟棄用文字(如 `warmup`),再 `Ctrl+A` → `Delete` 清空。
   (原因見陷阱 1:首次打字必吞開頭。)
3. **打完整 prompt**:第二次打字不會漏字。
4. **驗證輸入完整**:送出前截圖或讀 DOM,確認開頭第一句完整(如 `Cute cozy game illustration...`)。
   不完整就 `Ctrl+A` → `Delete` 重打,壞的 prompt 不要送(浪費額度)。
5. **定位送出鈕**:圓形箭頭按鈕,accessibility name 為 `arrow_forward` 的 `<button>`。
   **每一組都重新定位**(用 accessibility tree 找,或重新截圖確認座標),不要沿用上一輪座標(陷阱 2)。
6. **原生滑鼠點擊按鈕中心** → 等 2–3 秒。
7. **確認送出成功**(兩者同時成立才算,避免誤報):
   - 輸入框恢復 placeholder「您希望创作什么内容?」
   - 頁面上方出現 4 格帶百分比的進度磚
8. 送出即可接著輸入下一組,不必等前一組生成完(Flow 可並行)。

## 已知陷阱

1. **首次打字吞開頭**:點擊輸入框後的第一次打字,開頭約 30 字元會遺失(編輯器在第一個
   keystroke 才初始化)。解法即上述 warmup 流程;症狀是輸入框內容從句中開始(如
   `1 square, one single...` 而非 `Cute cozy game illustration, 1:1 square...`)。
2. **送出鈕座標漂移**:頁面上生成中的圖磚列會把輸入框和按鈕往下推,座標隨內容增加而變。
   每組重新定位;點擊前可用 `document.elementFromPoint(x, y)` 確認座標下就是該按鈕
   (若回傳其他元素 = 座標換算錯或被蓋住;注意 devicePixelRatio,點擊要用 CSS 像素座標)。
3. **合成事件按不動送出鈕**:Flow 是 React app,送出鈕忽略 `isTrusted: false` 的事件——
   `element.click()` / `dispatchEvent(new MouseEvent(...))` 只會讓按鈕取得焦點,不會送出;
   對按鈕按 Enter 也無效(它不是 form submit)。必須用原生滑鼠事件。最後手段是 dispatch
   完整 pointer 序列(pointerdown → mousedown → pointerup → mouseup → click),但不保證成功。

## 送出後(素材落地)

人眼從 Flow 挑圖、下載原圖丟到 repo,之後依 `插圖風格指引.md` §5 慣例處理:
原圖 + `.prompt.txt` 歸檔 `assets/generated/<題庫id>/`(prompt 逐字收錄,檔尾註明
「生成:Google Flow / Nano Banana 2」),正式檔轉 512×512 WebP 落
`public/img/<題庫id>/titles/`,再接題庫 JSON。範例見
`assets/generated/daily-life/title-compass-202607190803.prompt.txt`。
