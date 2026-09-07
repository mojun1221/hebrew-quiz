const STORAGE_KEY = 'biblicalHebrewQuiz.v2';
const state = loadState();

let selectedMode = 'consonant';
let practiceMode = 'normal';
let quizQueue = [];
let currentIndex = 0;
let answered = false;

const els = {
  tabs: [...document.querySelectorAll('.tab')],
  modeBtns: [...document.querySelectorAll('.mode-btn')],
  modePicker: document.getElementById('modePicker'),
  views: {
    quiz: document.getElementById('quizView'),
    wrong: document.getElementById('wrongView'),
    wrongQuiz: document.getElementById('wrongQuizView'),
    rank: document.getElementById('rankView')
  },
  progressText: document.getElementById('progressText'),
  accuracyText: document.getElementById('accuracyText'),
  correctText: document.getElementById('correctText'),
  wrongText: document.getElementById('wrongText'),
  wrongCountBadge: document.getElementById('wrongCountBadge'),
  modeLabel: document.getElementById('modeLabel'),
  questionNo: document.getElementById('questionNo'),
  hebrewGlyph: document.getElementById('hebrewGlyph'),
  questionHint: document.getElementById('questionHint'),
  answerForm: document.getElementById('answerForm'),
  answerInput: document.getElementById('answerInput'),
  submitBtn: document.getElementById('submitBtn'),
  feedback: document.getElementById('feedback'),
  nextBtn: document.getElementById('nextBtn'),
  skipBtn: document.getElementById('skipBtn'),
  resetBtn: document.getElementById('resetBtn'),
  clearWrongBtn: document.getElementById('clearWrongBtn'),
  wrongList: document.getElementById('wrongList'),
  wrongQuizGuide: document.getElementById('wrongQuizGuide'),
  startWrongQuizBtn: document.getElementById('startWrongQuizBtn'),

  rankConnectionText: document.getElementById('rankConnectionText'),
  rankLoginPanel: document.getElementById('rankLoginPanel'),
  rankNicknamePanel: document.getElementById('rankNicknamePanel'),
  rankProfilePanel: document.getElementById('rankProfilePanel'),
  rankPlayPanel: document.getElementById('rankPlayPanel'),
  rankResultPanel: document.getElementById('rankResultPanel'),
  rankLoginBtn: document.getElementById('rankLoginBtn'),
  rankLogoutBtn: document.getElementById('rankLogoutBtn'),
  rankNicknameForm: document.getElementById('rankNicknameForm'),
  rankNicknameInput: document.getElementById('rankNicknameInput'),
  rankNicknameError: document.getElementById('rankNicknameError'),
  rankPlayerName: document.getElementById('rankPlayerName'),
  rankPersonalBest: document.getElementById('rankPersonalBest'),
  rankPersonalDetail: document.getElementById('rankPersonalDetail'),
  rankMyPosition: document.getElementById('rankMyPosition'),
  rankStartBtn: document.getElementById('rankStartBtn'),
  rankProgress: document.getElementById('rankProgress'),
  rankTimer: document.getElementById('rankTimer'),
  rankGlyph: document.getElementById('rankGlyph'),
  rankAnswerForm: document.getElementById('rankAnswerForm'),
  rankAnswerInput: document.getElementById('rankAnswerInput'),
  rankSkipBtn: document.getElementById('rankSkipBtn'),
  rankResultCorrect: document.getElementById('rankResultCorrect'),
  rankResultTime: document.getElementById('rankResultTime'),
  rankResultScore: document.getElementById('rankResultScore'),
  rankResultBest: document.getElementById('rankResultBest'),
  rankBackBtn: document.getElementById('rankBackBtn'),
  rankLeaderboardBody: document.getElementById('rankLeaderboardBody'),
  rankRefreshBtn: document.getElementById('rankRefreshBtn')
};

function defaultState() {
  return { correct: 0, wrong: 0, attempts: 0, wrongNotes: {} };
}

