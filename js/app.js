/* ============================================================
   くものうえ 学び王国 v3
   ・ネオングラデーションUI／レスポンシブ
   ・正解/不正解サウンド
   ・中断状態の保存＆マイページからの再開
   ============================================================ */

/* ---------- 教科・レベル構成（ネオングラデーション版） ---------- */
const SUBJECTS = [
  {
    id: "math", name: "数字の草原島", short: "数学", emoji: "🌾",
    grad: "linear-gradient(135deg, #00E0A0 0%, #00B4D8 100%)",
    accent: "#00E0A0", accentDark: "#00B4D8",
    spirit: "ナンバっち", sEmoji: "🐰",
    enabled: true,
    levels: [MATH_L1, MATH_L2, MATH_L3],
  },
  {
    id: "english", name: "ことばの灯台島", short: "英語", emoji: "🏝️",
    grad: "linear-gradient(135deg, #3D7CFF 0%, #00E0FF 100%)",
    accent: "#3D7CFF", accentDark: "#00E0FF",
    spirit: "ワードゥル", sEmoji: "🦉",
    enabled: true,
    levels: [ENGLISH_L1, ENGLISH_L2, ENGLISH_L3],
  },
  {
    id: "japanese", name: "詩のしずく島", short: "国語", emoji: "🌸",
    grad: "linear-gradient(135deg, #FF3D9A 0%, #FF8A3D 100%)",
    accent: "#FF3D9A", accentDark: "#FF8A3D",
    spirit: "コトダマン", sEmoji: "💧",
    enabled: true,
    levels: [JAPANESE_L1, JAPANESE_L2, JAPANESE_L3],
  },
  {
    id: "social", name: "歴史の遺跡島", short: "社会", emoji: "🗿",
    grad: "linear-gradient(135deg, #FFB13D 0%, #FFD93D 100%)",
    accent: "#FFB13D", accentDark: "#FFD93D",
    spirit: "レキシード", sEmoji: "🐢",
    enabled: true,
    levels: [SOCIAL_L1, SOCIAL_L2, SOCIAL_L3],
  },
  {
    id: "science", name: "ふしぎな実験島", short: "理科", emoji: "🧪",
    grad: "linear-gradient(135deg, #B14EFF 0%, #FF3D9A 100%)",
    accent: "#B14EFF", accentDark: "#FF3D9A",
    spirit: "ジッケンヌ", sEmoji: "🐌",
    enabled: true,
    levels: [SCIENCE_L1, SCIENCE_L2, SCIENCE_L3],
  },
];

const LEVEL_LABELS = ["初級", "中級", "上級"];
const PASS_RATE = 0.8;
const CHEER_LINES = ["やったね！", "さすが！", "その調子〜！", "ぴかぴか光った！", "すごいすごい！"];
const MISS_LINES = ["おしい！", "もういちど いっしょに考えよう", "だいじょうぶ、次いこう", "ちょっとひとやすみ"];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/* ---------- 保存データ ---------- */
const SAVE_KEY = "kumo-no-ue-gakuou-save-v2";

const progress = {};
SUBJECTS.forEach(function (s) {
  progress[s.id] = { unlockedLevel: 0, bestRate: [0, 0, 0], cleared: [false, false, false] };
});

const mistakes = {};
SUBJECTS.forEach(function (s) {
  mistakes[s.id] = { 0: [], 1: [], 2: [] };
});

// 中断した回の状態（1件のみ保持。新しく別のレベルを始めると上書きされる）
// { subjectId, levelIndex, queue, qIndex, correctCount, sessionMistakes, combo }
let pausedSession = null;

function saveData() {
  try {
    const payload = { progress: progress, mistakes: mistakes, pausedSession: pausedSession };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("セーブに失敗しました:", e);
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload.progress) {
      Object.keys(payload.progress).forEach(function (id) {
        if (progress[id]) progress[id] = payload.progress[id];
      });
    }
    if (payload.mistakes) {
      Object.keys(payload.mistakes).forEach(function (id) {
        if (mistakes[id]) mistakes[id] = payload.mistakes[id];
      });
    }
    if (payload.pausedSession) {
      pausedSession = payload.pausedSession;
    }
  } catch (e) {
    console.warn("セーブデータの読み込みに失敗しました:", e);
  }
}

