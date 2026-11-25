/* GAME PARK - 反射神経チャレンジ */
window.GP.registerGame('reaction', function (root, api) {
  'use strict';
  var fx = window.GP.fx;
  var ROUNDS = 5, TIMEOUT = 2000, TARGET = 84;
  var state = 'idle'; // idle / waiting / showing / between / done
  var round = 0, score = 0, results = [], shownAt = 0;
  var timers = [];

  root.innerHTML =
    '<div class="rx">' +
      '<div class="hud">' +
        '<div><span>ラウンド</span><b id="rx-round">0 / ' + ROUNDS + '</b></div>' +
        '<div><span>スコア</span><b id="rx-score">0</b></div>' +
        '<div><span>ベスト</span><b id="rx-best">' + fmt(api.getBest()) + '</b></div>' +
      '</div>' +
      '<div class="rx-arena" id="rx-arena" role="application" aria-label="ゲームエリア">' +
        '<div class="rx-msg" id="rx-msg"></div>' +
      '</div>' +
    '</div>';

  var arena = root.querySelector('#rx-arena');
  var msg = root.querySelector('#rx-msg');
  var elRound = root.querySelector('#rx-round');
  var elScore = root.querySelector('#rx-score');
  var elBest = root.querySelector('#rx-best');

  function fmt(v) { return v === null ? '—' : v.toLocaleString('ja-JP'); }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function removeTarget() { var t = arena.querySelector('.rx-target'); if (t) t.remove(); }
  function hud() {
    elRound.textContent = round + ' / ' + ROUNDS;
    elScore.textContent = score.toLocaleString('ja-JP');
  }
  function shake() {
    arena.classList.remove('is-miss');
    void arena.offsetWidth;
    arena.classList.add('is-miss');
  }
  function flash(html, bad) {
    msg.innerHTML = '<div class="rx-flash' + (bad ? ' is-bad' : '') + '">' + html + '</div>';
  }

  function intro() {
    state = 'idle';
    msg.innerHTML =
      '<p class="rx-emoji" aria-hidden="true">⚡</p>' +
      '<p class="rx-big">ターゲットが出たら即タップ！</p>' +
      '<p class="rx-sub">全' + ROUNDS + 'ラウンド・1回最大1000点</p>' +
      '<button type="button" class="btn btn-primary btn-lg" data-rx="start">スタート</button>';
  }

  function start() {
    clearTimers();
    round = 0; score = 0; results = [];
    api.recordPlay();
    fx.sound('tap');
    hud();
    nextRound();
  }

  function nextRound() {
    removeTarget();
    if (round >= ROUNDS) { finish(); return; }
    round++;
    hud();
    state = 'waiting';
    msg.innerHTML = '<p class="rx-wait">まだだよ…</p>';
    later(showTarget, 900 + Math.random() * 2100);
  }

  function showTarget() {
    state = 'showing';
    msg.innerHTML = '';
    var w = arena.clientWidth, h = arena.clientHeight, pad = 12;
    var x = pad + Math.random() * Math.max(0, w - TARGET - pad * 2);
    var y = pad + Math.random() * Math.max(0, h - TARGET - pad * 2);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rx-target';
    b.setAttribute('aria-label', 'ターゲット');
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    arena.appendChild(b);
    shownAt = performance.now();
    later(function () {
      if (state !== 'showing') return;
      removeTarget();
      results.push({ label: 'OUT', pts: 0 });
      fx.sound('bad');
      flash('時間切れ！<small>+0</small>', true);
      between();
    }, TIMEOUT);
  }

  function hit() {
    var ms = Math.round(performance.now() - shownAt);
    var pts = Math.max(0, Math.min(1000, Math.round(1000 - (ms - 200) * 1.25)));
    clearTimers();
    removeTarget();
    score += pts;
    results.push({ label: ms + 'ms', pts: pts });
    hud();
    fx.sound('good');
    var word = ms < 280 ? 'すごい！' : ms < 380 ? 'はやい！' : ms < 500 ? 'いいね！' : 'OK！';
    flash(word + ' ' + ms + 'ms<small>+' + pts + '</small>');
    between();
  }

  function miss(early) {
    score = Math.max(0, score - 100);
    hud();
    shake();
    fx.sound('bad');
    if (early) {
      clearTimers();
      results.push({ label: 'フライング', pts: -100 });
      flash('フライング！<small>−100</small>', true);
      between();
    }
  }

  function between() {
    state = 'between';
    later(nextRound, 1000);
  }

  function finish() {
    state = 'done';
    var res = api.submitScore(score);
    elBest.textContent = fmt(res.best);
    var times = results.filter(function (r) { return /ms$/.test(r.label); }).map(function (r) { return parseInt(r.label, 10); });
    var avg = times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : null;
    var fastest = times.length ? Math.min.apply(null, times) : null;
    msg.innerHTML =
      '<div class="result">' +
        (res.isBest ? '<span class="result-badge">🎉 ベスト更新！</span>' : '') +
        '<p class="result-label">トータルスコア</p>' +
        '<p class="result-value">' + score.toLocaleString('ja-JP') + '<small>点</small></p>' +
        '<ol class="rx-rounds">' + results.map(function (r, i) {
          return '<li><small>R' + (i + 1) + '</small>' + r.label + '</li>';
        }).join('') + '</ol>' +
        '<p class="result-meta"><span>平均 <b>' + (avg === null ? '—' : avg + 'ms') + '</b></span>' +
        '<span>最速 <b>' + (fastest === null ? '—' : fastest + 'ms') + '</b></span></p>' +
        '<button type="button" class="btn btn-primary btn-lg" data-rx="start">もう一度</button>' +
      '</div>';
    if (res.isBest) { fx.sound('win'); fx.confetti(arena); }
  }

  function onDown(e) {
    var startBtn = e.target.closest('[data-rx="start"]');
    if (startBtn) { e.preventDefault(); start(); return; }
    if (e.target.closest('.rx-target')) { e.preventDefault(); if (state === 'showing') hit(); return; }
    if (state === 'waiting') miss(true);
    else if (state === 'showing') miss(false);
  }
  function onKey(e) {
    if ((e.key === ' ' || e.key === 'Enter') && (state === 'idle' || state === 'done') && document.activeElement === document.body) {
      e.preventDefault();
      start();
    }
  }

  arena.addEventListener('pointerdown', onDown);
  document.addEventListener('keydown', onKey);
  intro();

  return function unmount() {
    clearTimers();
    arena.removeEventListener('pointerdown', onDown);
    document.removeEventListener('keydown', onKey);
  };
});