function loadState() {
  try {
    return {
      ...defaultState(),
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalize(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[+,&/·]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[.,!?"'()[\]{}]/g, '');
}

function shuffle(a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

function modeName(m) {
  return m === 'consonant' ? '자음' : m === 'vowel' ? '모음' : '자음 + 모음';
}

function baseQuestions(mode) {
  if (mode === 'consonant') {
    return CONSONANTS.map(c => ({
      id: 'c-' + c.id,
      mode,
      glyph: c.glyph,
      answers: c.answers,
      displayAnswer: c.answers[0]
    }));
  }

  if (mode === 'vowel') {
    return VOWELS.map(v => ({
      id: 'v-' + v.id,
      mode,
      glyph: v.demo,
      answers: v.answers,
      displayAnswer: v.answers[0]
    }));
  }

  const pairs = [];

  CONSONANTS
    .filter(c => !['shin', 'sin'].includes(c.id))
    .forEach(c => {
      VOWELS.forEach(v => {
        const comboAnswers = [];

        c.answers.forEach(ca => {
          v.answers.forEach(va => {
            comboAnswers.push(`${ca} ${va}`, `${ca}+${va}`);
          });
        });

        pairs.push({
          id: `cv-${c.id}-${v.id}`,
          mode,
          glyph: c.glyph + v.mark,
          answers: comboAnswers,
          displayAnswer: `${c.answers[0]} + ${v.answers[0]}`
        });
      });
    });

  return pairs;
}

function makeQueue() {
  quizQueue = shuffle(baseQuestions(selectedMode));
  currentIndex = 0;
  practiceMode = 'normal';
  renderQuestion();
}

function getCurrentQuestion() {
  return quizQueue[currentIndex] || null;
}

function setView(name) {
  Object.entries(els.views).forEach(([key, element]) => {
    element.classList.toggle('active', key === name);
  });

  // 랭크는 별도 상단 메뉴가 아니라 "문제 풀이" 안의 한 유형이다.
  els.tabs.forEach(tab => {
    const activeView = name === 'rank' ? 'quiz' : name;
    tab.classList.toggle('active', tab.dataset.view === activeView);
  });

  if (els.modePicker) {
    els.modePicker.classList.toggle('hidden', !['quiz', 'rank'].includes(name));
  }

  if (name === 'wrong') renderWrongNotes();
  if (name === 'wrongQuiz') updateWrongQuizGuide();
  if (name === 'rank') refreshRankUI();
}

function focusAnswerInput() {
  if (!els.answerInput || els.answerInput.disabled) return;

  requestAnimationFrame(() => {
    try {
      els.answerInput.focus({ preventScroll: true });
    } catch {
      els.answerInput.focus();
    }
  });
}

function renderQuestion() {
  answered = false;

  const q = getCurrentQuestion();
  const total = quizQueue.length;

  els.modeLabel.textContent =
    practiceMode === 'wrong' ? '오답 복습' : modeName(selectedMode);

  els.questionNo.textContent = `문제 ${q ? currentIndex + 1 : 0} / ${total}`;
  els.progressText.textContent = `${q ? currentIndex + 1 : total} / ${total}`;

  els.answerInput.value = '';
  els.answerInput.disabled = !q;
  els.submitBtn.disabled = !q;
  els.nextBtn.classList.add('hidden');

  els.feedback.className = 'feedback';
  els.feedback.textContent = '';

  if (!q) {
    els.hebrewGlyph.textContent = '—';
    els.questionHint.textContent =
      practiceMode === 'wrong' ? '복습할 오답이 없습니다.' : '문제가 없습니다.';
    updateStats();
    return;
  }

  els.hebrewGlyph.textContent = q.glyph;

  els.questionHint.textContent =
    q.mode === 'consonant'
      ? '이 자음의 이름을 입력하세요.'
      : q.mode === 'vowel'
        ? '표시된 모음의 이름을 입력하세요.'
        : '자음 이름과 모음 이름을 함께 입력하세요.';

  els.answerInput.placeholder =
    q.mode === 'combined'
      ? '예: 베트 카메츠'
      : q.mode === 'vowel'
        ? '예: 카메츠'
        : '예: 알레프';

  updateStats();
}

function updateStats() {
  const accuracy = state.attempts
    ? Math.round((state.correct / state.attempts) * 100)
    : 0;

  els.accuracyText.textContent = accuracy + '%';
  els.correctText.textContent = state.correct;
  els.wrongText.textContent = state.wrong;
  els.wrongCountBadge.textContent = Object.keys(state.wrongNotes).length;
}

function submitAnswer() {
  if (answered) return;

  const q = getCurrentQuestion();
  if (!q) return;

  const raw = els.answerInput.value;

  if (!raw.trim()) {
    els.feedback.className = 'feedback show wrong';
    els.feedback.textContent = '정답을 입력하세요.';
    focusAnswerInput();
    return;
  }

  const MASTER_CODE = '01048463622';

  const ok =
    raw.trim() === MASTER_CODE ||
    q.answers.map(normalize).includes(normalize(raw));

  answered = true;
  state.attempts++;

  if (ok) {
    state.correct++;
    els.feedback.className = 'feedback show correct';
    els.feedback.textContent = '정답입니다.';

    if (practiceMode === 'wrong') {
      delete state.wrongNotes[q.id];
    }
  } else {
    state.wrong++;

    state.wrongNotes[q.id] = {
      id: q.id,
      mode: q.mode,
      glyph: q.glyph,
      yourAnswer: raw,
      correctAnswer: q.displayAnswer,
      answers: q.answers,
      missedAt: new Date().toISOString()
    };

    els.feedback.className = 'feedback show wrong';
    els.feedback.innerHTML =
      `오답입니다. 정답: <strong>${escapeHtml(q.displayAnswer)}</strong>`;
  }

  saveState();
  updateStats();

  // 중요:
  // 입력창을 disabled/readOnly로 바꾸지 않는다.
  // iPhone 키보드가 내려가지 않게 유지한다.
  els.submitBtn.disabled = true;
  els.nextBtn.classList.remove('hidden');

  focusAnswerInput();
}

function nextQuestion() {
  currentIndex++;

  if (currentIndex >= quizQueue.length) {
    els.hebrewGlyph.textContent = '✓';
    els.questionHint.textContent = '이 유형의 문제를 모두 풀었습니다.';
    els.feedback.className = 'feedback show correct';
    els.feedback.textContent =
      '완료! 같은 유형을 다시 누르면 새 순서로 섞입니다.';

    els.nextBtn.classList.add('hidden');
    els.answerInput.disabled = true;
    els.submitBtn.disabled = true;

    updateStats();
    return;
  }

  renderQuestion();
}

function skipQuestion() {
  if (!getCurrentQuestion()) return;
  currentIndex = (currentIndex + 1) % quizQueue.length;
  renderQuestion();
}

function renderWrongNotes() {
  const notes = Object.values(state.wrongNotes).sort((a, b) =>
    (b.missedAt || '').localeCompare(a.missedAt || '')
  );

  if (!notes.length) {
    els.wrongList.innerHTML =
      '<div class="empty-note">현재 오답이 없습니다.</div>';
    return;
  }

  els.wrongList.innerHTML = notes
    .map(
      n => `
        <article class="wrong-item">
          <div class="wrong-glyph" dir="rtl">${escapeHtml(n.glyph)}</div>
          <div class="wrong-meta">
            <div><strong>유형:</strong> ${modeName(n.mode)}</div>
            <div><strong>내 답:</strong> ${escapeHtml(n.yourAnswer || '-')}</div>
            <div><strong>정답:</strong> ${escapeHtml(n.correctAnswer || '-')}</div>
          </div>
        </article>
      `
    )
    .join('');
}

function startWrongQuiz() {
  const all = [
    ...baseQuestions('consonant'),
    ...baseQuestions('vowel'),
    ...baseQuestions('combined')
  ];

  const ids = new Set(Object.keys(state.wrongNotes));
  quizQueue = shuffle(all.filter(q => ids.has(q.id)));

  currentIndex = 0;
  practiceMode = 'wrong';

  setView('quiz');
  renderQuestion();
}

function updateWrongQuizGuide() {
  const count = Object.keys(state.wrongNotes).length;

  els.wrongQuizGuide.textContent = count
    ? `현재 ${count}개의 오답을 다시 풀 수 있습니다.`
    : '오답이 생기면 여기서 다시 풀 수 있습니다.';

  els.startWrongQuizBtn.disabled = count === 0;
}

function resetAll() {
  if (!confirm('정답/오답 기록과 오답노트를 모두 초기화할까요?')) return;

  Object.assign(state, defaultState());
  saveState();

  makeQueue();
  renderWrongNotes();
  updateWrongQuizGuide();
}

function clearWrongNotes() {
  if (!confirm('오답노트만 비울까요?')) return;

  state.wrongNotes = {};
  saveState();

  renderWrongNotes();
  updateWrongQuizGuide();
  updateStats();
}

function escapeHtml(v = '') {
  return String(v).replace(
    /[&<>'"]/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#039;',
        '"': '&quot;'
      })[c]
  );
}

// Enter/키보드 확인:
// 1번째 = 채점
// 채점 후 2번째 = 다음 문제
els.answerForm.addEventListener('submit', e => {
  e.preventDefault();
  submitAnswer();
});

els.answerInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;

  e.preventDefault();

  if (answered) {
    nextQuestion();
  } else {
    submitAnswer();
  }
});

els.nextBtn.addEventListener('click', nextQuestion);
els.skipBtn.addEventListener('click', skipQuestion);
els.resetBtn.addEventListener('click', resetAll);
els.clearWrongBtn.addEventListener('click', clearWrongNotes);
els.startWrongQuizBtn.addEventListener('click', startWrongQuiz);

els.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.view;

    if (view === 'quiz') {
      const rankSelected = els.modeBtns.some(
        button => button.dataset.mode === 'rank' && button.classList.contains('active')
      );

      if (rankSelected) {
        setView('rank');
        return;
      }

      if (practiceMode === 'wrong') {
        makeQueue();
      }
    }

    setView(view);
  });
});

