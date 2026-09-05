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
  views: {
    quiz: document.getElementById('quizView'),
    wrong: document.getElementById('wrongView'),
    wrongQuiz: document.getElementById('wrongQuizView')
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
  startWrongQuizBtn: document.getElementById('startWrongQuizBtn')
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

  els.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === name);
  });

  if (name === 'wrong') renderWrongNotes();
  if (name === 'wrongQuiz') updateWrongQuizGuide();
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
  focusAnswerInput();
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

  const ok = q.answers.map(normalize).includes(normalize(raw));

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

    if (view === 'quiz' && practiceMode === 'wrong') {
      makeQueue();
    }

    setView(view);
  });
});

els.modeBtns.forEach(button => {
  button.addEventListener('click', () => {
    selectedMode = button.dataset.mode;

    els.modeBtns.forEach(x => {
      x.classList.toggle('active', x === button);
    });

    makeQueue();
    setView('quiz');
  });
});

makeQueue();
renderWrongNotes();
updateWrongQuizGuide();
