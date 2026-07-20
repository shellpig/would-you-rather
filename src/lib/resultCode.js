// 結果連結 `d` 參數編解碼(規格書 §9 Phase 7)。純模組,供 quizFlow(產生分享連結)、
// sharedResult(解碼唯讀總結頁)與 node:test 共用。
//
// 編碼格式(越短越好、不含個資):15 題的 a/b 選擇視為 bitmask——依 quiz.questions
// 題序,第 i 題選 "b" 時第 i 個 bit 為 1(選 "a" 為 0)。再在最高位補一個 sentinel bit
// (值為 2^N)後轉 base36 小寫字串。sentinel 的作用:讓編碼自帶題數資訊,解碼時同時
// 驗證「這條連結就是為 N 題的題庫產生的」——題數不符(題庫改版、亂改參數)一律視為
// 無效,不會靜默解出錯位的答案。N=15 時輸出至多 4 個字元(例:全選 a → "sfw" 之類)。
// 用整數除法/取餘而非位元運算,避免 JS 位元運算 32-bit 截斷(題數上限 52 綽綽有餘)。

/**
 * @param {Array<"a"|"b">} choices 依題序的選擇陣列
 * @returns {string} base36 編碼字串
 */
export function encodeChoices(choices) {
  let value = 1; // sentinel bit(最高位)
  for (let i = choices.length - 1; i >= 0; i--) {
    value = value * 2 + (choices[i] === "b" ? 1 : 0);
  }
  return value.toString(36);
}

/**
 * @param {string|null|undefined} code URL 的 `d` 參數原文
 * @param {number} questionCount 該題庫題數 N
 * @returns {Array<"a"|"b">|null} 依題序的選擇陣列;任何無效輸入(缺漏、非 base36、
 *   題數不符)回傳 null,呼叫端據此降級顯示題庫首頁(規格書 Phase 7「降級」)。
 */
export function decodeChoices(code, questionCount) {
  if (typeof code !== "string" || !/^[0-9a-z]+$/.test(code)) return null;
  const value = Number.parseInt(code, 36);
  if (!Number.isSafeInteger(value)) return null;
  const min = 2 ** questionCount; // sentinel 就位 → 值必落在 [2^N, 2^(N+1))
  if (value < min || value >= min * 2) return null;
  const choices = [];
  let rest = value;
  for (let i = 0; i < questionCount; i++) {
    choices.push(rest % 2 === 1 ? "b" : "a");
    rest = Math.floor(rest / 2);
  }
  return choices;
}

/**
 * 分享連結組法單一事實來源(quizFlow 與測試共用,防字串漂移;同 src/routes.js 作法)。
 * @param {string} origin 例 location.origin
 * @param {string} slug 題庫 id
 * @param {string} titleKey 稱號 id(mainstream 或 questionId)
 * @param {string} code encodeChoices 的結果
 */
export function buildResultUrl(origin, slug, titleKey, code) {
  return `${origin}/quiz/${slug}/r/${titleKey}?d=${code}`;
}
