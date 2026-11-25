/* GAME PARK - 数字当てゲーム */
window.GP.registerGame('number-guess', function (root, api) {
  'use strict';
  var fx = window.GP.fx;
  var MIN = 1, MAX = 100;
  var secret, tries, lo, hi, history, done;

  root.innerHTML =
    '<div class="ng">' +
      '<div class="hud">' +
        '<div><span>回数</span><b id="ng-tries">0回</b></div>' +
        '<div><span>範囲</span><b id="ng-range">1〜100</b></div>' +
        '<div><span>ベスト</span><b id="ng-best"></b></div>' +
      '</div>' +
      '<div class="ng-panel" id="ng-panel"></div>' +
    '</div>';

  var panel = root.querySelector('#ng-panel');
  var elTries = root.querySelector('#ng-tries');
  var elRange = root.querySelector('#ng-range');
  var elBest = root.querySelector('#ng-best');

  function fmtBest(v) { return v === null ? '—' : v + '回'; }

  function newGame() {
    secret = MIN + Math.floor(Math.random() * (MAX - MIN + 1));
    tries = 0; lo = MIN; hi = MAX; history = []; done = false;
    api.recordPlay();
    elBest.textContent = fmtBest(api.getBest());
    panel.innerHTML =
      '<p class="ng-emoji" aria-hidden="true">🤔</p>' +
      '<p class="ng-hint" id="ng-hint" role="status" aria-live="polite">1〜100のどれかな？</p>' +
      '<form class="ng-form" id="ng-form" autocomplete="off">' +
        '<input id="ng-input" type="number" inputmode="numeric" min="1" max="100" placeholder="?" aria-label="予想する数字">' +
        '<button type="submit" class="btn btn-primary">判定する</button>' +
      '</form>' +
      '<ul class="ng-history" id="ng-history" aria-label="これまでの予想"></ul>';
    hud();
    focusInput();
  }

  function hud() {
    elTries.textContent = tries + '回';
    elRange.textContent = lo + '〜' + hi;
  }
  function focusInput() {
    var input = panel.querySelector('#ng-input');
    if (input && window.matchMedia('(hover: hover)').matches) input.focus();
  }

  function guess(raw) {
    var hint = panel.querySelector('#ng-hint');
    var input = panel.querySelector('#ng-input');
    var n = Number(raw);
    if (raw === '' || !Number.isInteger(n) || n < MIN || n > MAX) {
      hint.className = 'ng-hint is-warn';
      hint.textContent = MIN + '〜' + MAX + 'の整数を入力してね';
      fx.sound('bad');
      return;
    }
    if (history.indexOf(n) !== -1) {
      hint.className = 'ng-hint is-warn';
      hint.textContent = n + ' はもう試したよ！';
      fx.sound('bad');
      input.select();
      return;
    }
    tries++;
    history.push(n);
    if (n === secret) { win(); return; }

    var up = n < secret;
    if (up) lo = Math.max(lo, n + 1); else hi = Math.min(hi, n - 1);
    hint.className = 'ng-hint ' + (up ? 'is-up' : 'is-down');
    var diff = Math.abs(n - secret);
    var heat = diff <= 3 ? ' 🔥 かなり近い！' : diff <= 10 ? ' ✨ 近いよ！' : '';
    hint.textContent = n + ' より' + (up ? '大きい ⬆' : '小さい ⬇') + heat;
    fx.sound('tap');
    var li = document.createElement('li');
    li.className = up ? 'is-up' : 'is-down';
    li.textContent = n + (up ? ' ↑' : ' ↓');
    panel.querySelector('#ng-history').appendChild(li);
    hud();
    input.value = '';
    focusInput();
  }

  function win() {
    done = true;
    hud();
    var res = api.submitScore(tries);
    elBest.textContent = fmtBest(res.best);
    var rank = tries <= 5 ? '天才！' : tries <= 7 ? 'お見事！' : tries <= 10 ? 'ナイス！' : 'クリア！';
    panel.innerHTML =
      '<div class="result">' +
        (res.isBest ? '<span class="result-badge">🎉 ベスト更新！</span>' : '<span class="result-badge">' + rank + '</span>') +
        '<p class="result-label">正解は</p>' +
        '<p class="result-value">' + secret + '</p>' +
        '<p class="result-meta"><span><b>' + tries + '回</b>で正解</span><span>ベスト <b>' + fmtBest(res.best) + '</b></span></p>' +
        '<button type="button" class="btn btn-primary btn-lg" data-ng="again">もう一度</button>' +
      '</div>';
    fx.sound('win');
    fx.confetti(panel);
  }

  function onSubmit(e) {
    if (e.target.id !== 'ng-form') return;
    e.preventDefault();
    if (!done) guess(panel.querySelector('#ng-input').value.trim());
  }
  function onClick(e) {
    if (e.target.closest('[data-ng="again"]')) newGame();
  }

  panel.addEventListener('submit', onSubmit);
  panel.addEventListener('click', onClick);
  newGame();

  return function unmount() {
    panel.removeEventListener('submit', onSubmit);
    panel.removeEventListener('click', onClick);
  };
});
