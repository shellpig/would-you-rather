// 題庫首頁 + 答題頁 + 完成頁,同一個 URL `/quiz/:slug` 內的 SPA 內部流程
// (規格書 §2.2、§2.3、§3;返回鍵決策見 src/router.js 開頭註解)。

import { fetchQuiz, fetchManifest } from "../lib/quizData.js";
import { QuizNotFoundError } from "../lib/quizNotFoundError.js";
import { fetchStats, fetchPlayedCount } from "../lib/statsClient.js";
import { computeRatio, shouldShowPlayedCount } from "../lib/ratio.js";
import { getQuizProgress, saveQuizProgress } from "../lib/storage.js";
import {
  hasAnswered,
  recordAnswer,
  firstUnansweredQuestionId,
  isCompleted,
  markCompleted,
  ensureSessionId,
  queuePendingVote,
  recordQuestionTime,
} from "../lib/progressStore.js";
import { sendVote } from "../lib/voteQueue.js";
import { generateSessionId } from "../lib/sessionId.js";
import { PLAYED_COUNT_THRESHOLD } from "../config.js";
import {
  computeQuestionResults,
  deriveIdentityLabel,
  pickTitleQuestion,
  computeMatchScore,
  buildShareSummary,
  lookupLoneliestTitle,
} from "../lib/resultSummary.js";
import { pickRecommendedQuizzes } from "../lib/recommend.js";
import { canUseWebShare, shareResult, copyResultLink } from "../lib/share.js";
import { buildResultUrl } from "../lib/resultUrl.js";
import { trackEvent } from "../lib/analytics.js";
import { quizPageTitle } from "../lib/pageTitle.js";

