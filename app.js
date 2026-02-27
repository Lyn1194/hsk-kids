/* ─────────────────────────────────────────────
   HSK Kids – app.js
   ───────────────────────────────────────────── */

// ── State ───────────────────────────────────────────────────────────────────
const STATE = {
  track:        null,      // 'prereader' | 'reader'
  soundOn:      true,
  speechRate:   1.0,
  showEnglish:  true,
  showChinese:  true,
  showPinyin:   true,
  stars:        0,
  progress:     {},        // { theme: starsEarned }
  currentTheme: null,
  currentActivity: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr, n) { return shuffle(arr).slice(0, n); }
function itemsForTheme(theme) { return THEMES_DATA.filter(d => d.theme === theme); }

// ── Persistence ──────────────────────────────────────────────────────────────
function saveState() {
  const save = {
    track: STATE.track,
    soundOn: STATE.soundOn,
    speechRate: STATE.speechRate,
    showEnglish: STATE.showEnglish,
    showChinese: STATE.showChinese,
    showPinyin: STATE.showPinyin,
    stars: STATE.stars,
    progress: STATE.progress,
  };
  localStorage.setItem('hskKidsState', JSON.stringify(save));
}
function loadState() {
  try {
    const raw = localStorage.getItem('hskKidsState');
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(STATE, saved);
  } catch (err) {
    console.warn('hskKids: could not restore saved state', err);
  }
}

// ── Speech ───────────────────────────────────────────────────────────────────
function speak(text) {
  if (!STATE.soundOn) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN';
  utt.rate = STATE.speechRate;

  // Prefer a Mandarin voice if available
  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.startsWith('zh'));
  if (zhVoice) utt.voice = zhVoice;

  window.speechSynthesis.speak(utt);
}

// Voices load async in some browsers
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

// ── Screen navigation ─────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
}

