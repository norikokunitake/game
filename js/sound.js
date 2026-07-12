/* =========================================================
   sound.js — Web Audio API による軽量効果音
   外部音源ファイルを使わず、その場で音を合成するため
   読み込みが速く、通信量もほぼゼロ
   ========================================================= */

const SoundFX = (function () {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // iOS等でsuspended状態のことがあるため、操作のたびにresumeを試みる
    if (ctx.state === "suspended") {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function playTone(freq, startTime, duration, type, gainPeak) {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  // 正解音：明るい上昇アルペジオ（ピロン↑）
  function correct() {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6
    notes.forEach(function (freq, i) {
      playTone(freq, now + i * 0.07, 0.22, "sine", 0.18);
    });
  }

  // 不正解音：低めの短いブザー（ボゥン）
  function wrong() {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    playTone(220, now, 0.18, "triangle", 0.16);
    playTone(174.61, now + 0.09, 0.22, "triangle", 0.14);
  }

  // タップ音：軽いクリック
  function tap() {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    playTone(1200, now, 0.05, "sine", 0.08);
  }

  // レベルアップ音：華やかな上昇
  function levelUp() {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5,E5,G5,C6
    notes.forEach(function (freq, i) {
      playTone(freq, now + i * 0.09, 0.3, "sine", 0.16);
    });
  }

  return { correct: correct, wrong: wrong, tap: tap, levelUp: levelUp, unlockAudio: getCtx };
})();