export async function renderQuizFlow(app, { slug }) {
  let quiz;
  try {
    quiz = await fetchQuiz(slug);
  } catch (err) {
    // 只有「題庫不存在」(含已下架的 slug,如 /quiz/demo)走此提示;其他錯誤照舊
    // 往外拋,不吞掉。它與 stats 抓取失敗(showStatsError)是兩條獨立錯誤路徑。
    if (!(err instanceof QuizNotFoundError)) throw err;
    app.innerHTML = `
      <section class="not-found">
        <p>找不到題庫</p>
        <a class="btn-secondary" href="/" data-link>回首頁</a>
      </section>
    `;
    return;
  }
  // 分頁標題與該題庫的 OG 靜態頁 <title> 一致(共用 pageTitle.js,見 router.js 註解)。
  document.title = quizPageTitle(quiz);
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
  /** 目前這題「進入題目頁面」的時間戳(performance.now()),供 goNext 算作答耗時
   *  (孤獨稱號選題新規則,規格書 §2.4 擴充,2026-07-17 定案)。 */
  let questionStartedAt = null;

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
    try {
      snapshot = await fetchStats(slug);
    } catch {
      // stats 抓取整體失敗(網路錯誤、5xx):不進入題目頁,顯示可重試錯誤。
      showStatsError();
      return;
    }
    trackEvent("quiz_start", { quizId: slug });

    const nextUnanswered = firstUnansweredQuestionId(progress, questionIds);
    const startId = nextUnanswered ?? questionIds[0]; // 全答完(重玩)則從第一題開始
    currentIndex = questionIds.indexOf(startId);
    showQuestion();
  }

  // ---- 統計快照抓取失敗:簡單的可重試錯誤畫面 ----
  function showStatsError() {
    app.innerHTML = `
      <section class="quiz-intro">
        <p class="quiz-intro__error">載入失敗,請再試一次</p>
        <button type="button" class="btn-primary" data-retry>重試</button>
      </section>
    `;
    app.querySelector("[data-retry]").addEventListener("click", startFlow);
  }

  // ---- 單題畫面 ----
  function showQuestion() {
    const question = quiz.questions[currentIndex];
    const total = questionIds.length;
    const previousChoice = progress.answers[question.id]; // 重玩情境下才會有值
    questionStartedAt = performance.now(); // 計時起點:進入這題的時間戳。

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

    // 快照缺該題 key 時(合法情境:新題尚未種子票)防呆為 {a:0,b:0},
    // 比例仍照「快照 + 自己一票」規則計算。
    const questionSnapshot = snapshot[question.id] ?? { a: 0, b: 0 };
    const { aPercent, bPercent } = computeRatio(questionSnapshot, choice);
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
    trackEvent("question_answered", { quizId: slug, questionId: question.id, choice });
    const { progress: nextProgress, isFirstAnswer } = recordAnswer(progress, question.id, choice);
    progress = nextProgress;

    // 計時(孤獨稱號選題新規則,規格書 §2.4 擴充,2026-07-17 定案):只在這題「本輪」
    // 實際點選過選項時才記錄/覆寫耗時,避免中斷續玩或重玩時已答但沒重新點選的題被
    // 誤記成假的短時間(目前 UI 下「下一題」按鈕須點選才會啟用,此判斷恆為 true,
    // 但仍照規格明確判斷,避免未來 UI 改動後行為跑掉)。
    if (Object.prototype.hasOwnProperty.call(currentChoices, question.id)) {
      const elapsedMs = Math.round(performance.now() - questionStartedAt);
      progress = recordQuestionTime(progress, question.id, elapsedMs);
    }

    if (isFirstAnswer) {
      // pendingVotes 可能已被前一題背景送票的成功回呼直接改寫 localStorage(見
      // src/lib/voteQueue.js 的 sendVote),但那個回呼不會更新這裡的記憶體內 progress
      // 變數。寫入新 pending 前先同步一次最新的 pendingVotes,否則會用記憶體裡的舊值
      // 整包覆寫回去,把剛清除的 pending 重新救回來(答完題但 pending 卻沒清空)。
      progress = { ...progress, pendingVotes: getQuizProgress(slug).pendingVotes };
      // 先把答案、sessionId、pendingVotes 一起原子寫入 localStorage,再背景送出
      // (規格書 §5.2、§6,Phase 2.6):即使送票失敗或分頁立刻關閉,pending 紀錄
      // 已經落地,開站 / 恢復連線時仍能補送。
      progress = ensureSessionId(progress, generateSessionId);
      progress = queuePendingVote(progress, question.id, choice, Date.now());
    }
    saveQuizProgress(slug, progress);

    if (isFirstAnswer) {
      sendVote(slug, question.id, choice, progress.sessionId); // 不 await,不阻塞切題。
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
    trackEvent("quiz_completed", { quizId: slug });
    showComplete();
  }

  // ---- 完成頁:正式總結卡(規格書 §2.4;開發設計方針.md > Phase 3) ----
  function showComplete() {
    // 總結卡用「本輪選擇」覆蓋 answers(2026-07-17 code review 修正,推翻原「一律取
    // progress.answers」決策;見 開發設計方針.md > 資料推導:src/lib/resultSummary.js):
    // { ...progress.answers, ...currentChoices } 讓重玩時本輪選了不同答案也能反映在總結卡,
    // 首次作答兩者同值不受影響。snapshot 仍是開始作答時抓的快照,與答題頁 selectChoice
    // 用同一套 computeRatio,口徑一致(§2.4 驗收)。送票邏輯(recordAnswer/hasAnswered/
    // progress.answers 本身)完全不受影響,「已答不重送」語意不變。
    const results = computeQuestionResults(quiz, { ...progress.answers, ...currentChoices }, snapshot);
    const total = results.length;
    const minorityCount = results.filter((r) => r.isMinority).length;
    const identityLabel = deriveIdentityLabel(minorityCount, total);
    // 孤獨稱號選題新規則(規格書 §2.4 擴充,2026-07-17 定案,取代單純比 percent 的舊制;
    // 決策背景見 開發設計方針.md > Phase 3.5 補充):選題池內比作答耗時
    // (progress.questionTimes),最短者得稱號;池內無計時資料時 fallback 回 percent
    // 最低者;全站多數派時 mainstream fallback 完全不變。
    const loneliest = pickTitleQuestion(results, progress.questionTimes);
    const matchScore = computeMatchScore(results);
    // 孤獨稱號查表(規格書 §2.4 擴充,Phase 3.5):題庫無 titles 欄位時回傳 null,
    // 勳章元件不顯示、分享文字沿用 Phase 3 原格式(降級,demo 等舊題庫零改動)。
    const loneliestTitle = lookupLoneliestTitle(quiz, loneliest);
    // 分享文字計時句(規格書 §2.4 擴充,2026-07-17 定案):非 fallback 時才查耗時,
    // 沒有這題計時資料(池內 fallback 到 percent 最低者的情境)時 elapsedMs 為
    // undefined,buildShareSummary 內部據此不加計時句。
    const elapsedMs = loneliest.isFallback ? undefined : progress.questionTimes[loneliest.id];
    const shareText = buildShareSummary(
      minorityCount,
      total,
      loneliest,
      identityLabel,
      loneliestTitle,
      elapsedMs
    );
    // 分享連結(規格書 §9 Phase 7,2026-07-20 修訂):有稱號的題庫指向
    // /quiz/<id>/r/<稱號id>(無 query;組法見 src/lib/resultUrl.js)——稱號路徑只為
    // LINE/FB 抓對應 OG 卡,點開直接落題庫首頁;分享「文字」維持現狀不動。
    // 無 titles 的題庫沒有稱號 id 可指,降級沿用題庫首頁連結。
    const titleKey = loneliest.isFallback ? "mainstream" : loneliest.id;
    const shareUrl = loneliestTitle
      ? buildResultUrl(location.origin, slug, titleKey)
      : `${location.origin}/quiz/${slug}`;
    const shareLabel = canUseWebShare() ? "分享結果" : "複製連結";

    // 標籤文字(規格書 §2.4 擴充,2026-07-17 定案):新規則選出的題不一定是絕對最低 %,
    // 少數派分支的標籤文字改為「你的孤獨代表作」;mainstream fallback 分支「你最大眾
    // 的一題」不變。
    const percentLabel = loneliest.isFallback ? "你最大眾的一題" : "你的孤獨代表作";
    const percentLine = loneliest.isFallback
      ? `<strong>${loneliest.percent}%</strong> 的人都和你一樣`
      : `只有 <strong>${loneliest.percent}%</strong> 的人和你一樣`;
    const loneliestHtml = `<p class="result-hero__lonely-label">${percentLabel}</p>
         <p class="result-hero__lonely-text">${loneliest.text}</p>
         <p class="result-hero__lonely-percent">${percentLine}</p>`;

    // 勳章元件三態(總結卡改版,2026-07-18 站方拍板):
    // 1. loneliestTitle 為 null:維持原樣,badgeHtml 就是 loneliestHtml(零改動)。
    // 2. loneliestTitle 有值但無 img:維持現有版面(稱號名 + loneliestHtml + 判詞,零改動)。
    // 3. loneliestTitle.img 有值:上半改成「徽章圖(雙環框)+ 稱號名/標籤/代表作題目」
    //    橫向並排、整組置中的新版面;下半(比例句 + 判詞)照舊置中,fallback 文案邏輯不變。
    let badgeHtml;
    if (!loneliestTitle) {
      badgeHtml = loneliestHtml;
    } else if (!loneliestTitle.img) {
      badgeHtml = `<p class="result-badge__name">${loneliestTitle.name}</p>
         ${loneliestHtml}
         <p class="result-badge__blurb">${loneliestTitle.blurb}</p>`;
    } else {
      badgeHtml = `
        <div class="result-badge__top">
          <img class="result-badge__img" src="${loneliestTitle.img}" alt="${loneliestTitle.name}" />
          <div class="result-badge__info">
            <p class="result-badge__name">${loneliestTitle.name}</p>
            <p class="result-hero__lonely-label">${percentLabel}</p>
            <p class="result-hero__lonely-text">${loneliest.text}</p>
          </div>
        </div>
        <p class="result-hero__lonely-percent">${percentLine}</p>
        <p class="result-badge__blurb">${loneliestTitle.blurb}</p>`;
    }

    app.innerHTML = `
      <section class="result-card">
        <div class="result-hero">
          <p class="result-hero__label">${identityLabel} · 你在 ${minorityCount}/${total} 題站在少數派</p>
          <div class="result-hero__lonely${loneliestTitle ? " result-badge" : ""}">${badgeHtml}</div>
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

        <div class="result-share">
          <button type="button" class="btn-primary" data-share>${shareLabel}</button>
          <p class="result-share__feedback" data-share-feedback hidden></p>
        </div>

        <div class="result-recommend" data-recommend hidden>
          <h2 class="result-recommend__title">你可能也想玩</h2>
          <div class="result-recommend__list" data-recommend-list></div>
        </div>

        <p class="result-channel"><a href="/" data-link>你是哪一派?· 更多趣味測驗</a></p>

        <div class="result-actions">
          <button type="button" class="btn-secondary" data-replay>再玩一次</button>
          <a class="btn-secondary" href="/" data-link>回首頁</a>
        </div>
      </section>
    `;

    wireShareButton(shareText, shareUrl);
    loadRecommendations();

    app.querySelector("[data-replay]").addEventListener("click", () => {
      animatedQuestions.clear();
      showIntro();
    });
  }

  // ---- 分享 / 複製連結按鈕(規格書 §2.4:Web Share 優先,不支援時 fallback 複製連結) ----
  function wireShareButton(shareText, shareUrl) {
    const shareBtn = app.querySelector("[data-share]");
    const feedbackEl = app.querySelector("[data-share-feedback]");
    let feedbackTimer;

    shareBtn.addEventListener("click", async () => {
      trackEvent("share_clicked", { quizId: slug });

      if (canUseWebShare()) {
        try {
          await shareResult(shareText, shareUrl);
        } catch {
          // 使用者取消分享(AbortError)或環境限制:規格未要求顯示錯誤提示,靜默即可。
        }
        return;
      }

      const ok = await copyResultLink(shareText, shareUrl);
      feedbackEl.hidden = false;
      feedbackEl.textContent = ok ? "已複製連結!" : "複製失敗,請手動複製連結";
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        feedbackEl.hidden = true;
      }, 2000);
    });
  }

  // ---- 「你可能也想玩」導流卡(規格書 §2.4:2 個其他題庫,不含當前題庫) ----
  async function loadRecommendations() {
    const manifest = await fetchManifest();
    const recommended = pickRecommendedQuizzes(manifest.quizzes, slug, 2);
    if (recommended.length === 0) return; // 站上題庫不足時不顯示空區塊(見方針 Phase 3 決策)。

    const sectionEl = app.querySelector("[data-recommend]");
    const listEl = app.querySelector("[data-recommend-list]");
    if (!sectionEl || !listEl) return; // 使用者在 fetchManifest resolve 前已切走(如按了「再玩一次」)。

    listEl.innerHTML = recommended.map(renderRecommendCard).join("");
    sectionEl.hidden = false;
  }

  function renderRecommendCard(recommendedQuiz) {
    return `
      <a class="quiz-card" href="/quiz/${recommendedQuiz.id}" data-link>
        <img class="quiz-card__cover" src="${recommendedQuiz.cover}" alt="${recommendedQuiz.title}" />
        <div class="quiz-card__body">
          <h2 class="quiz-card__title">${recommendedQuiz.title}</h2>
          <p class="quiz-card__meta">共 ${recommendedQuiz.questionCount} 題</p>
        </div>
      </a>
    `;
  }
}
