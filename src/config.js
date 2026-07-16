// 全站設定值與 feature flag。
// Phase 1 契約:見 開發設計方針.md > Phase 1 > feature flag 與門檻設定。

/** 分類 chips 顯示開關(規格書 §2.1)。上線初期題庫少,預設關閉。
 *  開發驗收時可暫時改為 true 走查 §2.1 驗收第 3 條,驗完改回 false。 */
export const FEATURE_FLAGS = {
  categoryChips: false,
};

/** 「N 人玩過 / 已有 N 人作答」顯示門檻(規格書 §2.1、§2.2)。
 *  低於此值的題庫,該行文字完全不顯示。 */
export const PLAYED_COUNT_THRESHOLD = 100;
