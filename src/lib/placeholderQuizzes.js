// 入口頁「建設中」佔位卡(純函式,規格書 §2.1 佔位卡、方針 Phase 4 佔位卡小節)。
// 決策:清單放這裡而非 src/pages/home.js 或 src/config.js——本檔屬於 src/lib/ 既有
// 「純函式、不碰 DOM」慣例(同 ratio.js、recommend.js),讓清單本身與「產出佔位卡
// HTML」都能在沒有 jsdom 的測試環境下直接測試;不放 config.js 是因為這不是全站級的
// feature flag / 門檻設定,而是首頁渲染用的展示資料,定位更接近 home.js 既有的
// CATEGORY_LABELS 這類頁面專屬常數。
// 清單刻意不進 src/data/manifest.json:合法清單(generate-legal-list.mjs)、種子票
// (seed-votes.mjs)、OG 靜態頁(generate-og-pages.mjs)、導流卡(recommend.js)皆只讀
// manifest,維持零改動、零感知佔位卡。

/** 佔位題庫清單(名稱暫定,正式名稱與內容待 Phase 6 逐庫與站方定案)。
 *  id 只用於前端渲染(如 map 的 key),刻意不與正式 manifest id 撞名,避免未來
 *  Phase 6 上線同名題庫時混淆。 */
export const PLACEHOLDER_QUIZZES = [
  { id: "placeholder-food", title: "美食", icon: "🍜" },
  { id: "placeholder-entertainment", title: "娛樂", icon: "🎬" },
];

/**
 * 產出單張佔位卡 HTML(純函式)。
 * 刻意用 <div> 不用 <a>、不帶 href / data-link——router 的點擊委派只認 [data-link]
 * (見 src/router.js),沒有這個屬性就不會有任何導頁副作用,天然滿足「不可點擊」。
 * @param {{id:string,title:string,icon:string}} quiz
 */
export function renderPlaceholderCard(quiz) {
  return `
    <div class="quiz-card quiz-card--placeholder" aria-disabled="true">
      <div class="quiz-card__cover quiz-card__cover--placeholder">
        <span class="quiz-card__placeholder-icon" aria-hidden="true">${quiz.icon}</span>
      </div>
      <div class="quiz-card__body">
        <h2 class="quiz-card__title">${quiz.title}</h2>
        <span class="quiz-card__badge">建設中</span>
      </div>
    </div>
  `;
}
