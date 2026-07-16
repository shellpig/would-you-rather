// 分享 / 複製連結(規格書 §2.4:Web Share API 優先、不支援時 fallback 複製連結)。
//
// Fallback 矩陣(開發設計方針.md > Phase 3 有完整表格):
//   1. navigator.share 存在 → Web Share(shareResult)。
//   2. 不存在 → 複製連結(copyResultLink):優先 navigator.clipboard.writeText,
//      失敗或不存在該 API(不安全上下文、舊瀏覽器、IG/Threads in-app browser 常見)時
//      退到 document.execCommand("copy") 的隱藏 textarea 寫法。兩層都失敗回傳 false,
//      呼叫端顯示「複製失敗」文字,不再有第三層 UI 狀態——規格只要求二選一的按鈕語意
//      (分享 vs 複製連結),兩種複製手段對使用者是同一顆按鈕、同一種回饋。

export function canUseWebShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** 呼叫 Web Share API。使用者取消分享(AbortError)或環境限制皆讓例外往外拋,
 *  由呼叫端決定是否要吞掉(規格未要求對取消顯示任何提示)。 */
export async function shareResult(text, url) {
  await navigator.share({ text, url });
}

/** 複製「文字 + 連結」到剪貼簿,回傳是否成功。 */
export async function copyResultLink(text, url) {
  const payload = `${text} ${url}`;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch {
      // 部分瀏覽器(權限被拒、非安全上下文)會拋錯,落到下面的相容 fallback。
    }
  }
  return legacyCopy(payload);
}

function legacyCopy(text) {
  if (typeof document === "undefined") return false;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