els.modeBtns.forEach(button => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;

    els.modeBtns.forEach(x => {
      x.classList.toggle('active', x === button);
    });

    if (mode === 'rank') {
      setView('rank');
      return;
    }

    selectedMode = mode;
    makeQueue();
    setView('quiz');
  });
});


// ============================================================
// 랭크 모드
// - 자음 + 모음 문제만
// - 25문항
// - 제한시간 85초
// - 점수 = 정답 × 800 + 남은 완전한 시간(초) × 25
// ============================================================

const RANK_QUESTION_COUNT = 25;
const RANK_LIMIT_MS = 85_000;
const RANK_CORRECT_POINT = 800;
const RANK_TIME_POINT = 25;

const rankState = {
  user: null,
  profile: null,
  queue: [],
  index: 0,
  correct: 0,
  skipped: 0,
  startedAt: 0,
  endAt: 0,
  timerId: null,
  running: false,
  saving: false
};

function rankBackendReady() {
  return Boolean(window.rankBackend && window.rankBackend.isConfigured);
}

function setRankConnection(text) {
  if (els.rankConnectionText) {
    els.rankConnectionText.textContent = text;
  }
}

function showRankPanel(panel) {
  [
    els.rankLoginPanel,
    els.rankNicknamePanel,
    els.rankProfilePanel,
    els.rankPlayPanel,
    els.rankResultPanel
  ].forEach(element => {
    if (element) element.classList.add('hidden');
  });

  if (panel) panel.classList.remove('hidden');
}

