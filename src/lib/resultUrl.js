// 分享連結組法單一事實來源(quizFlow 與測試共用,防字串漂移;同 src/routes.js 作法)。
//
// 規格書 §9 Phase 7 修訂(2026-07-20 LINE 真機實測後站方拍板):分享連結為
// /quiz/<id>/r/<稱號id>,不帶任何 query——稱號路徑只為了讓 LINE/FB 抓對應的稱號
// OG 卡,點開由 SPA 直接落題庫首頁。原 `?d=` 編碼結果(src/lib/resultCode.js 的
// encode/decode)已隨唯讀總結頁一併撤除。

/**
 * @param {string} origin 例 location.origin
 * @param {string} slug 題庫 id
 * @param {string} titleKey 稱號 id(mainstream 或 questionId)
 */
export function buildResultUrl(origin, slug, titleKey) {
  return `${origin}/quiz/${slug}/r/${titleKey}`;
}
