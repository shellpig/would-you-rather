// 題庫首頁 + 答題頁 + 完成頁,同一個 URL `/quiz/:slug` 內的 SPA 內部流程
// (規格書 §2.2、§2.3、§3;返回鍵決策見 src/router.js 開頭註解)。

import { fetchQuiz } from "../lib/quizData.js";
import { fetchStats, fetchPlayedCount } from "../lib/statsClient.js";
import { computeRatio, shouldShowPlayedCount } from "../lib/ratio.js";
import { getQuizProgress, saveQuizProgress } from "../lib/storage.js";
import {
  hasAnswered,
  recordAnswer,
  firstUnansweredQuestionId,
  isCompleted,
  markCompleted,
} from "../lib/progressStore.js";
import { submitVote } from "../lib/voteStub.js";
import { PLAYED_COUNT_THRESHOLD } from "../config.js";

export async function renderQuizFlow(app, { slug }) {
  const quiz = await fetchQuiz(slug);
  const playedCount = await fetchPlayedCount(slug);
  const questionIds = quiz.questions.map((q) => q.id);

  // 每次進頁面重新從 localStorage 讀最新進度(續玩 / 重玩皆從這裡分流)。
  let progress = getQuizProgress(slug);

  /** @type {Record<string, {a:number,b:number}>|null} 開始作答時抓的統計快照,只抓一次。 */
  let snapshot = null;
  let currentIndex = 0;
  /** 本次瀏覽中已經播過變長動畫的題目 id;每題只播一次(§3)。 */
  const animatedQuestions = new Set();
  /** 本次瀏覽中,使用者這一輪的選擇(每題最新選的一邊,不一定等於 localStorage 已存的答案)。 */
  const currentChoices = {};

  showIntro();

  // ---- 題庫首頁(intro) ----
  function showIntro() {
    const minutes = Math.max(1, Math.ceil(quiz.questions.length * 10 / 60));
    const showPlayed = shouldShowPlayedCount(playedCount, PLAYED_COUNT_THRESHOLD);
    app.innerHTML = `
      <section class="quiz-intro">
        <img class="quiz-intro__cover" src="${quiz.cover}" alt="${quiz.title}" />
        <h1 class="quiz-intro__title">${quiz.title}</h1>
        <p class="quiz-intro__desc">${quiz.description}</p>
        <button type="button" class="btn-primary" data-start>開始作答</button>
        <p class="quiz-intro__info">約 ${minutes} 分鐘 · ${quiz.questions.length} 題${
      showPlayed ? ` · 已有 ${playedCount} 人作答` : ""
    }</p>
      </section>
    `;
    app.querySelector("[data-start]").addEventListener("click", startFlow);
  }

  // ---- 開始作答:一次抓統計快照,決定從哪一題開始 ----
  async function startFlow() {
    snapshot = await fetchStats(slug);

    const nextUnanswered = firstUnansweredQuestionId(progress, questionIds);
    const startId = nextUnanswered ?? questionIds[0]; // 全答完(重玩)則從第一題開始
    currentIndex = questionIds.indexOf(startId);
    showQuestion();
  }

  // ---- 單題畫面 ----
  function showQuestion() {
    const question = quiz.questions[currentIndex];
    const total = questionIds.length;
    const previousChoice = progress.answers[question.id]; // 重玩情境下才會有值

    app.innerHTML = `
      <section class="question-page">
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${
          ((currentIndex + 1) / total) * 100
        }%"></div></div>
        <p class="progress-text">${currentIndex + 1}/${total}</p>

        <div class="option-card" data-side="a">
          <img class="option-card__img" src="${question.a.img}" alt="${question.a.text}" />
          <div class="option-card__body">
            <p class="option-card__text">${question.a.text}</p>
            ${previousChoice === "a" ? `<p class="option-card__hint">你上次選的是這個</p>` : ""}
            <div class="ratio" data-ratio hidden>
              <div class="ratio-track"><div class="ratio-fill" data-fill></div></div>
              <span class="ratio-num" data-num>0%</span>
            </div>
          </div>
        </div>

        <div class="vs-divider">VS</div>

        <div class="option-card" data-side="b">
          <img class="option-card__img" src="${question.b.img}" alt="${question.b.text}" />
          <div class="option-card__body">
            <p class="option-card__text">${question.b.text}</p>
            ${previousChoice === "b" ? `<p class="option-card__hint">你上次選的是這個</p>` : ""}
            <div class="ratio" data-ratio hidden>
              <div class="ratio-track"><div class="ratio-fill" data-fill></div></div>
              <span class="ratio-num" data-num>0%</span>
            </div>
          </div>
        </div>

        <button type="button" class="btn-primary" data-next disabled>下一題</button>
      </section>
    `;

    const cardA = app.querySelector('[data-side="a"]');
    const cardB = app.querySelector('[data-side="b"]');
    cardA.addEventListener("click", () => selectChoice(question, "a"));
    cardB.addEventListener("click", () => selectChoice(question, "b"));
    app.querySelector("[data-next]").addEventListener("click", () => goNext(question));
  }

  function selectChoice(question, choice) {
    currentChoices[question.id] = choice;

    const cardA = app.querySelector('[data-side="a"]');
    const cardB = app.querySelector('[data-side="b"]');
    const selectedCard = choice === "a" ? cardA : cardB;
    const otherCard = choice === "a" ? cardB : cardA;
    selectedCard.classList.add("selected");
    selectedCard.classList.remove("dimmed");
    otherCard.classList.remove("selected");
    otherCard.classList.add("dimmed");

    const { aPercent, bPercent } = computeRatio(snapshot[question.id], choice);
    const alreadyAnimated = animatedQuestions.has(question.id);

    updateRatioSide(cardA, aPercent, alreadyAnimated);
    updateRatioSide(cardB, bPercent, alreadyAnimated);

    if (!alreadyAnimated) {
      animatedQuestions.add(question.id);
    }

    app.querySelector("[data-next]").disabled = false;
  }

  function updateRatioSide(cardEl, percent, alreadyAnimated) {
    const ratioEl = cardEl.querySelector("[data-ratio]");
    const fillEl = cardEl.querySelector("[data-fill]");
    const numEl = cardEl.querySelector("[data-num]");
    ratioEl.hidden = false;
    numEl.textContent = `${percent}%`;

    if (alreadyAnimated) {
      // 改選(或重玩已播過動畫的題目):瞬間切換,不重播動畫。
      fillEl.classList.add("no-anim");
      fillEl.style.width = `${percent}%`;
      numEl.classList.add("show");
      return;
    }

    // 第一次選擇:比例條播放變長動畫,transitionend 後才淡入數字。
    fillEl.classList.remove("no-anim");
    numEl.classList.remove("show");

    // done 旗標防止 transitionend 與 timeout fallback 重複觸發淡入。
    let done = false;
    let timeoutId;
    const finish = () => {
      if (done) return;
      done = true;
      numEl.classList.add("show");
      fillEl.removeEventListener("transitionend", onDone);
      clearTimeout(timeoutId);
    };
    const onDone = (e) => {
      if (e.propertyName !== "width") return;
      finish();
    };
    fillEl.addEventListener("transitionend", onDone);
    // transitionend 可能因 reduced motion、元素剛從 hidden 轉可見等情況不觸發,
    // 加上與 CSS transition(width 0.6s)時長相符的 timeout fallback 兜底。
    timeoutId = setTimeout(finish, 650);

    // 觸發 transition 前,先用雙層 requestAnimationFrame 可靠提交初始 0% 寬度:
    // 元素剛從 hidden 轉為可見時,單層 rAF 仍可能與「取消 hidden」這次樣式套用被
    // 瀏覽器合併成同一次繪製,導致瀏覽器認為寬度從一開始就是目標值而不觸發 transition。
    fillEl.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fillEl.style.width = `${percent}%`;
      });
    });
  }

  // ---- 下一題 / 完成 ----
  function goNext(question) {
    const choice = currentChoices[question.id];
    const { progress: nextProgress, isFirstAnswer } = recordAnswer(progress, question.id, choice);
    progress = nextProgress;
    saveQuizProgress(slug, progress);

    if (isFirstAnswer) {
      submitVote(slug, question.id, choice); // Phase 1:只 console.log,不發網路請求。
    }

    if (currentIndex + 1 >= questionIds.length) {
      finishFlow();
      return;
    }
    currentIndex += 1;
    showQuestion();
  }

  function finishFlow() {
    progress = markCompleted(progress, Date.now());
    saveQuizProgress(slug, progress);
    showComplete();
  }

  // ---- 完成頁(佔位版;完整總結卡為 Phase 3 範圍,見 開發設計方針.md > Phase 1) ----
  function showComplete() {
    app.innerHTML = `
      <section class="complete-page">
        <h1>測驗完成!</h1>
        <p>你回答了 ${questionIds.length} 題。完整總結卡(比對比例、匹配度、分享)於 Phase 3 實作。</p>
        <ul class="complete-list">
          ${questionIds
            .map((id) => {
              const q = quiz.questions.find((qq) => qq.id === id);
              const choice = progress.answers[id];
              const text = choice === "a" ? q.a.text : q.b.text;
              return `<li>${text}</li>`;
            })
            .join("")}
        </ul>
        <button type="button" class="btn-secondary" data-replay>再玩一次</button>
        <a class="btn-secondary" href="/" data-link>回首頁</a>
      </section>
    `;
    app.querySelector("[data-replay]").addEventListener("click", () => {
      animatedQuestions.clear();
      showIntro();
    });
  }
}