function formatRankTime(ms) {
  return `${(Number(ms || 0) / 1000).toFixed(1)}초`;
}

async function refreshRankUI() {
  if (!els.rankLoginPanel) return;

  if (!rankBackendReady()) {
    setRankConnection(
      'Google 로그인 설정이 필요합니다. firebase-config.js와 Firebase Authentication 설정을 확인하세요.'
    );

    showRankPanel(els.rankLoginPanel);

    if (els.rankLoginBtn) {
      els.rankLoginBtn.disabled = false;
      els.rankLoginBtn.textContent = 'Google로 로그인';
    }

    await refreshLeaderboard();
    return;
  }

  if (els.rankLoginBtn) {
    els.rankLoginBtn.disabled = false;
  }

  setRankConnection('온라인 랭킹 연결됨');

  if (rankState.running || rankState.saving) {
    return;
  }

  if (!rankState.user) {
    showRankPanel(els.rankLoginPanel);
  } else if (!rankState.profile) {
    showRankPanel(els.rankNicknamePanel);
  } else {
    showRankPanel(els.rankProfilePanel);
    renderRankProfile();
  }

  await refreshLeaderboard();
}

function renderRankProfile() {
  const profile = rankState.profile;
  if (!profile) return;

  els.rankPlayerName.textContent = profile.nickname || '-';

  if (Number(profile.bestScore || 0) > 0) {
    els.rankPersonalBest.textContent =
      `${Number(profile.bestScore).toLocaleString()}점`;

    els.rankPersonalDetail.textContent =
      `${Number(profile.bestCorrect || 0)} / 25 · ` +
      `${formatRankTime(profile.bestTimeMs || 0)}`;
  } else {
    els.rankPersonalBest.textContent = '기록 없음';
    els.rankPersonalDetail.textContent =
      '첫 랭크에 도전해보세요.';
  }

  els.rankMyPosition.textContent =
    profile.currentRank ? `${profile.currentRank}위` : '-';
}