function resetAllData() {
  SUBJECTS.forEach(function (s) {
    progress[s.id] = { unlockedLevel: 0, bestRate: [0, 0, 0], cleared: [false, false, false] };
    mistakes[s.id] = { 0: [], 1: [], 2: [] };
  });
  pausedSession = null;
  saveData();
  state.screen = "title";
  render();
}

/* ---------- ゲーム状態 ---------- */
const state = {
  screen: "title",
  subject: null,
  levelIndex: 0,
  queue: [],
  qIndex: 0,
  correctCount: 0,
  choiceState: null,
  selected: null,
  log: "",
  combo: 0,
  sessionMistakes: [],
  mypageTab: "math",
};

/* ---------- 画面遷移 ---------- */
function goTitle() { SoundFX.tap(); state.screen = "title"; render(); }
function goMap() { SoundFX.tap(); state.screen = "map"; render(); }
function goMypage() {
  SoundFX.tap();
  state.mypageTab = state.subject ? state.subject.id : "math";
  state.screen = "mypage";
  render();
}

function openLevelSelect(subjectId) {
  SoundFX.tap();
  const subj = SUBJECTS.filter(function (s) { return s.id === subjectId; })[0];
  if (!subj.enabled) return;
  state.subject = subj;
  state.screen = "levelSelect";
  render();
}

function startLevel(levelIndex) {
  SoundFX.tap();
  const subj = state.subject;
  if (levelIndex > progress[subj.id].unlockedLevel) return;

  state.levelIndex = levelIndex;
  state.queue = shuffle(subj.levels[levelIndex]).slice();
  state.qIndex = 0;
  state.correctCount = 0;
  state.combo = 0;
  state.sessionMistakes = [];
  state.log = subj.spirit + "が " + LEVEL_LABELS[levelIndex] + "の問題を出してきた！";
  state.choiceState = null;
  state.selected = null;
  state.screen = "battle";

  // 別の挑戦を始めたら、以前の中断セッションは破棄
  if (pausedSession && (pausedSession.subjectId !== subj.id || pausedSession.levelIndex !== levelIndex)) {
    pausedSession = null;
  }
  saveData();
  render();
}

function resumeSession() {
  if (!pausedSession) return;
  SoundFX.tap();
  const subj = SUBJECTS.filter(function (s) { return s.id === pausedSession.subjectId; })[0];
  state.subject = subj;
  state.levelIndex = pausedSession.levelIndex;
  state.queue = pausedSession.queue;
  state.qIndex = pausedSession.qIndex;
  state.correctCount = pausedSession.correctCount;
  state.combo = pausedSession.combo;
  state.sessionMistakes = pausedSession.sessionMistakes;
  state.log = subj.spirit + "が まっていた！ つづきから やろう！";
  state.choiceState = null;
  state.selected = null;
  state.screen = "battle";
  render();
}

function currentQ() { return state.queue[state.qIndex]; }

function answer(idx) {
  if (state.choiceState) return;
  state.selected = idx;
  const q = currentQ();
  const correct = idx === q.a;

  if (correct) {
    state.choiceState = "correct";
    state.combo += 1;
    state.correctCount += 1;
    state.log = CHEER_LINES[Math.floor(Math.random() * CHEER_LINES.length)];
    SoundFX.correct();
    render();
    triggerSparkle();
    triggerPulse();
  } else {
    state.choiceState = "wrong";
    state.combo = 0;
    state.log = MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)] + " 正かいは「" + q.choices[q.a] + "」";
    state.sessionMistakes.push({ q: q.q, choices: q.choices, a: q.a, picked: idx });
    SoundFX.wrong();
    render();
    triggerWobble();
  }

  // 進行中の状態を都度保存（アプリを閉じても続きから再開できるように）
  pausedSession = {
    subjectId: state.subject.id,
    levelIndex: state.levelIndex,
    queue: state.queue,
    qIndex: state.qIndex,
    correctCount: state.correctCount,
    combo: state.combo,
    sessionMistakes: state.sessionMistakes,
  };
  saveData();

  setTimeout(function () {
    const isLast = state.qIndex + 1 >= state.queue.length;
    if (isLast) {
      finishLevel();
      return;
    }
    state.qIndex += 1;
    state.choiceState = null;
    state.selected = null;
    pausedSession.qIndex = state.qIndex;
    saveData();
    render();
  }, 1100);
}

