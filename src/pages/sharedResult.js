// 唯讀版總結卡(規格書 §9 Phase 7):收到分享連結 /quiz/:slug/r/:titleId?d=<編碼結果>
// 的人看到的頁面。稱號徽章直接用 URL 的稱號 id 查表(不重算,避免統計漂移改變稱號);
// 身份標籤、逐題選擇與比例、匹配度由解碼的選擇 + 當下 stats 用既有純函式重算。
// 本頁不送 vote、不寫 localStorage 進度;「換你選看看」CTA 走 data-link 進該題庫
// 正常流程(intro 頁)。
//
// 降級(規格書 Phase 7):
// - 稱號 id 無效(不在 quiz.titles)→ 比照「找不到題庫」(與 quizFlow 的
//   QuizNotFoundError 分支同一畫面)。
// - `d` 缺漏/無效 → 顯示該題庫首頁:replaceState 回 /quiz/:slug 後直接委派
//   renderQuizFlow,行為與直訪題庫頁完全一致,不出錯。

import { fetchQuiz } from "../lib/quizData.js";
import { QuizNotFoundError } from "../lib/quizNotFoundError.js";
import { fetchStats } from "../lib/statsClient.js";
import { decodeChoices } from "../lib/resultCode.js";
import {
  computeQuestionResults,
  deriveIdentityLabel,
  computeMatchScore,
} from "../lib/resultSummary.js";
import { quizPageTitle } from "../lib/pageTitle.js";
import { renderQuizFlow } from "./quizFlow.js";

export async function renderSharedResult(app, { slug, titleId }) {
  let quiz;
  try {
    quiz = await fetchQuiz(slug);
  } catch (err) {
    if (!(err instanceof QuizNotFoundError)) throw err;
    renderNotFound(app);
    return;
  }

  // 稱號 id 無效(含題庫根本沒有 titles 欄位)→ 比照「找不到題庫」。
  const title = quiz.titles?.[titleId];
  if (!title) {
    renderNotFound(app);
    return;
  }

  // `d` 缺漏/無效 → 顯示該題庫首頁(URL 一併還原成正規題庫路徑)。
  const code = new URLSearchParams(location.search).get("d");
  const choices = decodeChoices(code, quiz.questions.length);
  if (!choices) {
    history.replaceState({}, "", `/quiz/${slug}`);
    await renderQuizFlow(app, { slug });
    return;
  }

  // 分頁標題沿用該題庫標題(與 OG 靜態頁一致,見 src/lib/pageTitle.js)。
  document.title = quizPageTitle(quiz);
  await showSharedCard();

  async function showSharedCard() {
    let stats;
    try {
      stats = await fetchStats(slug);
    } catch {
      // 與 quizFlow 的 showStatsError 同款可重試畫面(獨立錯誤路徑,不影響降級規則)。
      app.innerHTML = `
        <section class="quiz-intro">
          <p class="quiz-intro__error">載入失敗,請再試一次</p>
          <button type="button" class="btn-primary" data-retry>重試</button>
        </section>
      `;
      app.querySelector("[data-retry]").addEventListener("click", showSharedCard);
      return;
    }

    const answers = {};
    quiz.questions.forEach((q, i) => {
      answers[q.id] = choices[i];
    });
    const results = computeQuestionResults(quiz, answers, stats);
    const total = results.length;
    const minorityCount = results.filter((r) => r.isMinority).length;
    const identityLabel = deriveIdentityLabel(minorityCount, total);
    const matchScore = computeMatchScore(results);

    // 徽章的「代表作」題目:稱號綁定的那一題(mainstream 則取當下比例最高的一題,
    // 同率取題序在前,等同 pickLoneliestQuestion 的 mainstream fallback 選法)。
    const isMainstream = titleId === "mainstream";
    let featured;
    if (isMainstream) {
      featured = results[0];
      for (const r of results.slice(1)) {
        if (r.percent > featured.percent) featured = r;
      }
    } else {
      featured = results.find((r) => r.id === titleId);
    }
    if (!featured) {
      // titles 有此 key 但題目不存在(資料不一致的防呆),比照稱號 id 無效。
      renderNotFound(app);
      return;
    }

    // 文案與 showComplete 同款:mainstream 用「最大眾」分支,其餘用「孤獨代表作」分支。
    const percentLabel = isMainstream ? "你最大眾的一題" : "你的孤獨代表作";
    const percentLine = isMainstream
      ? `<strong>${featured.percent}%</strong> 的人都和你一樣`
      : `只有 <strong>${featured.percent}%</strong> 的人和你一樣`;

    // 勳章版面沿用 showComplete 的第 2/3 態(title 必有值;無 img 的題庫走文字版)。
    let badgeHtml;
    if (!title.img) {
      badgeHtml = `<p class="result-badge__name">${title.name}</p>
         <p class="result-hero__lonely-label">${percentLabel}</p>
         <p class="result-hero__lonely-text">${featured.text}</p>
         <p class="result-hero__lonely-percent">${percentLine}</p>
         <p class="result-badge__blurb">${title.blurb}</p>`;
    } else {
      badgeHtml = `
        <div class="result-badge__top">
          <img class="result-badge__img" src="${title.img}" alt="${title.name}" />
          <div class="result-badge__info">
            <p class="result-badge__name">${title.name}</p>
            <p class="result-hero__lonely-label">${percentLabel}</p>
            <p class="result-hero__lonely-text">${featured.text}</p>
          </div>
        </div>
        <p class="result-hero__lonely-percent">${percentLine}</p>
        <p class="result-badge__blurb">${title.blurb}</p>`;
    }

    app.innerHTML = `
      <section class="result-card">
        <div class="result-hero">
          <p class="result-hero__label">${identityLabel} · 你在 ${minorityCount}/${total} 題站在少數派</p>
          <div class="result-hero__lonely result-badge">${badgeHtml}</div>
          <p class="result-hero__match">你和 <strong>${matchScore}%</strong> 的人品味相同</p>
        </div>

        <ul class="result-list">
          ${results
            .map(
              (r) => `
            <li class="result-list__item ${r.isMinority ? "is-minority" : "is-majority"}">
              <span class="result-list__text">${r.text}</span>
              <span class="result-list__percent">${r.percent}%${
                r.isMinority ? '<span class="result-list__flag">少數</span>' : ""
              }</span>
            </li>`
            )
            .join("")}
        </ul>

        <a class="btn-primary" href="/quiz/${slug}" data-link>換你選看看</a>
      </section>
    `;
  }
}

// 與 quizFlow 的 QuizNotFoundError 分支同一畫面(沿用 .not-found / .btn-secondary)。
function renderNotFound(app) {
  app.innerHTML = `
    <section class="not-found">
      <p>找不到題庫</p>
      <a class="btn-secondary" href="/" data-link>回首頁</a>
    </section>
  `;
}