function makeRankQueue() {
  // 랭크는 오직 자음 + 모음 조합 문제만 사용
  return shuffle(baseQuestions('combined'))
    .slice(0, RANK_QUESTION_COUNT);
}

function startRank() {
  if (!rankState.user || !rankState.profile) return;
  if (rankState.running || rankState.saving) return;

  rankState.queue = makeRankQueue();
  rankState.index = 0;
  rankState.correct = 0;
  rankState.skipped = 0;
  rankState.startedAt = performance.now();
  rankState.endAt = rankState.startedAt + RANK_LIMIT_MS;
  rankState.running = true;

  showRankPanel(els.rankPlayPanel);

  renderRankQuestion();
  updateRankTimer();

  clearInterval(rankState.timerId);
  rankState.timerId = setInterval(updateRankTimer, 100);
}

function renderRankQuestion() {
  if (!rankState.running) return;

  const q = rankState.queue[rankState.index];

  if (!q) {
    finishRank(false);
    return;
  }

  els.rankProgress.textContent =
    `${rankState.index + 1} / ${RANK_QUESTION_COUNT}`;

  els.rankGlyph.textContent = q.glyph;
  els.rankAnswerInput.value = '';
  els.rankAnswerInput.disabled = false;
}

function submitRankAnswer() {
  if (!rankState.running) return;

  const q = rankState.queue[rankState.index];
  if (!q) return;

  const raw = els.rankAnswerInput.value;

  if (!raw.trim()) {
    return;
  }

  const ok =
    q.answers.map(normalize).includes(normalize(raw));

  if (ok) {
    rankState.correct++;
  }

  advanceRankQuestion();
}

function skipRankQuestion() {
  if (!rankState.running) return;

  rankState.skipped++;
  advanceRankQuestion();
}

function advanceRankQuestion() {
  rankState.index++;

  if (rankState.index >= RANK_QUESTION_COUNT) {
    finishRank(false);
    return;
  }

  renderRankQuestion();

  // 첫 문제에서는 자동 키보드 팝업을 만들지 않지만,
  // 사용자가 입력을 시작한 뒤에는 다음 문제에서도 키보드를 유지.
  requestAnimationFrame(() => {
    try {
      els.rankAnswerInput.focus({ preventScroll: true });
    } catch {
      els.rankAnswerInput.focus();
    }
  });
}

function updateRankTimer() {
  if (!rankState.running) return;

  const remainingMs =
    Math.max(0, rankState.endAt - performance.now());

  els.rankTimer.textContent =
    (remainingMs / 1000).toFixed(1);

  if (remainingMs <= 0) {
    finishRank(true);
  }
}

function getRankResult(timedOut) {
  const now = performance.now();

  const elapsedMs = timedOut
    ? RANK_LIMIT_MS
    : Math.min(
        RANK_LIMIT_MS,
        Math.max(0, now - rankState.startedAt)
      );

  const remainingMs =
    Math.max(0, RANK_LIMIT_MS - elapsedMs);

  const remainingSeconds =
    Math.floor(remainingMs / 1000);

  const score =
    rankState.correct * RANK_CORRECT_POINT +
    remainingSeconds * RANK_TIME_POINT;

  return {
    correct: rankState.correct,
    timeMs: Math.round(elapsedMs),
    score
  };
}