function finishLevel() {
  const subj = state.subject;
  const total = state.queue.length;
  const rate = state.correctCount / total;
  const li = state.levelIndex;

  progress[subj.id].bestRate[li] = Math.max(progress[subj.id].bestRate[li], rate);
  mistakes[subj.id][li] = state.sessionMistakes.slice();

  let unlocked = false;
  if (rate >= PASS_RATE) {
    progress[subj.id].cleared[li] = true;
    if (progress[subj.id].unlockedLevel < li + 1 && li + 1 <= 2) {
      progress[subj.id].unlockedLevel = li + 1;
      unlocked = true;
    } else if (li === 2) {
      progress[subj.id].unlockedLevel = 2;
    }
  }

  // レベル終了＝中断セッションは消す
  pausedSession = null;

  state.lastResult = { rate: rate, correct: state.correctCount, total: total, unlocked: unlocked, levelIndex: li };
  saveData();

  if (unlocked) SoundFX.levelUp();

  state.screen = "result";
  render();
}

function retryLevel() { startLevel(state.levelIndex); }
function nextLevel() { startLevel(state.levelIndex + 1); }

function quitBattleToMap() {
  const ok = window.confirm("ここまでの進み具合は保存されます。教科をえらび直しますか？");
  if (!ok) return;
  SoundFX.tap();
  state.screen = "map";
  render();
}

function quitBattleToLevelSelect() {
  const ok = window.confirm("ここまでの進み具合は保存されます。レベル選択にもどりますか？");
  if (!ok) return;
  SoundFX.tap();
  state.screen = "levelSelect";
  render();
}

function confirmReset() {
  const ok = window.confirm("すべての記録・保存データが消えます。よろしいですか？");
  if (!ok) return;
  resetAllData();
}

/* ---------- 演出 ---------- */
function triggerWobble() {
  const el = document.querySelector(".spirit-figure");
  if (el) { el.classList.remove("wobble"); void el.offsetWidth; el.classList.add("wobble"); }
}
function triggerPulse() {
  const el = document.querySelector(".battle-card");
  if (el) { el.classList.remove("pulse-correct"); void el.offsetWidth; el.classList.add("pulse-correct"); }
}
function triggerSparkle() {
  const layer = document.querySelector(".sparkle-layer");
  if (!layer) return;
  layer.innerHTML = "";
  const positions = ["8%", "28%", "55%", "75%", "40%", "88%"];
  positions.forEach(function (left, i) {
    const s = document.createElement("div");
    s.textContent = ["✨", "⭐", "💫"][i % 3];
    s.style.cssText = "position:absolute;left:" + left + ";top:" + (15 + (i % 3) * 22) + "%;font-size:18px;animation:sparkleFloat 0.7s ease-out " + (i * 0.05) + "s;opacity:0;";
    layer.appendChild(s);
  });
  setTimeout(function () { layer.innerHTML = ""; }, 800);
}

/* ---------- 共通パーツ ---------- */
function glowDecorHTML() {
  return '<div class="glow-decor">' +
    '<div class="glow-blob" style="width:220px;height:220px;top:-60px;left:-60px;background:#B14EFF;"></div>' +
    '<div class="glow-blob" style="width:180px;height:180px;bottom:60px;right:-50px;background:#00E0FF;"></div>' +
    '<div class="glow-blob" style="width:160px;height:160px;bottom:-40px;left:20%;background:#FF3D9A;"></div>' +
    '</div>';
}

function topBarHTML() {
  const hasPaused = !!pausedSession;
  return '<div style="margin-bottom:14px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
      '<button class="small-btn" onclick="goTitle()">🏠 ホーム</button>' +
      '<button class="small-btn" onclick="goMypage()">📖 マイページ</button>' +
    '</div>' +
    (hasPaused ? '<div style="margin-top:8px;text-align:center;"><span class="resume-badge">⏸ 再開できる続きがあります</span></div>' : "") +
  '</div>';
}

