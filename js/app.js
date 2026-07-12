/* ---------- 教科・レベル構成 ---------- */
const SUBJECTS = [
  {
    id: "math", name: "数字の草原島", short: "数学", emoji: "🌾",
    accent: "#4FAE72", accentDark: "#2F8A54", bg: "#E4F7EB",
    spirit: "ナンバっち", sEmoji: "🐰",
    enabled: true,
    levels: [MATH_L1, MATH_L2, MATH_L3],
  },
  { id: "english", name: "ことばの灯台島", short: "英語", emoji: "🏝️", accent: "#3FA9D6", accentDark: "#1E86B4", bg: "#E3F4FA", spirit: "ワードゥル", sEmoji: "🦉", enabled: true, levels: [ENGLISH_L1, ENGLISH_L2, ENGLISH_L3] },
  { id: "japanese", name: "詩のしずく島", short: "国語", emoji: "🌸", accent: "#F2668B", accentDark: "#D4436B", bg: "#FDE9EE", spirit: "コトダマン", sEmoji: "💧", enabled: true, levels: [JAPANESE_L1, JAPANESE_L2, JAPANESE_L3] },
  { id: "social", name: "歴史の遺跡島", short: "社会", emoji: "🗿", accent: "#E0A23C", accentDark: "#B87F22", bg: "#FBF0DC", spirit: "レキシード", sEmoji: "🐢", enabled: true, levels: [SOCIAL_L1, SOCIAL_L2, SOCIAL_L3] },
  { id: "science", name: "ふしぎな実験島", short: "理科", emoji: "🧪", accent: "#9B72D6", accentDark: "#7A50B8", bg: "#F1E9FA", spirit: "ジッケンヌ", sEmoji: "🐌", enabled: true, levels: [SCIENCE_L1, SCIENCE_L2, SCIENCE_L3] },
];

const LEVEL_LABELS = ["初級", "中級", "上級"];
const PASS_RATE = 0.8; // 80%以上で次レベル解放
const MAX_GENKI = { player: 100, spirit: 100 };
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

/* ---------- 進捗・履歴の保存（localStorageに永続化） ---------- */
const SAVE_KEY = "kumo-no-ue-gakuou-save-v1";

// progress: { [subjectId]: { unlockedLevel: 0-2, bestRate: [r0,r1,r2], cleared: [b,b,b] } }
const progress = {};
SUBJECTS.forEach(function (s) {
  progress[s.id] = { unlockedLevel: 0, bestRate: [0, 0, 0], cleared: [false, false, false] };
});

// mistakes: { [subjectId]: { [levelIndex]: [ {q, choices, a, picked} ... ] } }  最新プレイの誤答のみ保持
const mistakes = {};
SUBJECTS.forEach(function (s) {
  mistakes[s.id] = { 0: [], 1: [], 2: [] };
});

function saveData() {
  try {
    const payload = { progress: progress, mistakes: mistakes };
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
  } catch (e) {
    console.warn("セーブデータの読み込みに失敗しました:", e);
  }
}

function resetAllData() {
  SUBJECTS.forEach(function (s) {
    progress[s.id] = { unlockedLevel: 0, bestRate: [0, 0, 0], cleared: [false, false, false] };
    mistakes[s.id] = { 0: [], 1: [], 2: [] };
  });
  saveData();
  state.screen = "title";
  render();
}

/* ---------- ゲーム状態 ---------- */
const state = {
  screen: "title", // title, map, levelSelect, battle, result, mypage
  subject: null,
  levelIndex: 0,
  queue: [],
  qIndex: 0,
  correctCount: 0,
  choiceState: null,
  selected: null,
  log: "",
  combo: 0,
  playerGenki: MAX_GENKI.player,
  spiritGenki: MAX_GENKI.spirit,
  sessionMistakes: [],
  mypageTab: "math", // どの教科タブを見ているか
};

/* ---------- 画面遷移系 ---------- */
function goTitle() { state.screen = "title"; render(); }
function goMap() { state.screen = "map"; render(); }
function goMypage() { state.mypageTab = state.subject ? state.subject.id : "math"; state.screen = "mypage"; render(); }

