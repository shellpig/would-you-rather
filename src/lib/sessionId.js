// 產生前端匿名 sessionId(規格書 §5.2、§5.4 插座;開發設計方針.md > Phase 2.6)。
// 每個題庫一組、存在該題庫的 progress 物件裡(見 src/lib/progressStore.js 的
// ensureSessionId),不是全站共用一個 id——這樣 D1 收據表的唯一鍵
// (session_id, question_id) 才等價於 (session_id, quiz_id, question_id)。
//
// 固定輸出 UUID v4 格式字串,讓後端 functions/api/vote.js 可以用單純的格式正則驗證。

export function generateSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 少數不支援 crypto.randomUUID 的環境:手動組出 UUID v4 格式字串。
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