/* ---------- タイトル ---------- */
function renderTitle() {
  const root = document.getElementById("root");
  const hasProgress = SUBJECTS.some(function (s) { return progress[s.id].bestRate.some(function (r) { return r > 0; }); });
  const hasPaused = !!pausedSession;

  root.innerHTML =
    '<div class="shell">' +
      glowDecorHTML() +
      '<div class="content pop-in" style="text-align:center;padding-top:64px;">' +
        '<div style="font-size:56px;margin-bottom:10px;">🌈✨</div>' +
        '<h1 class="app-title" style="font-size:30px;margin:4px 0 10px;">くものうえ<br/>学び王国</h1>' +
        '<p style="color:var(--text-sub);font-size:13.5px;margin:0 0 28px;line-height:1.7;">5教科の島をめぐって、レベルアップ！<br/>クリアして精霊たちとなかよくなろう</p>' +
        '<div style="display:flex;justify-content:center;gap:12px;margin-bottom:32px;flex-wrap:wrap;">' +
          SUBJECTS.map(function (s) {
            return '<div style="width:44px;height:44px;border-radius:14px;background:' + s.grad + ';display:flex;align-items:center;justify-content:center;font-size:22px;">' + s.sEmoji + '</div>';
          }).join("") +
        '</div>' +
        (hasPaused
          ? '<button class="round-btn" onclick="resumeSession()">▶ 続きから はじめる</button><div style="height:12px;"></div><button class="round-btn secondary" onclick="goMap()">🗺️ 教科をえらぶ</button>'
          : '<button class="round-btn" onclick="goMap()">' + (hasProgress ? "🌈 つづきから はじめる" : "🌈 ぼうけんを はじめる") + '</button>'
        ) +
        (hasProgress ? '<div style="margin-top:18px;"><button class="small-btn" style="background:transparent;border-color:transparent;color:var(--text-faint);text-decoration:underline;" onclick="confirmReset()">きろくを けす</button></div>' : "") +
      '</div>' +
    '</div>';
}