function openLevelSelect(subjectId) {
  const subj = SUBJECTS.filter(function (s) { return s.id === subjectId; })[0];
  if (!subj.enabled) return;
  state.subject = subj;
  state.screen = "levelSelect";
  render();
}

function startLevel(levelIndex) {
  const subj = state.subject;
  if (levelIndex > progress[subj.id].unlockedLevel) return;
  state.levelIndex = levelIndex;
  state.queue = shuffle(subj.levels[levelIndex]).slice(); // 全30問
  state.qIndex = 0;
  state.correctCount = 0;
  state.playerGenki = MAX_GENKI.player;
  state.spiritGenki = MAX_GENKI.spirit;
  state.combo = 0;
  state.sessionMistakes = [];
  state.log = subj.spirit + "が " + LEVEL_LABELS[levelIndex] + "の問題を出してきた！";
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
  const subj = state.subject;

  if (correct) {
    state.choiceState = "correct";
    state.combo += 1;
    state.correctCount += 1;
    const heal = 3;
    state.spiritGenki = Math.min(MAX_GENKI.spirit, state.spiritGenki); // 見た目上は据え置き（進捗バーとして利用）
    state.log = CHEER_LINES[Math.floor(Math.random() * CHEER_LINES.length)];
    render();
    triggerSparkle();
  } else {
    state.choiceState = "wrong";
    state.combo = 0;
    state.log = MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)] + " 正かいは「" + q.choices[q.a] + "」";
    state.sessionMistakes.push({
      q: q.q,
      choices: q.choices,
      a: q.a,
      picked: idx,
    });
    render();
    triggerWobble();
  }

  setTimeout(function () {
    const isLast = state.qIndex + 1 >= state.queue.length;
    if (isLast) {
      finishLevel();
      return;
    }
    state.qIndex += 1;
    state.choiceState = null;
    state.selected = null;
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

  state.lastResult = { rate: rate, correct: state.correctCount, total: total, unlocked: unlocked, levelIndex: li };
  saveData();
  state.screen = "result";
  render();
}

function retryLevel() {
  startLevel(state.levelIndex);
}

function nextLevel() {
  startLevel(state.levelIndex + 1);
}

function quitBattleToMap() {
  const ok = window.confirm("ここまでの結果は記録されません。島マップにもどりますか？");
  if (!ok) return;
  state.screen = "map";
  render();
}

function quitBattleToLevelSelect() {
  const ok = window.confirm("ここまでの結果は記録されません。レベル選択にもどりますか？");
  if (!ok) return;
  state.screen = "levelSelect";
  render();
}

/* ---------- 演出 ---------- */
function triggerWobble() {
  const el = document.querySelector(".spirit-figure");
  if (el) { el.classList.remove("wobble"); void el.offsetWidth; el.classList.add("wobble"); }
}
function triggerSparkle() {
  const layer = document.querySelector(".sparkle-layer");
  if (!layer) return;
  layer.innerHTML = "";
  const positions = ["10%", "30%", "60%", "80%", "45%"];
  positions.forEach(function (left, i) {
    const s = document.createElement("div");
    s.textContent = "✨";
    s.style.cssText = "position:absolute;left:" + left + ";top:" + (20 + (i % 3) * 20) + "%;font-size:16px;animation:sparkleFloat 0.6s ease-out " + (i * 0.05) + "s;opacity:0;";
    layer.appendChild(s);
  });
  setTimeout(function () { layer.innerHTML = ""; }, 700);
}

/* ---------- 共通パーツ ---------- */
function cloudDecorHTML(faint) {
  const op = faint ? 0.5 : 1;
  return '<div class="cloud-decor">' +
    '<span style="top:20px;left:-10px;font-size:34px;opacity:' + op + ';">☁️</span>' +
    '<span style="top:70px;right:-6px;font-size:26px;opacity:' + (op * 0.8) + ';">☁️</span>' +
    '<span style="bottom:30px;left:10px;font-size:22px;opacity:' + (op * 0.6) + ';">☁️</span>' +
    '<span style="top:130px;left:45%;font-size:18px;opacity:' + (op * 0.5) + ';">✨</span>' +
    '</div>';
}

function topBarHTML(showBack, backFn) {
  return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
    (showBack ? '<button class="small-btn" style="background:#fff;color:#33424A;" onclick="' + backFn + '">← もどる</button>' : '<div></div>') +
    '<button class="small-btn" style="background:#33424A;color:#fff;" onclick="goMypage()">📖 マイページ</button>' +
    '</div>';
}

/* ---------- タイトル ---------- */
function renderTitle() {
  const root = document.getElementById("root");
  const hasProgress = SUBJECTS.some(function (s) { return progress[s.id].bestRate.some(function (r) { return r > 0; }); });

  root.innerHTML =
    '<div class="shell" style="background:linear-gradient(180deg, #CDEAF7 0%, #FFF6E4 65%);">' +
      cloudDecorHTML(false) +
      '<div class="content" style="text-align:center;padding:56px 24px 40px;">' +
        '<div style="font-size:58px;margin-bottom:6px;">☁️🏰☁️</div>' +
        '<h1 style="font-size:26px;color:#33424A;margin:4px 0 8px;font-weight:900;letter-spacing:1px;">くものうえ 学び王国</h1>' +
        '<p style="color:#5C6B67;font-size:13.5px;margin:0 0 30px;line-height:1.7;">教科の島をめぐって、レベルを上げながら<br/>精霊たちとなかよくなろう！</p>' +
        '<div style="display:flex;justify-content:center;gap:14px;margin-bottom:34px;">' +
          SUBJECTS.map(function (s) { return '<div style="font-size:26px;opacity:' + (s.enabled ? 1 : 0.35) + ';">' + s.sEmoji + '</div>'; }).join("") +
        '</div>' +
        '<button class="round-btn" style="background:#FFD65C;color:#33424A;" onclick="goMap()">' + (hasProgress ? "🌤️ つづきから はじめる" : "🌤️ ぼうけんを はじめる") + '</button>' +
        (hasProgress ? '<div style="margin-top:14px;"><button class="small-btn" style="background:transparent;color:#9AA6A0;text-decoration:underline;" onclick="confirmReset()">きろくを けす</button></div>' : "") +
      '</div>' +
    '</div>';
}

function confirmReset() {
  const ok = window.confirm("すべての進んだ記録・間違いのメモが消えます。よろしいですか？");
  if (!ok) return;
  resetAllData();
}

/* ---------- 教科マップ ---------- */
function renderMap() {
  const root = document.getElementById("root");
  root.innerHTML =
    '<div class="shell" style="background:linear-gradient(180deg, #CDEAF7 0%, #FFF6E4 70%);">' +
      cloudDecorHTML(true) +
      '<div class="content" style="padding:20px 16px 28px;">' +
        topBarHTML(true, "goTitle()") +
        '<h2 style="text-align:center;font-size:17px;color:#33424A;margin:12px 0 16px;font-weight:800;">島を えらんでね</h2>' +
        '<div style="display:flex;flex-direction:column;gap:12px;">' +
          SUBJECTS.map(function (s) {
            const p = progress[s.id];
            const clearedCount = p.cleared.filter(Boolean).length;
            const lockedStyle = s.enabled ? "" : "opacity:0.45;";
            return '<button class="island-card card" style="position:relative;padding:14px 16px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:14px;width:100%;border:2px solid #F0EEE7;' + lockedStyle + '" onclick="openLevelSelect(\'' + s.id + '\')">' +
              '<div style="width:54px;height:54px;border-radius:16px;background:' + s.bg + ';display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">' + s.emoji + '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:14.5px;font-weight:800;color:#33424A;">' + s.name + '</div>' +
                '<div style="font-size:12px;color:#7C8B87;margin-top:1px;">' + (s.enabled ? (s.sEmoji + ' ' + s.spirit + '・クリア ' + clearedCount + '/3レベル') : "近日追加予定") + '</div>' +
              '</div>' +
              (s.enabled ? '<div style="font-size:18px;color:#C9CFC5;">→</div>' : '<div style="font-size:18px;">🔒</div>') +
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

    let statusHTML;
    if (!unlocked) {
      statusHTML = '<div style="font-size:11.5px;color:#9AA6A0;">🔒 前のレベルを80%以上でクリアすると解放</div>';
    } else if (cleared) {
      statusHTML = '<div style="font-size:11.5px;color:#7FB685;font-weight:700;">クリア済み・自己ベスト ' + best + '%</div>';
    } else if (best > 0) {
      statusHTML = '<div style="font-size:11.5px;color:#E0A79A;font-weight:700;">挑戦中・自己ベスト ' + best + '%（合格ラインは80%）</div>';
    } else {
      statusHTML = '<div style="font-size:11.5px;color:#7C8B87;">まだ挑戦していません</div>';
    }

    return '<div class="card" style="padding:16px;margin-bottom:12px;' + (unlocked ? "" : "opacity:0.55;") + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
        '<div style="font-size:15px;font-weight:800;color:#33424A;">Lv.' + (li + 1) + ' ' + LEVEL_LABELS[li] + '</div>' +
        (cleared ? '<div style="font-size:18px;">💛</div>' : "") +
      '</div>' +
      statusHTML +
      (mistakeCount > 0 ? '<div style="font-size:11px;color:#C97878;margin-top:4px;">前回の間違い ' + mistakeCount + '問（マイページで確認できます）</div>' : "") +
      '<div style="margin-top:10px;">' +
        (unlocked ? '<button class="round-btn" style="background:' + subj.accent + ';color:#fff;padding:9px 22px;font-size:13px;" onclick="startLevel(' + li + ')">' + (best > 0 ? "もう一度挑戦" : "挑戦する") + '</button>' : "") +
      '</div>' +
    '</div>';
  }).join("");

  root.innerHTML =
    '<div class="shell" style="background:linear-gradient(180deg, ' + subj.bg + ' 0%, #FFFDF9 65%);">' +
      cloudDecorHTML(true) +
      '<div class="content" style="padding:20px 16px 28px;">' +
        topBarHTML(true, "goMap()") +
        '<div style="text-align:center;margin-bottom:16px;">' +
          '<div style="font-size:40px;">' + subj.sEmoji + '</div>' +
          '<div style="font-size:16px;font-weight:800;color:#33424A;margin-top:4px;">' + subj.name + '</div>' +
          '<div style="font-size:12px;color:#7C8B87;">' + subj.spirit + 'と レベルアップしよう</div>' +
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
    let bg = "#FAF9F5", border = "#F0EEE7", color = "#33424A";
    if (state.choiceState) {
      if (i === q.a) { bg = "#EAF4EA"; border = "#7FB685"; }
      else if (i === state.selected) { bg = "#FAECEA"; border = "#E0A79A"; }
    }
    const disabled = state.choiceState ? "disabled" : "";
    return '<button class="choice-btn" style="background:' + bg + ';border-color:' + border + ';color:' + color + ';" ' + disabled + ' onclick="answer(' + i + ')">' + c + '</button>';
  }).join("");

  root.innerHTML =
    '<div class="shell" style="background:linear-gradient(180deg, ' + subj.bg + ' 0%, #FFFDF9 60%);">' +
      cloudDecorHTML(true) +
      '<div class="content" style="padding:16px 16px 22px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<button class="small-btn" style="background:#fff;color:#33424A;" onclick="quitBattleToLevelSelect()">← 中断してもどる</button>' +
          '<button class="small-btn" style="background:#fff;color:#33424A;" onclick="quitBattleToMap()">🗺️ 教科をえらび直す</button>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<span style="font-size:12.5px;font-weight:800;color:' + subj.accentDark + ';">' + subj.emoji + ' ' + subj.name + ' ・ ' + LEVEL_LABELS[state.levelIndex] + '</span>' +
          '<span style="font-size:11.5px;font-weight:700;color:#7C8B87;background:#fff;padding:3px 10px;border-radius:20px;">' + (state.qIndex + 1) + ' / ' + total + '</span>' +
        '</div>' +
        '<div style="height:6px;background:#EFE9DD;border-radius:6px;overflow:hidden;margin-bottom:14px;">' +
          '<div style="height:100%;width:' + progressPct + '%;background:' + subj.accent + ';border-radius:6px;transition:width 0.4s;"></div>' +
        '</div>' +

        '<div class="card" style="padding:20px 16px 16px;position:relative;overflow:hidden;">' +
          '<div class="sparkle-layer" style="position:absolute;inset:0;pointer-events:none;z-index:3;"></div>' +
          '<div style="text-align:center;margin-bottom:10px;">' +
            '<div class="spirit-figure" style="font-size:46px;">' + subj.sEmoji + '</div>' +
            '<div style="font-size:11px;font-weight:700;color:#5C6B67;margin-top:2px;">' + subj.spirit + '</div>' +
          '</div>' +
          '<div style="background:' + subj.bg + ';color:#33424A;border-radius:14px;padding:9px 14px;font-size:12.5px;min-height:36px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:700;">' + state.log + '</div>' +
        '</div>' +

        '<div style="margin-top:14px;" class="card">' +
          '<div style="padding:16px 16px 14px;">' +
          (state.combo > 1 ? '<div style="font-size:11.5px;font-weight:800;color:#FFD65C;margin-bottom:6px;">✨ ' + state.combo + 'れん続 正かい中！</div>' : "") +
          '<div style="font-size:15px;font-weight:800;color:#33424A;margin-bottom:14px;line-height:1.55;">' + q.q + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' + choicesHTML + '</div>' +
          '</div>' +
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
    '<div class="shell" style="background:linear-gradient(180deg, ' + subj.bg + ' 0%, #FFFDF9 60%);">' +
      cloudDecorHTML(passed) +
      '<div class="content" style="text-align:center;padding:44px 24px;">' +
        '<div style="font-size:52px;">' + (passed ? subj.sEmoji + "💛" : subj.sEmoji + "💦") + '</div>' +
        '<h2 style="color:#33424A;font-size:18px;margin:10px 0 4px;font-weight:900;">' +
          (passed ? LEVEL_LABELS[r.levelIndex] + "クリア！" : "もうすこし！") +
        '</h2>' +
        '<p style="color:#7C8B87;font-size:12.5px;margin-bottom:18px;">' + subj.name + ' ・ ' + LEVEL_LABELS[r.levelIndex] + '</p>' +

        '<div class="card" style="display:inline-block;padding:18px 26px;margin-bottom:10px;">' +
          '<div style="font-size:26px;font-weight:900;color:' + subj.accentDark + ';">' + pct + '%</div>' +
          '<div style="font-size:12px;color:#5C6B67;margin-top:2px;">' + r.correct + ' / ' + r.total + ' 問 正解</div>' +
          '<div style="font-size:10.5px;color:#9AA6A0;margin-top:4px;">合格ライン 80%</div>' +
        '</div>' +

        (r.unlocked ? '<div style="background:#FFECC2;border-radius:14px;padding:10px 16px;margin-bottom:18px;font-size:12.5px;font-weight:800;color:#B8860B;">🌟 次のレベルが解放されました！</div>' : "") +
        (!passed && state.sessionMistakes.length > 0 ? '<div style="font-size:12px;color:#C97878;margin-bottom:18px;">間違えた ' + state.sessionMistakes.length + '問は マイページで振り返れます</div>' : '<div style="margin-bottom:18px;"></div>') +

        '<div style="display:flex;flex-direction:column;gap:10px;align-items:center;">' +
          (passed && hasNext ? '<button class="round-btn" style="background:' + subj.accent + ';color:#fff;" onclick="nextLevel()">▶ 次のレベルに挑戦</button>' : "") +
          '<button class="round-btn" style="background:#fff;color:#33424A;box-shadow:0 2px 0 rgba(60,74,62,0.1);" onclick="retryLevel()">🔁 もういちど挑戦</button>' +
          '<button class="small-btn" style="background:#33424A;color:#fff;margin-top:4px;" onclick="goMypage()">📖 マイページで振り返る</button>' +
          '<button class="small-btn" style="background:transparent;color:#7C8B87;text-decoration:underline;" onclick="goMap()">島マップへもどる</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ---------- マイページ（振り返り） ---------- */
