/* GAME PARK - スライドパズル (3×3) */
window.GP.registerGame('slide-puzzle', function (root, api) {
  'use strict';
  var fx = window.GP.fx;
  var N = 3, SIZE = N * N;
  var board = [], moves = 0, started = false, solved = false;
  var startTime = 0, timerId = null, tiles = {};

  root.innerHTML =
    '<div class="sp">' +
      '<div class="hud">' +
        '<div><span>手数</span><b id="sp-moves">0手</b></div>' +
        '<div><span>タイム</span><b id="sp-time">0:00</b></div>' +
        '<div><span>ベスト</span><b id="sp-best"></b></div>' +
        '<div class="hud-action"><button type="button" class="btn btn-ghost" data-sp="shuffle">シャッフル</button></div>' +
      '</div>' +
      '<div class="sp-board" id="sp-board" role="grid" aria-label="パズル盤面"></div>' +
      '<p class="sp-status" id="sp-status" role="status" aria-live="polite"></p>' +
    '</div>';

  var boardEl = root.querySelector('#sp-board');
  var elMoves = root.querySelector('#sp-moves');
  var elTime = root.querySelector('#sp-time');
  var elBest = root.querySelector('#sp-best');
  var statusEl = root.querySelector('#sp-status');

  for (var v = 1; v < SIZE; v++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sp-tile c' + v;
    b.dataset.v = v;
    b.innerHTML = '<span>' + v + '</span>';
    boardEl.appendChild(b);
    tiles[v] = b;
  }

  function fmtBest(x) { return x === null ? '—' : x + '手'; }
  function fmtTime(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function neighbors(i) {
    var r = Math.floor(i / N), c = i % N, out = [];
    if (r > 0) out.push(i - N);
    if (r < N - 1) out.push(i + N);
    if (c > 0) out.push(i - 1);
    if (c < N - 1) out.push(i + 1);
    return out;
  }
  function isSolved() {
    for (var i = 0; i < SIZE - 1; i++) if (board[i] !== i + 1) return false;
    return true;
  }

  function shuffle() {
    board = [];
    for (var i = 1; i < SIZE; i++) board.push(i);
    board.push(0);
    var blank = SIZE - 1, prev = -1;
    /* 完成形からランダムに動かすので、必ず解ける配置になる */
    do {
      for (var k = 0; k < 160; k++) {
        var opts = neighbors(blank).filter(function (x) { return x !== prev; });
        var pick = opts[Math.floor(Math.random() * opts.length)];
        board[blank] = board[pick]; board[pick] = 0;
        prev = blank; blank = pick;
      }
    } while (isSolved());
    moves = 0; started = false; solved = false;
    stopTimer();
    elTime.textContent = '0:00';
    boardEl.classList.remove('is-solved');
    statusEl.textContent = 'タイルをタップしてスタート！';
    elBest.textContent = fmtBest(api.getBest());
    draw();
  }

  function draw() {
    var blank = board.indexOf(0), movable = neighbors(blank);
    board.forEach(function (val, i) {
      if (!val) return;
      var t = tiles[val];
      t.style.transform = 'translate(' + (i % N) * 100 + '%,' + Math.floor(i / N) * 100 + '%)';
      t.classList.toggle('is-home', val === i + 1);
      var can = !solved && movable.indexOf(i) !== -1;
      t.classList.toggle('is-movable', can);
      t.disabled = solved;
      t.setAttribute('aria-label', val + (can ? '(動かせる)' : ''));
    });
    elMoves.textContent = moves + '手';
  }

  function startTimer() {
    startTime = performance.now();
    timerId = setInterval(function () { elTime.textContent = fmtTime(performance.now() - startTime); }, 250);
  }
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }

  function moveIndex(i) {
    if (solved) return;
    var blank = board.indexOf(0);
    if (neighbors(blank).indexOf(i) === -1) {
      var t = tiles[board[i]];
      if (t) { t.classList.remove('is-nope'); void t.offsetWidth; t.classList.add('is-nope'); }
      return;
    }
    if (!started) { started = true; api.recordPlay(); startTimer(); statusEl.textContent = ''; }
    board[blank] = board[i]; board[i] = 0;
    moves++;
    fx.sound('tap');
    if (isSolved()) win();
    draw();
  }

  function win() {
    solved = true;
    stopTimer();
    var time = fmtTime(performance.now() - startTime);
    elTime.textContent = time;
    var res = api.submitScore(moves);
    elBest.textContent = fmtBest(res.best);
    boardEl.classList.add('is-solved');
    statusEl.innerHTML = (res.isBest ? '🎉 ベスト更新！ ' : '🎉 クリア！ ') +
      '<b>' + moves + '手</b> / <b>' + time + '</b>　' +
      '<button type="button" class="btn btn-primary btn-sm sp-clear" data-sp="shuffle">もう一度</button>';
    fx.sound('win');
    fx.confetti(boardEl);
  }

  function onClick(e) {
    if (e.target.closest('[data-sp="shuffle"]')) { fx.sound('tap'); shuffle(); return; }
    var t = e.target.closest('.sp-tile');
    if (t) moveIndex(board.indexOf(Number(t.dataset.v)));
  }
  function onKey(e) {
    var map = { ArrowUp: N, ArrowDown: -N, ArrowLeft: 1, ArrowRight: -1 };
    if (!(e.key in map) || solved) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    var blank = board.indexOf(0), target = blank + map[e.key];
    /* 矢印の方向へタイルを動かす (空きマスの反対側のタイル) */
    if (target < 0 || target >= SIZE) return;
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && Math.floor(target / N) !== Math.floor(blank / N)) return;
    e.preventDefault();
    moveIndex(target);
  }

  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  shuffle();

  return function unmount() {
    stopTimer();
    root.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
  };
});
