// 入口頁 `/`(規格書 §2.1)。

import { fetchManifest } from "../lib/quizData.js";
import { fetchPlayedCount } from "../lib/statsClient.js";
import { shouldShowPlayedCount } from "../lib/ratio.js";
import { FEATURE_FLAGS, PLAYED_COUNT_THRESHOLD } from "../config.js";
import { PLACEHOLDER_QUIZZES, renderPlaceholderCard } from "../lib/placeholderQuizzes.js";

const CATEGORY_LABELS = {
  life: "生活",
  food: "美食",
  otaku: "宅宅",
};

export async function renderHome(app) {
  const manifest = await fetchManifest();
  const quizzes = await Promise.all(
    manifest.quizzes.map(async (q) => ({
      ...q,
      playedCount: await fetchPlayedCount(q.id),
    }))
  );

  const categories = [...new Set(quizzes.map((q) => q.category))];

  app.innerHTML = `
    <header class="site-header">
      <h1>Would You Rather</h1>
      <p class="tagline">逐題二選一,看看你和大家的選擇差多少</p>
    </header>
    ${FEATURE_FLAGS.categoryChips ? renderChips(categories) : ""}
    <section class="quiz-list" data-quiz-list>
      ${quizzes.map(renderCard).join("")}
    </section>
    <section class="quiz-list" data-placeholder-list>
      ${PLACEHOLDER_QUIZZES.map(renderPlaceholderCard).join("")}
    </section>
  `;

  if (FEATURE_FLAGS.categoryChips) {
    wireChips(app, quizzes);
  }
}

function renderChips(categories) {
  const chips = ["all", ...categories];
  return `
    <nav class="category-chips" data-chips>
      ${chips
        .map(
          (c, i) =>
            `<button type="button" class="chip${i === 0 ? " active" : ""}" data-category="${c}">${
              c === "all" ? "全部" : CATEGORY_LABELS[c] ?? c
            }</button>`
        )
        .join("")}
    </nav>
  `;
}

function wireChips(app, quizzes) {
  const chipsEl = app.querySelector("[data-chips]");
  const listEl = app.querySelector("[data-quiz-list]");
  chipsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    chipsEl.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    const category = btn.dataset.category;
    const filtered = category === "all" ? quizzes : quizzes.filter((q) => q.category === category);
    listEl.innerHTML = filtered.map(renderCard).join("");
  });
}

function renderCard(quiz) {
  const showPlayed = shouldShowPlayedCount(quiz.playedCount, PLAYED_COUNT_THRESHOLD);
  return `
    <a class="quiz-card" href="/quiz/${quiz.id}" data-link>
      <img class="quiz-card__cover" src="${quiz.cover}" alt="${quiz.title}" />
      <div class="quiz-card__body">
        <h2 class="quiz-card__title">${quiz.title}</h2>
        <p class="quiz-card__meta">共 ${quiz.questionCount} 題</p>
        ${showPlayed ? `<p class="quiz-card__played">${quiz.playedCount} 人玩過</p>` : ""}
      </div>
    </a>
  `;
}