// ── Feedback bar ─────────────────────────────────────────────────────────────
let feedbackTimeout = null;
function showFeedback(msg, isWrong = false) {
  const bar = $('feedback-bar');
  bar.textContent = msg;
  bar.classList.toggle('wrong', isWrong);
  bar.classList.add('show');
  clearTimeout(feedbackTimeout);
  feedbackTimeout = setTimeout(() => bar.classList.remove('show'), 1500);
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function addStars(n, theme) {
  STATE.stars += n;
  STATE.progress[theme] = (STATE.progress[theme] || 0) + n;
  saveState();
  updateTotalStarsBar();
}
function updateTotalStarsBar() {
  const bar = $('total-stars-bar');
  if (bar) bar.textContent = `⭐ Total Stars: ${STATE.stars}`;
}

// ── Build label for an item based on track/settings ──────────────────────────
function buildLabel(item) {
  const parts = [];
  if (STATE.showChinese) parts.push(item.chinese);
  if (STATE.showPinyin)  parts.push(item.pinyin);
  if (STATE.showEnglish) parts.push(item.english);
  return parts.join(' · ') || item.chinese;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Track Select
// ─────────────────────────────────────────────────────────────────────────────
function initTrackSelect() {
  $('btn-track-prereader').addEventListener('click', () => selectTrack('prereader'));
  $('btn-track-reader').addEventListener('click',    () => selectTrack('reader'));
}

// ── Apply default text-visibility settings for a track ────────────────────
function applyTrackDefaults(track) {
  if (track === 'prereader') {
    STATE.showEnglish = false;
    STATE.showChinese = false;
    STATE.showPinyin  = false;
  } else {
    STATE.showEnglish = true;
    STATE.showChinese = true;
    STATE.showPinyin  = true;
  }
}

function selectTrack(track) {
  STATE.track = track;
  applyTrackDefaults(track);
  saveState();
  showThemeSelect();
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Theme Select
// ─────────────────────────────────────────────────────────────────────────────
function showThemeSelect() {
  renderThemeGrid();
  updateTotalStarsBar();
  showScreen('screen-themes');
}

function renderThemeGrid() {
  const grid = $('themes-grid');
  grid.innerHTML = '';
  Object.entries(THEME_META).forEach(([key, meta]) => {
    const stars = STATE.progress[key] || 0;
    const total = itemsForTheme(key).length;
    const pct   = Math.min(100, Math.round((stars / (total * 3)) * 100));

    const btn = document.createElement('button');
    btn.className = 'theme-btn';
    btn.style.background = meta.color;
    btn.setAttribute('aria-label', meta.label);
    btn.innerHTML = `
      <span class="theme-icon">${meta.emoji}</span>
      <span>${meta.label}</span>
      <span class="stars-badge">⭐ ${stars}</span>
      <span class="progress-bar" style="width:${pct}%"></span>
    `;
    btn.addEventListener('click', () => {
      STATE.currentTheme = key;
      showActivitySelect(key);
    });
    grid.appendChild(btn);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Activity Select
// ─────────────────────────────────────────────────────────────────────────────
function showActivitySelect(theme) {
  $('activity-select-title').textContent =
    `${THEME_META[theme].emoji} ${THEME_META[theme].label}`;
  showScreen('screen-activity-select');
}

function initActivitySelect() {
  $('btn-act-tap').addEventListener('click',       () => startActivity('tap'));
  $('btn-act-listen').addEventListener('click',    () => startActivity('listen'));
  $('btn-act-flash').addEventListener('click',     () => startActivity('flash'));
  $('btn-back-activity-select').addEventListener('click', showThemeSelect);
}

function startActivity(activity) {
  STATE.currentActivity = activity;
  showScreen('screen-activity');
  $('activity-area').innerHTML = '';
  if (activity === 'tap')    buildTapPicture();
  else if (activity === 'listen') buildListenFind();
  else if (activity === 'flash')  buildFlashcards();
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY: Tap the Picture
// ─────────────────────────────────────────────────────────────────────────────
let tapState = {};

function buildTapPicture() {
  $('activity-bar-title').textContent = '👆 Tap the Picture';
  const items = shuffle(itemsForTheme(STATE.currentTheme));
  tapState = { items, index: 0, score: 0, total: items.length };
  renderTapRound();
}

function renderTapRound() {
  const area = $('activity-area');
  area.innerHTML = '';
  const { items, index } = tapState;
  if (index >= items.length) { showActivityComplete(tapState.score, items.length, 'tap'); return; }

  const correct = items[index];
  const wrong3  = pick(THEMES_DATA.filter(d => d.id !== correct.id), 3);
  const choices  = shuffle([correct, ...wrong3]);

  // Progress row
  const scoreRow = document.createElement('div');
  scoreRow.className = 'score-row';
  scoreRow.innerHTML = `<span>Question ${index + 1} / ${items.length}</span><span class="stars">⭐ ${tapState.score}</span>`;

  // Prompt
  const prompt = document.createElement('div');
  prompt.className = 'prompt-box';
  prompt.innerHTML = `
    <div class="prompt-emoji">🔊</div>
    <h2>${STATE.showChinese ? correct.chinese : '???'}</h2>
    <div class="prompt-hint">${STATE.showPinyin ? correct.pinyin : 'Listen and tap!'}</div>
  `;

  // Audio button
  const audioBtn = document.createElement('button');
  audioBtn.className = 'btn-audio';
  audioBtn.textContent = '🔊';
  audioBtn.setAttribute('aria-label', 'Hear the word');
  audioBtn.addEventListener('click', () => speak(correct.audioText));

  // Choices grid
  const grid = document.createElement('div');
  grid.className = 'choices-grid';
  choices.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.setAttribute('aria-label', item.english);
    btn.innerHTML = `
      <span class="choice-emoji">${item.emoji}</span>
      ${STATE.showEnglish ? `<span>${item.english}</span>` : ''}
    `;
    btn.addEventListener('click', () => handleTapChoice(btn, item, correct, grid));
    grid.appendChild(btn);
  });

  area.append(scoreRow, prompt, audioBtn, grid);
  // Auto-speak on render
  setTimeout(() => speak(correct.audioText), 300);
}

function handleTapChoice(btn, chosen, correct, grid) {
  grid.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
  if (chosen.id === correct.id) {
    btn.classList.add('correct');
    showFeedback('🎉 Correct!');
    tapState.score++;
    addStars(1, STATE.currentTheme);
    speak(correct.audioText);
  } else {
    btn.classList.add('wrong');
    grid.querySelectorAll('.choice-btn').forEach(b => {
      if (b.querySelector('.choice-emoji').textContent === correct.emoji) b.classList.add('correct');
    });
    showFeedback('Try again! 💪', true);
  }
  setTimeout(() => {
    tapState.index++;
    renderTapRound();
  }, 1200);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY: Listen & Find
// ─────────────────────────────────────────────────────────────────────────────
let listenState = {};

function buildListenFind() {
  $('activity-bar-title').textContent = '👂 Listen & Find';
  const items = shuffle(itemsForTheme(STATE.currentTheme));
  listenState = { items, index: 0, score: 0 };
  renderListenRound();
}

function renderListenRound() {
  const area = $('activity-area');
  area.innerHTML = '';
  const { items, index } = listenState;
  if (index >= items.length) { showActivityComplete(listenState.score, items.length, 'listen'); return; }

  const correct = items[index];
  // Build a grid of up to 9 items (correct + up to 8 distractors)
  const distractors = pick(THEMES_DATA.filter(d => d.id !== correct.id), 8);
  const gridItems   = shuffle([correct, ...distractors]);

  const scoreRow = document.createElement('div');
  scoreRow.className = 'score-row';
  scoreRow.innerHTML = `<span>Question ${index + 1} / ${items.length}</span><span class="stars">⭐ ${listenState.score}</span>`;

  const prompt = document.createElement('div');
  prompt.className = 'prompt-box';
  prompt.innerHTML = `
    <div class="prompt-emoji">🔊</div>
    <h2>${STATE.showChinese ? correct.chinese : '???'}</h2>
    <div class="prompt-hint">Find the picture!</div>
  `;

  const audioBtn = document.createElement('button');
  audioBtn.className = 'btn-audio';
  audioBtn.textContent = '🔊';
  audioBtn.setAttribute('aria-label', 'Hear the word');
  audioBtn.addEventListener('click', () => speak(correct.audioText));

  const grid = document.createElement('div');
  grid.className = 'listen-grid';
  gridItems.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.setAttribute('aria-label', item.english);
    btn.innerHTML = `
      <span class="choice-emoji">${item.emoji}</span>
      ${STATE.showEnglish ? `<span style="font-size:.75rem">${item.english}</span>` : ''}
    `;
    btn.addEventListener('click', () => handleListenChoice(btn, item, correct, grid));
    grid.appendChild(btn);
  });

  area.append(scoreRow, prompt, audioBtn, grid);
  setTimeout(() => speak(correct.audioText), 300);
}

function handleListenChoice(btn, chosen, correct, grid) {
  grid.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
  if (chosen.id === correct.id) {
    btn.classList.add('correct');
    showFeedback('🎉 Great job!');
    listenState.score++;
    addStars(1, STATE.currentTheme);
    speak(correct.audioText);
  } else {
    btn.classList.add('wrong');
    grid.querySelectorAll('.choice-btn').forEach(b => {
      if (b.querySelector('.choice-emoji').textContent === correct.emoji) b.classList.add('correct');
    });
    showFeedback('Not quite! 💪', true);
  }
  setTimeout(() => {
    listenState.index++;
    renderListenRound();
  }, 1400);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY: Flashcards
// ─────────────────────────────────────────────────────────────────────────────
let flashState = {};

function buildFlashcards() {
  $('activity-bar-title').textContent = '🃏 Flashcards';
  const items = shuffle(itemsForTheme(STATE.currentTheme));
  flashState = { items, index: 0, revealed: false };
  renderFlashcard();
}

function renderFlashcard() {
  const area = $('activity-area');
  area.innerHTML = '';
  const { items, index } = flashState;
  if (index >= items.length) { showActivityComplete(items.length, items.length, 'flash'); return; }

  const item = items[index];

  const counter = document.createElement('div');
  counter.className = 'card-counter';
  counter.textContent = `${index + 1} / ${items.length}`;

  const card = document.createElement('div');
  card.className = 'flashcard';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', 'Tap to reveal');
  card.innerHTML = `
    <span class="card-emoji">${item.emoji}</span>
    <span class="card-chinese ${flashState.revealed ? '' : 'hidden'}">${item.chinese}</span>
    <span class="card-pinyin  ${flashState.revealed ? '' : 'hidden'}">${item.pinyin}</span>
    <span class="card-english ${flashState.revealed && STATE.showEnglish ? '' : 'hidden'}">${item.english}</span>
    <span class="hidden-label ${flashState.revealed ? 'hidden' : ''}">👆 Tap to reveal</span>
  `;
  card.addEventListener('click', () => {
    flashState.revealed = true;
    renderFlashcard();
  });
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flashState.revealed = true;
      renderFlashcard();
    }
  });

  const audioBtn = document.createElement('button');
  audioBtn.className = 'btn-audio';
  audioBtn.textContent = '🔊';
  audioBtn.setAttribute('aria-label', 'Hear the Chinese word');
  audioBtn.addEventListener('click', (e) => { e.stopPropagation(); speak(item.audioText); });

  const nav = document.createElement('div');
  nav.className = 'flashcard-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-ghost';
  prevBtn.textContent = '← Back';
  prevBtn.disabled = index === 0;
  prevBtn.addEventListener('click', () => { flashState.index = Math.max(0, index - 1); flashState.revealed = false; renderFlashcard(); });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary';
  nextBtn.textContent = index < items.length - 1 ? 'Next →' : '✅ Done';
  nextBtn.addEventListener('click', () => {
    if (index < items.length - 1) {
      flashState.index++;
      flashState.revealed = false;
      renderFlashcard();
    } else {
      addStars(items.length, STATE.currentTheme);
      showActivityComplete(items.length, items.length, 'flash');
    }
  });

  nav.append(prevBtn, nextBtn);
  area.append(counter, card, audioBtn, nav);

  if (flashState.revealed) speak(item.audioText);
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity complete card
// ─────────────────────────────────────────────────────────────────────────────
function showActivityComplete(score, total, activity) {
  const area = $('activity-area');
  area.innerHTML = '';
  const pct = total > 0 ? Math.round((score / total) * 100) : 100;
  const emoji = pct >= 80 ? '🌟' : pct >= 50 ? '😊' : '💪';

  const card = document.createElement('div');
  card.className = 'complete-card';
  card.innerHTML = `
    <div class="big-emoji">${emoji}</div>
    <h2>Well done!</h2>
    <p>Score: <strong>${score} / ${total}</strong></p>
    <div class="earned-stars">⭐ +${score} stars</div>
  `;

  const playAgainBtn = document.createElement('button');
  playAgainBtn.className = 'btn btn-primary';
  playAgainBtn.textContent = '🔁 Play Again';
  playAgainBtn.addEventListener('click', () => startActivity(activity));

  const homeBtn = document.createElement('button');
  homeBtn.className = 'btn btn-ghost';
  homeBtn.textContent = '🏠 Choose Theme';
  homeBtn.addEventListener('click', showThemeSelect);

  card.append(playAgainBtn, homeBtn);
  area.appendChild(card);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Parent Corner
// ─────────────────────────────────────────────────────────────────────────────
function initParentCorner() {
  // Track switch
  $('btn-switch-prereader').addEventListener('click', () => {
    STATE.track = 'prereader';
    applyTrackDefaults('prereader');
    saveState();
    syncParentUI();
    showFeedback('Switched to Pre-reader! 🎈');
  });
  $('btn-switch-reader').addEventListener('click', () => {
    STATE.track = 'reader';
    applyTrackDefaults('reader');
    saveState();
    syncParentUI();
    showFeedback('Switched to Reader! 📚');
  });

  // Toggles
  $('toggle-sound').addEventListener('change', e => { STATE.soundOn = e.target.checked; saveState(); });
  $('toggle-english').addEventListener('change', e => { STATE.showEnglish = e.target.checked; saveState(); });
  $('toggle-chinese').addEventListener('change', e => { STATE.showChinese = e.target.checked; saveState(); });
  $('toggle-pinyin').addEventListener('change', e => { STATE.showPinyin = e.target.checked; saveState(); });

  // Speed slider
  $('speed-slider').addEventListener('input', e => {
    STATE.speechRate = parseFloat(e.target.value);
    $('speed-label').textContent = STATE.speechRate.toFixed(1) + '×';
    saveState();
  });

  // Reset
  $('btn-reset').addEventListener('click', () => {
    if (confirm('Reset all progress and stars? This cannot be undone.')) {
      STATE.stars = 0;
      STATE.progress = {};
      saveState();
      syncParentUI();
      showFeedback('Progress reset! 🔄');
    }
  });

  $('btn-back-parent').addEventListener('click', showThemeSelect);
}

function syncParentUI() {
  $('toggle-sound').checked   = STATE.soundOn;
  $('toggle-english').checked = STATE.showEnglish;
  $('toggle-chinese').checked = STATE.showChinese;
  $('toggle-pinyin').checked  = STATE.showPinyin;
  $('speed-slider').value     = STATE.speechRate;
  $('speed-label').textContent = STATE.speechRate.toFixed(1) + '×';
  $('parent-track-label').textContent =
    STATE.track === 'prereader' ? '🎈 Pre-reader (5–7)' : '📚 Reader (8–10)';
  $('parent-stars').textContent = `⭐ ${STATE.stars}`;
  updateTotalStarsBar();
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-bar buttons
// ─────────────────────────────────────────────────────────────────────────────
function initTopBarButtons() {
  // Back from activity → activity select
  $('btn-back-activity').addEventListener('click', () => showActivitySelect(STATE.currentTheme));
  // Parent corner from themes screen
  $('btn-parent-from-themes').addEventListener('click', () => {
    syncParentUI();
    showScreen('screen-parent');
  });
  // Parent corner from activity screen
  $('btn-parent-from-activity').addEventListener('click', () => {
    syncParentUI();
    showScreen('screen-parent');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline banner
// ─────────────────────────────────────────────────────────────────────────────
function initOfflineBanner() {
  function update() {
    $('offline-banner').classList.toggle('show', !navigator.onLine);
  }
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Worker registration
// ─────────────────────────────────────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App init
// ─────────────────────────────────────────────────────────────────────────────
function init() {
  loadState();
  initTrackSelect();
  initActivitySelect();
  initParentCorner();
  initTopBarButtons();
  initOfflineBanner();
  registerSW();
  updateTotalStarsBar();

  if (STATE.track) {
    showThemeSelect();
  } else {
    showScreen('screen-track');
  }
}

document.addEventListener('DOMContentLoaded', init);
