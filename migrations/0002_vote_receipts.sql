-- Phase 2.6:可靠送票的冪等收據表(開發設計方針.md > Phase 2.6)。
-- 唯一鍵 (session_id, question_id):規格書 §5.2 / §9 Phase 2.6 明文的唯一鍵字面設計。
-- 之所以「question_id」不必再併入 quiz_id 就能保證全站唯一,是因為 sessionId 本身是
-- per-quiz 產生(見 開發設計方針.md > Phase 2.6 > sessionId 產生與存放位置)——同一個
-- sessionId 只會用在同一個題庫,因此 (session_id, question_id) 等價於
-- (session_id, quiz_id, question_id),不會有跨題庫同 session 撞題目 id 的情況。
-- quiz_id 欄位保留純作紀錄 / debug 用途(vote handler 寫入時本來就有這個值)。
--
-- 這張表即 §5.4(暫緩預案)的插座:未來若啟動 Turnstile,只需在發 session 的步驟加驗證閘,
-- 表結構與這裡的唯一鍵不需更動(規格書 §5.4 狀態註記、開發設計方針.md > Phase 2.6 stub)。
CREATE TABLE vote_receipts (
  session_id  TEXT NOT NULL,
  quiz_id     TEXT NOT NULL,
  question_id TEXT NOT NULL,
  choice      TEXT NOT NULL CHECK (choice IN ('a', 'b')),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (session_id, question_id)
);