async function finishRank(timedOut = false) {
  if (!rankState.running || rankState.saving) return;

  rankState.running = false;
  rankState.saving = true;

  clearInterval(rankState.timerId);
  rankState.timerId = null;

  const result = getRankResult(timedOut);

  els.rankAnswerInput.disabled = true;

  els.rankResultCorrect.textContent =
    `${result.correct} / ${RANK_QUESTION_COUNT}`;

  els.rankResultTime.textContent =
    formatRankTime(result.timeMs);

  els.rankResultScore.textContent =
    `${result.score.toLocaleString()}점`;

  els.rankResultBest.textContent =
    '기록 저장 중...';

  showRankPanel(els.rankResultPanel);

  try {
    const saved =
      await window.rankBackend.submitScore(result);

    rankState.profile = saved.profile;

    els.rankResultBest.textContent =
      saved.isNewBest
        ? '새 개인 최고 기록!'
        : `개인 최고 ${Number(
            saved.profile.bestScore || 0
          ).toLocaleString()}점`;

    await refreshLeaderboard();
  } catch (err) {
    console.error(err);

    els.rankResultBest.textContent =
      '온라인 기록 저장에 실패했습니다.';
  } finally {
    rankState.saving = false;
  }
}

async function refreshLeaderboard() {
  if (!els.rankLeaderboardBody) return;

  if (!rankBackendReady()) {
    els.rankLeaderboardBody.innerHTML =
      '<tr><td colspan="5" class="rank-empty">' +
      'Firebase 연결 후 TOP 50이 표시됩니다.' +
      '</td></tr>';

    return;
  }

  els.rankLeaderboardBody.innerHTML =
    '<tr><td colspan="5" class="rank-empty">' +
    '랭킹 불러오는 중...' +
    '</td></tr>';

  try {
    const rows =
      await window.rankBackend.getTop50();

    if (!rows.length) {
      els.rankLeaderboardBody.innerHTML =
        '<tr><td colspan="5" class="rank-empty">' +
        '아직 등록된 기록이 없습니다.' +
        '</td></tr>';

      return;
    }

    els.rankLeaderboardBody.innerHTML =
      rows.map((player, index) => {
        const isMe =
          rankState.user &&
          player.uid === rankState.user.uid;

        return `
          <tr class="${isMe ? 'is-me' : ''}">
            <td>${index + 1}</td>
            <td>${escapeHtml(player.nickname || '-')}</td>
            <td>${Number(player.bestScore || 0).toLocaleString()}</td>
            <td>${Number(player.bestCorrect || 0)} / 25</td>
            <td>${formatRankTime(player.bestTimeMs || 0)}</td>
          </tr>
        `;
      }).join('');

  } catch (err) {
    console.error(err);

    els.rankLeaderboardBody.innerHTML =
      '<tr><td colspan="5" class="rank-empty">' +
      '랭킹을 불러오지 못했습니다.' +
      '</td></tr>';
  }
}

async function handleRankAuthState(user) {
  rankState.user = user || null;
  rankState.profile = null;

  if (!user) {
    await refreshRankUI();
    return;
  }

  try {
    const profile =
      await window.rankBackend.getMyProfile();

    rankState.profile = profile;

    if (
      rankState.profile &&
      Number(rankState.profile.bestScore || 0) > 0
    ) {
      rankState.profile.currentRank =
        await window.rankBackend.getMyRank(
          rankState.profile.rankSortKey || 0
        );
    }

    await refreshRankUI();

  } catch (err) {
    console.error(err);
    setRankConnection(
      '랭크 프로필을 불러오지 못했습니다.'
    );
  }
}

window.addEventListener(
  'rank-backend-ready',
  () => {
    if (!rankBackendReady()) {
      refreshRankUI();
      return;
    }

    window.rankBackend.subscribeAuth(
      handleRankAuthState
    );

    refreshRankUI();
  }
);

