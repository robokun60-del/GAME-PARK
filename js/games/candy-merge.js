/* GAME PARK - キャンディ・マージ (4×4 スライド合体パズル) */
window.GP.registerGame('candy-merge', function (root, api) {
  'use strict';
  var fx = window.GP.fx;
  var N = 4;
  /* レベルごとのお菓子 (同じお菓子どうしで合体すると次のレベルへ) */
  var CANDY = [null,
    { e: '🍬', c: '#ffd0dd' }, { e: '🍭', c: '#ffb3c7' }, { e: '🍪', c: '#ffe0a3' }, { e: '🍩', c: '#ffc78a' },
    { e: '🧁', c: '#c9f5df' }, { e: '🍫', c: '#d9b99b' }, { e: '🍮', c: '#ffe066' }, { e: '🍰', c: '#c5a3ff' },
    { e: '🎂', c: '#8fb6ff' }, { e: '🍨', c: '#6fd3e8' }, { e: '👑', c: '#ffc93c' }];
  var GOAL = CANDY.length - 1;
  var grid, score, over, won, keepGoing, nextId, cells;

  root.innerHTML =
    '<div class="cm">' +
      '<div class="hud">' +
        '<div><span>スコア</span><b id="cm-score">0</b></div>' +
        '<div><span>最高のお菓子</span><b id="cm-top">🍬</b></div>' +
        '<div><span>ベスト</span><b id="cm-best"></b></div>' +
        '<div class="hud-action"><button type="button" class="btn btn-ghost" data-cm="new">やり直す</button></div>' +
      '</div>' +
      '<div class="cm-board" id="cm-board" aria-label="盤面。スワイプか矢印キーで動かします">' +
        '<div class="cm-bg"></div><div class="cm-tiles" id="cm-tiles"></div>' +
        '<div class="cm-over" id="cm-over" hidden></div>' +
      '</div>' +
      '<ul class="cm-ladder" aria-label="お菓子の進化">' + CANDY.slice(1).map(function (c, i) {
        return '<li title="レベル' + (i + 1) + '">' + c.e + '</li>';
      }).join('<li class="cm-arrow" aria-hidden="true">›</li>') + '</ul>' +
    '</div>';

  var board = root.querySelector('#cm-board');
  var bg = root.querySelector('.cm-bg');
  var tilesEl = root.querySelector('#cm-tiles');
  var overEl = root.querySelector('#cm-over');
  var elScore = root.querySelector('#cm-score');
  var elTop = root.querySelector('#cm-top');
  var elBest = root.querySelector('#cm-best');
  for (var k = 0; k < N * N; k++) bg.appendChild(document.createElement('span'));

  function fmt(v) { return v === null ? '—' : v.toLocaleString('ja-JP'); }

  function newGame() {
    grid = [];
    for (var r = 0; r < N; r++) { grid.push([null, null, null, null]); }
    score = 0; over = false; won = false; keepGoing = false; nextId = 1;
    tilesEl.innerHTML = ''; cells = {};
    overEl.hidden = true;
    addRandom(); addRandom();
    elBest.textContent = fmt(api.getBest());
    api.recordPlay();
    draw();
  }

  function empties() {
    var out = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!grid[r][c]) out.push([r, c]);
    return out;
  }
  function addRandom() {
    var e = empties();
    if (!e.length) return;
    var p = e[Math.floor(Math.random() * e.length)];
    grid[p[0]][p[1]] = { id: nextId++, lv: Math.random() < 0.9 ? 1 : 2, isNew: true };
  }

  /* dir: 0=上 1=右 2=下 3=左 */
  function move(dir) {
    if (over || (won && !keepGoing)) return;
    var moved = false, gained = 0, merges = 0;
    var vec = [[-1, 0], [0, 1], [1, 0], [0, -1]][dir];
    var order = [0, 1, 2, 3];
    var rows = vec[0] === 1 ? order.slice().reverse() : order;
    var cols = vec[1] === 1 ? order.slice().reverse() : order;
    var merged = {};
    for (var r0 = 0; r0 < N; r0++) for (var c0 = 0; c0 < N; c0++) {
      var t = grid[r0][c0]; if (t) { t.isNew = false; t.isMerged = false; }
    }
    rows.forEach(function (r) {
      cols.forEach(function (c) {
        var t = grid[r][c];
        if (!t) return;
        var nr = r, nc = c;
        while (true) {
          var tr = nr + vec[0], tc = nc + vec[1];
          if (tr < 0 || tr >= N || tc < 0 || tc >= N) break;
          var o = grid[tr][tc];
          if (!o) { nr = tr; nc = tc; continue; }
          if (o.lv === t.lv && !merged[o.id] && o.lv < GOAL) {
            grid[r][c] = null;
            /* 合体: 動いてきたタイルは消え、相手が1レベル上がる */
            cells[t.id] && (cells[t.id].style.transform = pos(tr, tc), cells[t.id].classList.add('is-gone'));
            o.lv++; o.isMerged = true; merged[o.id] = true;
            gained += Math.pow(2, o.lv);
            merges++;
            moved = true;
            return;
          }
          break;
        }
        if (nr !== r || nc !== c) {
          grid[nr][nc] = t; grid[r][c] = null; moved = true;
        }
      });
    });
    if (!moved) return;
    score += gained;
    fx.sound(merges ? 'good' : 'tap');
    addRandom();
    draw();
    if (!won && topLevel() >= GOAL) { won = true; showOver(true); }
    else if (!canMove()) { over = true; showOver(false); }
  }

  function canMove() {
    if (empties().length) return true;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var lv = grid[r][c].lv;
      if (c < N - 1 && grid[r][c + 1].lv === lv) return true;
      if (r < N - 1 && grid[r + 1][c].lv === lv) return true;
    }
    return false;
  }
  function topLevel() {
    var m = 1;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c] && grid[r][c].lv > m) m = grid[r][c].lv;
    return m;
  }
  function pos(r, c) { return 'translate(' + c * 100 + '%,' + r * 100 + '%)'; }

  function draw() {
    var alive = {};
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var t = grid[r][c];
      if (!t) continue;
      alive[t.id] = true;
      var el = cells[t.id];
      if (!el) {
        el = document.createElement('div');
        el.className = 'cm-tile';
        el.innerHTML = '<span></span>';
        tilesEl.appendChild(el);
        cells[t.id] = el;
      }
      var cd = CANDY[t.lv];
      el.style.transform = pos(r, c);
      el.firstChild.textContent = cd.e;
      el.firstChild.style.background = cd.c;
      el.firstChild.setAttribute('data-lv', t.lv);
      el.classList.toggle('is-new', !!t.isNew);
      if (t.isMerged) { el.classList.remove('is-merged'); void el.offsetWidth; el.classList.add('is-merged'); }
    }
    Object.keys(cells).forEach(function (id) {
      if (!alive[id]) {
        var gone = cells[id];
        delete cells[id];
        setTimeout(function () { gone.remove(); }, 130);
      }
    });
    elScore.textContent = score.toLocaleString('ja-JP');
    elTop.textContent = CANDY[topLevel()].e;
  }

  function showOver(isWin) {
    var res = api.submitScore(score);
    elBest.textContent = fmt(res.best);
    overEl.hidden = false;
    overEl.innerHTML =
      '<div class="result">' +
        '<span class="result-badge">' + (isWin ? '👑 王冠スイーツ完成！' : res.isBest ? '🎉 ベスト更新！' : 'もう動かせない！') + '</span>' +
        '<p class="result-label">スコア</p>' +
        '<p class="result-value">' + score.toLocaleString('ja-JP') + '<small>点</small></p>' +
        '<p class="result-meta"><span>最高のお菓子 <b>' + CANDY[topLevel()].e + '</b></span><span>ベスト <b>' + fmt(res.best) + '</b></span></p>' +
        '<div class="cm-over-actions">' +
          (isWin ? '<button type="button" class="btn btn-ghost" data-cm="continue">つづける</button>' : '') +
          '<button type="button" class="btn btn-primary" data-cm="new">もう一度</button>' +
        '</div>' +
      '</div>';
    if (isWin || res.isBest) { fx.sound('win'); fx.confetti(board); } else fx.sound('bad');
  }

  /* 入力: 矢印キー / WASD / スワイプ */
  var KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
  function onKey(e) {
    if (!(e.key in KEYS)) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    move(KEYS[e.key]);
  }
  var sx = 0, sy = 0, tracking = false;
  function onDown(e) {
    if (e.target.closest('button')) return;
    tracking = true; sx = e.clientX; sy = e.clientY;
  }
  function onUp(e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : 3); else move(dy > 0 ? 2 : 0);
  }
  function onClick(e) {
    var b = e.target.closest('[data-cm]');
    if (!b) return;
    if (b.dataset.cm === 'new') { fx.sound('tap'); newGame(); }
    if (b.dataset.cm === 'continue') { keepGoing = true; overEl.hidden = true; }
  }

  document.addEventListener('keydown', onKey);
  board.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  root.addEventListener('click', onClick);
  newGame();

  return function unmount() {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerup', onUp);
  };
});