function renderMypage() {
  const root = document.getElementById("root");
  const tabId = state.mypageTab;
  const subj = SUBJECTS.filter(function (s) { return s.id === tabId; })[0];

  const tabsHTML = SUBJECTS.map(function (s) {
    return '<button class="tab-btn ' + (s.id === tabId ? "active" : "") + '" onclick="state.mypageTab=\'' + s.id + '\';render();">' + s.emoji + ' ' + s.short + '</button>';
  }).join("");

  let bodyHTML;
  if (!subj.enabled) {
    bodyHTML = '<div style="text-align:center;padding:40px 20px;color:#7C8B87;font-size:13px;">この教科は近日追加予定です</div>';
  } else {
    const p = progress[subj.id];
    const levelBlocks = [0, 1, 2].map(function (li) {
      const list = mistakes[subj.id][li];
      const best = Math.round(p.bestRate[li] * 100);
      const attempted = p.bestRate[li] > 0 || p.cleared[li];

      let listHTML;
      if (!attempted) {
        listHTML = '<div style="font-size:12px;color:#9AA6A0;padding:10px 4px;">まだ挑戦していません</div>';
      } else if (list.length === 0) {
        listHTML = '<div style="font-size:12px;color:#7FB685;padding:10px 4px;">✨ 前回は全問正解でした！</div>';
      } else {
        listHTML = list.map(function (m) {
          return '<div class="review-item">' +
            '<div style="font-size:13px;font-weight:700;color:#33424A;margin-bottom:6px;">' + m.q + '</div>' +
            '<div style="font-size:12px;color:#C97878;">あなたの答え：' + m.choices[m.picked] + '</div>' +
            '<div style="font-size:12px;color:#5C9463;">正しい答え：' + m.choices[m.a] + '</div>' +
          '</div>';
        }).join("");
      }

      return '<div style="margin-bottom:18px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<div style="font-size:13.5px;font-weight:800;color:#33424A;">Lv.' + (li + 1) + ' ' + LEVEL_LABELS[li] + '</div>' +
          (attempted ? '<div style="font-size:11.5px;color:#7C8B87;">自己ベスト ' + best + '%</div>' : "") +
        '</div>' +
        listHTML +
      '</div>';
    }).join("");

    bodyHTML = '<div style="padding:4px 2px 10px;">' +
      '<div style="text-align:center;margin-bottom:16px;">' +
        '<div style="font-size:34px;">' + subj.sEmoji + '</div>' +
        '<div style="font-size:14px;font-weight:800;color:#33424A;margin-top:2px;">' + subj.name + '</div>' +
      '</div>' +
      levelBlocks +
    '</div>';
  }

  root.innerHTML =
    '<div class="shell" style="background:linear-gradient(180deg, #FFF6E4 0%, #FFFDF9 60%);">' +
      '<div class="content scrollable" style="padding:18px 16px 24px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
          '<button class="small-btn" style="background:#fff;color:#33424A;" onclick="goMap()">← 島マップへ</button>' +
          '<div style="font-size:14px;font-weight:900;color:#33424A;">📖 マイページ</div>' +
          '<div style="width:60px;"></div>' +
        '</div>' +
        '<div style="display:flex;border-bottom:1px solid #F0EEE7;margin-bottom:14px;">' + tabsHTML + '</div>' +
        bodyHTML +
        '<div style="text-align:center;margin-top:8px;padding-top:14px;border-top:1px solid #F0EEE7;">' +
          '<button class="small-btn" style="background:transparent;color:#C7B9A0;text-decoration:underline;font-size:11px;" onclick="confirmReset()">きろくを ぜんぶ けす</button>' +
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

loadData();
render();