if (els.rankLoginBtn) {
  els.rankLoginBtn.addEventListener(
    'click',
    async () => {
      if (!rankBackendReady()) {
        setRankConnection(
          'Firebase 설정이 아직 없습니다. firebase-config.js의 YOUR_... 값을 실제 Firebase 웹 앱 설정값으로 바꿔야 합니다.'
        );
        return;
      }

      els.rankLoginBtn.disabled = true;
      els.rankLoginBtn.textContent = '로그인 중...';

      try {
        await window.rankBackend.signIn();
      } catch (err) {
        console.error(err);

        const code = err?.code || 'unknown';
        const messages = {
          'auth/unauthorized-domain': '현재 GitHub Pages 주소가 Firebase 허용 도메인에 없습니다.',
          'auth/popup-blocked': '브라우저가 Google 로그인 팝업을 차단했습니다.',
          'auth/popup-closed-by-user': 'Google 로그인 창이 닫혔습니다.',
          'auth/cancelled-popup-request': '이미 다른 로그인 창이 열려 있습니다.',
          'auth/operation-not-allowed': 'Firebase Authentication에서 Google 로그인이 활성화되지 않았습니다.',
          'auth/invalid-api-key': 'firebase-config.js의 API Key가 올바르지 않습니다.'
        };

        setRankConnection(
          messages[code] || `Google 로그인 실패: ${code}`
        );
      } finally {
        els.rankLoginBtn.disabled = false;
        els.rankLoginBtn.textContent = 'Google로 로그인';
      }
    }
  );
}

if (els.rankLogoutBtn) {
  els.rankLogoutBtn.addEventListener(
    'click',
    async () => {
      if (rankState.running || rankState.saving) {
        return;
      }

      await window.rankBackend.signOut();
    }
  );
}

if (els.rankNicknameForm) {
  els.rankNicknameForm.addEventListener(
    'submit',
    async e => {
      e.preventDefault();

      const nickname =
        els.rankNicknameInput.value.trim();

      els.rankNicknameError.textContent = '';

      if (!/^[가-힣A-Za-z0-9_]{2,12}$/.test(nickname)) {
        els.rankNicknameError.textContent =
          '한글/영문/숫자/_ 조합 2~12자로 입력하세요.';
        return;
      }

      try {
        rankState.profile =
          await window.rankBackend.registerNickname(
            nickname
          );

        await refreshRankUI();

      } catch (err) {
        console.error(err);

        if (err && err.code === 'nickname-taken') {
          els.rankNicknameError.textContent =
            '이미 사용 중인 닉네임입니다.';
        } else if (
          err &&
          err.code === 'nickname-locked'
        ) {
          els.rankNicknameError.textContent =
            '이미 닉네임이 등록된 계정입니다.';
        } else {
          els.rankNicknameError.textContent =
            '닉네임 등록에 실패했습니다.';
        }
      }
    }
  );
}

if (els.rankStartBtn) {
  els.rankStartBtn.addEventListener(
    'click',
    startRank
  );
}

if (els.rankAnswerForm) {
  els.rankAnswerForm.addEventListener(
    'submit',
    e => {
      e.preventDefault();
      submitRankAnswer();
    }
  );
}

if (els.rankAnswerInput) {
  els.rankAnswerInput.addEventListener(
    'keydown',
    e => {
      if (e.key !== 'Enter') return;

      e.preventDefault();
      submitRankAnswer();
    }
  );
}

if (els.rankSkipBtn) {
  els.rankSkipBtn.addEventListener(
    'click',
    skipRankQuestion
  );
}

if (els.rankBackBtn) {
  els.rankBackBtn.addEventListener(
    'click',
    async () => {
      if (rankState.profile) {
        renderRankProfile();
        showRankPanel(els.rankProfilePanel);
      }

      await refreshLeaderboard();
    }
  );
}

if (els.rankRefreshBtn) {
  els.rankRefreshBtn.addEventListener(
    'click',
    refreshLeaderboard
  );
}

makeQueue();
renderWrongNotes();
updateWrongQuizGuide();
