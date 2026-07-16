// 比例計算(純函式,規格書 §3「比例顯示規則」)。
// 比例 = 開始作答時的統計快照 + 使用者自己這一票;只算 a 邊,b 邊用 100 − a 避免湊不齊 100。

/**
 * @param {{a: number, b: number}} snapshot 開始作答時抓到的快照(不含使用者這一票)
 * @param {'a'|'b'} choice 使用者這一題的選擇
 * @returns {{aPercent: number, bPercent: number}} 整數百分比,aPercent + bPercent === 100
 */
export function computeRatio(snapshot, choice) {
  const aCount = snapshot.a + (choice === "a" ? 1 : 0);
  const bCount = snapshot.b + (choice === "b" ? 1 : 0);
  const total = aCount + bCount;

  const aPercent = total === 0 ? 50 : Math.round((aCount / total) * 100);
  const bPercent = 100 - aPercent;

  return { aPercent, bPercent };
}

/** 「N 人玩過」門檻判定(純函式,規格書 §2.1、§2.2)。 */
export function shouldShowPlayedCount(count, threshold) {
  return count >= threshold;
}