/* ---------- 教科マップ ---------- */
function renderMap() {
  const root = document.getElementById("root");
  root.innerHTML =
    '<div class="shell">' +
      glowDecorHTML() +
      '<div class="content pop-in">' +
        topBarHTML() +
        '<h2 class="section-title" style="text-align:center;margin:6px 0 18px;">島を えらんでね</h2>' +
        '<div style="display:flex;flex-direction:column;gap:14px;">' +
          SUBJECTS.map(function (s) {
            const p = progress[s.id];
            const clearedCount = p.cleared.filter(Boolean).length;
            return '<button class="island-card" onclick="openLevelSelect(\'' + s.id + '\')">' +
              '<div class="island-icon" style="background:' + s.grad + ';">' + s.emoji + '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:15.5px;font-weight:800;color:var(--text-main);">' + s.name + '</div>' +
                '<div style="font-size:12px;color:var(--text-sub);margin-top:2px;">' + s.sEmoji + ' ' + s.spirit + '・クリア ' + clearedCount + '/3レベル</div>' +
              '</div>' +
              '<div style="font-size:20px;color:var(--text-faint);">→</div>' +
            '</button>';
          }).join("") +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ---------- レベル選択 ---------- */
function renderLevelSelect() {
  const root = document.getElementById("root");
  const subj = state.subject;
  const p = progress[subj.id];

  const levelsHTML = [0, 1, 2].map(function (li) {
    const unlocked = li <= p.unlockedLevel;
    const cleared = p.cleared[li];
    const best = Math.round(p.bestRate[li] * 100);
    const mistakeCount = mistakes[subj.id][li].length;
    const isPausedHere = pausedSession && pausedSession.subjectId === subj.id && pausedSession.levelIndex === li;

    let statusHTML;
    if (!unlocked) {
      statusHTML = '<div style="font-size:11.5px;color:var(--text-faint);">🔒 前のレベルを80%以上でクリアすると解放</div>';
    } else if (cleared) {
      statusHTML = '<div style="font-size:11.5px;color:var(--correct-a);font-weight:700;">クリア済み・自己ベスト ' + best + '%</div>';
    } else if (best > 0) {
      statusHTML = '<div style="font-size:11.5px;color:var(--neon-orange);font-weight:700;">挑戦中・自己ベスト ' + best + '%（合格ラインは80%）</div>';
    } else {
      statusHTML = '<div style="font-size:11.5px;color:var(--text-sub);">まだ挑戦していません</div>';
    }

    return '<div class="card" style="padding:18px;margin-bottom:14px;' + (unlocked ? "" : "opacity:0.5;") + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
        '<div style="font-size:15.5px;font-weight:800;color:var(--text-main);">Lv.' + (li + 1) + ' ' + LEVEL_LABELS[li] + '</div>' +
        (cleared ? '<div style="font-size:18px;">💛</div>' : "") +
      '</div>' +
      statusHTML +
      (isPausedHere ? '<div style="margin-top:6px;"><span class="resume-badge">⏸ 途中から再開できます</span></div>' : "") +
      (mistakeCount > 0 && !isPausedHere ? '<div style="font-size:11px;color:var(--neon-pink);margin-top:6px;">前回の間違い ' + mistakeCount + '問（マイページで確認できます）</div>' : "") +
      '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">' +
        (unlocked && isPausedHere ? '<button class="round-btn" style="padding:9px 20px;font-size:13px;" onclick="resumeSession()">▶ 続きから</button>' : "") +
        (unlocked ? '<button class="round-btn secondary" style="padding:9px 20px;font-size:13px;" onclick="startLevel(' + li + ')">' + (best > 0 ? "はじめから挑戦" : "挑戦する") + '</button>' : "") +
      '</div>' +
    '</div>';
  }).join("");

  root.innerHTML =
    '<div class="shell">' +
      glowDecorHTML() +
      '<div class="content pop-in">' +
        topBarHTML() +
        '<div style="text-align:center;margin-bottom:18px;">' +
          '<div style="width:64px;height:64px;border-radius:20px;background:' + subj.grad + ';display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto;">' + subj.sEmoji + '</div>' +
          '<div style="font-size:17px;font-weight:800;color:var(--text-main);margin-top:8px;">' + subj.name + '</div>' +
          '<div style="font-size:12px;color:var(--text-sub);">' + subj.spirit + 'と レベルアップしよう</div>' +
        '</div>' +
        levelsHTML +
      '</div>' +
    '</div>';
}

/* ---------- バトル（出題）画面 ---------- */
function renderBattle() {
  const root = document.getElementById("root");
  const subj = state.subject;
  const q = currentQ();
  if (!q) return;

  const total = state.queue.length;
  const progressPct = Math.round((state.qIndex / total) * 100);

  const choicesHTML = q.choices.map(function (c, i) {
    let cls = "choice-btn";
    if (state.choiceState) {
      if (i === q.a) cls += " correct";
      else if (i === state.selected) cls += " wrong";
    }
    const disabled = state.choiceState ? "disabled" : "";
    return '<button class="' + cls + '" ' + disabled + ' onclick="answer(' + i + ')">' + c + '</button>';
  }).join("");

  root.innerHTML =
    '<div class="shell">' +
      glowDecorHTML() +
      '<div class="content pop-in">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;">' +
          '<button class="small-btn" onclick="quitBattleToLevelSelect()">← 中断してもどる</button>' +
          '<button class="small-btn" onclick="quitBattleToMap()">🗺️ 教科をえらび直す</button>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<span style="font-size:12.5px;font-weight:800;color:' + subj.accent + ';">' + subj.emoji + ' ' + subj.name + ' ・ ' + LEVEL_LABELS[state.levelIndex] + '</span>' +
          '<span style="font-size:11.5px;font-weight:700;color:var(--text-sub);background:var(--bg-card);padding:4px 12px;border-radius:20px;">' + (state.qIndex + 1) + ' / ' + total + '</span>' +
        '</div>' +
        '<div style="height:7px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;margin-bottom:16px;">' +
          '<div style="height:100%;width:' + progressPct + '%;background:' + subj.grad + ';border-radius:6px;transition:width 0.4s;"></div>' +
        '</div>' +

        '<div class="card battle-card" style="padding:22px 18px 18px;position:relative;overflow:hidden;margin-bottom:16px;">' +
          '<div class="sparkle-layer" style="position:absolute;inset:0;pointer-events:none;z-index:3;"></div>' +
          '<div style="text-align:center;margin-bottom:12px;">' +
            '<div class="spirit-figure" style="font-size:50px;">' + subj.sEmoji + '</div>' +
            '<div style="font-size:11.5px;font-weight:700;color:var(--text-sub);margin-top:4px;">' + subj.spirit + '</div>' +
          '</div>' +
          '<div style="background:var(--bg-card);color:var(--text-main);border-radius:14px;padding:10px 14px;font-size:13px;min-height:38px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700;">' + state.log + '</div>' +
        '</div>' +

        '<div class="card" style="padding:18px 18px 16px;">' +
          (state.combo > 1 ? '<div style="font-size:12px;font-weight:800;background:' + subj.grad + ';-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:8px;">🔥 ' + state.combo + 'れん続 正かい中！</div>' : "") +
          '<div style="font-size:16px;font-weight:800;color:var(--text-main);margin-bottom:16px;line-height:1.6;">' + q.q + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px;">' + choicesHTML + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ---------- 結果画面 ---------- */
function renderResult() {
  const root = document.getElementById("root");
  const subj = state.subject;
  const r = state.lastResult;
  const pct = Math.round(r.rate * 100);
  const passed = r.rate >= PASS_RATE;
  const hasNext = r.levelIndex < 2;

  root.innerHTML =
    '<div class="shell">' +
      glowDecorHTML() +
      '<div class="content pop-in" style="text-align:center;padding-top:48px;">' +
        '<div style="font-size:56px;">' + (passed ? subj.sEmoji + "💛" : subj.sEmoji + "💦") + '</div>' +
        '<h2 style="color:var(--text-main);font-size:19px;margin:12px 0 4px;font-weight:900;">' +
          (passed ? LEVEL_LABELS[r.levelIndex] + "クリア！" : "もうすこし！") +
        '</h2>' +
        '<p style="color:var(--text-sub);font-size:12.5px;margin-bottom:20px;">' + subj.name + ' ・ ' + LEVEL_LABELS[r.levelIndex] + '</p>' +

        '<div class="card" style="display:inline-block;padding:22px 30px;margin-bottom:12px;">' +
          '<div style="font-size:32px;font-weight:900;background:' + subj.grad + ';-webkit-background-clip:text;background-clip:text;color:transparent;">' + pct + '%</div>' +
          '<div style="font-size:12.5px;color:var(--text-sub);margin-top:4px;">' + r.correct + ' / ' + r.total + ' 問 正解</div>' +
          '<div style="font-size:10.5px;color:var(--text-faint);margin-top:6px;">合格ライン 80%</div>' +
        '</div>' +

        (r.unlocked ? '<div style="background:linear-gradient(135deg, rgba(255,217,61,0.18), rgba(255,138,61,0.18));border:1px solid rgba(255,217,61,0.4);border-radius:14px;padding:12px 18px;margin-bottom:20px;font-size:12.5px;font-weight:800;color:var(--neon-yellow);">🌟 次のレベルが解放されました！</div>' : "") +
        (!passed && state.sessionMistakes.length > 0 ? '<div style="font-size:12px;color:var(--neon-pink);margin-bottom:20px;">間違えた ' + state.sessionMistakes.length + '問は マイページで振り返れます</div>' : '<div style="margin-bottom:20px;"></div>') +

        '<div style="display:flex;flex-direction:column;gap:12px;align-items:center;">' +
          (passed && hasNext ? '<button class="round-btn" onclick="nextLevel()">▶ 次のレベルに挑戦</button>' : "") +
          '<button class="round-btn secondary" onclick="retryLevel()">🔁 もういちど挑戦</button>' +
          '<button class="small-btn" style="margin-top:4px;" onclick="goMypage()">📖 マイページで振り返る</button>' +
          '<button class="small-btn" style="background:transparent;border-color:transparent;color:var(--text-faint);text-decoration:underline;" onclick="goMap()">島マップへもどる</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ---------- マイページ（振り返り＋再開） ---------- */
function renderMypage() {
  const root = document.getElementById("root");
  const tabId = state.mypageTab;
  const subj = SUBJECTS.filter(function (s) { return s.id === tabId; })[0];

  const tabsHTML = SUBJECTS.map(function (s) {
    return '<button class="tab-btn ' + (s.id === tabId ? "active" : "") + '" onclick="state.mypageTab=\'' + s.id + '\';render();">' + s.emoji + ' ' + s.short + '</button>';
  }).join("");

  const pausedForThisSubject = pausedSession && pausedSession.subjectId === tabId;

  const p = progress[subj.id];
  const levelBlocks = [0, 1, 2].map(function (li) {
    const list = mistakes[subj.id][li];
    const best = Math.round(p.bestRate[li] * 100);
    const attempted = p.bestRate[li] > 0 || p.cleared[li];
    const isPausedHere = pausedSession && pausedSession.subjectId === subj.id && pausedSession.levelIndex === li;

    let listHTML;
    if (isPausedHere) {
      listHTML = '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-card);border-radius:14px;padding:12px 14px;">' +
        '<span class="resume-badge">⏸ ' + (pausedSession.qIndex + 1) + '/' + pausedSession.queue.length + '問目で中断中</span>' +
        '<button class="small-btn" style="background:' + subj.grad + ';color:#12111C;" onclick="resumeSession()">▶ 再開</button>' +
      '</div>';
    } else if (!attempted) {
      listHTML = '<div style="font-size:12px;color:var(--text-faint);padding:10px 4px;">まだ挑戦していません</div>';
    } else if (list.length === 0) {
      listHTML = '<div style="font-size:12px;color:var(--correct-a);padding:10px 4px;">✨ 前回は全問正解でした！</div>';
    } else {
      listHTML = list.map(function (m) {
        return '<div class="review-item">' +
          '<div style="font-size:13.5px;font-weight:700;color:var(--text-main);margin-bottom:8px;">' + m.q + '</div>' +
          '<div style="font-size:12px;color:var(--wrong-a);">あなたの答え：' + m.choices[m.picked] + '</div>' +
          '<div style="font-size:12px;color:var(--correct-a);">正しい答え：' + m.choices[m.a] + '</div>' +
        '</div>';
      }).join("");
    }

    return '<div style="margin-bottom:20px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<div style="font-size:14px;font-weight:800;color:var(--text-main);">Lv.' + (li + 1) + ' ' + LEVEL_LABELS[li] + '</div>' +
        (attempted ? '<div style="font-size:11.5px;color:var(--text-sub);">自己ベスト ' + best + '%</div>' : "") +
      '</div>' +
      listHTML +
    '</div>';
  }).join("");

  const bodyHTML = subj.enabled
    ? '<div style="padding:4px 2px 10px;">' +
        '<div style="text-align:center;margin-bottom:18px;">' +
          '<div style="width:56px;height:56px;border-radius:18px;background:' + subj.grad + ';display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto;">' + subj.sEmoji + '</div>' +
          '<div style="font-size:15px;font-weight:800;color:var(--text-main);margin-top:8px;">' + subj.name + '</div>' +
        '</div>' +
        levelBlocks +
      '</div>'
    : '<div style="text-align:center;padding:40px 20px;color:var(--text-faint);font-size:13px;">この教科は近日追加予定です</div>';

  root.innerHTML =
    '<div class="shell">' +
      '<div class="content scrollable pop-in">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
          '<button class="small-btn" onclick="goMap()">← 島マップへ</button>' +
          '<div style="font-size:14.5px;font-weight:900;color:var(--text-main);">📖 マイページ</div>' +
          '<div style="width:76px;"></div>' +
        '</div>' +
        '<div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:16px;">' + tabsHTML + '</div>' +
        bodyHTML +
        '<div style="text-align:center;margin-top:10px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);">' +
          '<button class="small-btn" style="background:transparent;border-color:transparent;color:var(--text-faint);text-decoration:underline;font-size:11px;" onclick="confirmReset()">きろくを ぜんぶ けす</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ---------- ルーター ---------- */
function render() {
  if (state.screen === "title") renderTitle();
  else if (state.screen === "map") renderMap();
  else if (state.screen === "levelSelect") renderLevelSelect();
  else if (state.screen === "battle") renderBattle();
  else if (state.screen === "result") renderResult();
  else if (state.screen === "mypage") renderMypage();
}

// 初回タップでAudioContextを有効化（ブラウザの自動再生制限対策）
document.addEventListener("click", function unlockOnce() {
  SoundFX.unlockAudio();
  document.removeEventListener("click", unlockOnce);
}, { once: true });

loadData();
render();
