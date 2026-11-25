/* GAME PARK - ポップレーサー (3車線よけレース) */
window.GP.registerGame('pop-racer', function (root, api) {
  'use strict';
  var fx = window.GP.fx;
  var W = 360, H = 540, INK = '#2b2350';
  var LANES = [75, 180, 285], ROAD_L = 22, ROAD_R = 338;
  var CAR_COLORS = ['#4d8dff', '#3ddc97', '#a66cff', '#ff8a3d', '#6fd3e8'];

  root.innerHTML =
    '<div class="hud">' +
      '<div><span>スコア</span><b id="pr-score">0</b></div>' +
      '<div><span>距離</span><b id="pr-dist">0m</b></div>' +
      '<div><span>スピード</span><b id="pr-speed">0km/h</b></div>' +
    '</div>';
  var cg = window.GP.canvasGame(root, W, H);
  cg.wrap.classList.add('pr');
  var ctx = cg.ctx, overlay = cg.overlay;
  var elScore = root.querySelector('#pr-score');
  var elDist = root.querySelector('#pr-dist');
  var elSpeed = root.querySelector('#pr-speed');

  var car, objs, dist, coins, speed, nextRow, scroll, state = 'idle', paused = false, shake = 0, trees;

  function reset() {
    car = { lane: 1, x: LANES[1], y: H - 90, tilt: 0 };
    objs = []; dist = 0; coins = 0; speed = 250; nextRow = 260; scroll = 0; shake = 0;
    trees = [];
    for (var i = 0; i < 8; i++) trees.push({ side: i % 2, y: i * 75, e: i % 3 === 0 ? '🌷' : '🌳' });
    hud();
  }
  function scoreNow() { return Math.floor(dist / 10) + coins * 50; }
  function hud() {
    elScore.textContent = scoreNow().toLocaleString('ja-JP');
    elDist.textContent = Math.floor(dist / 10).toLocaleString('ja-JP') + 'm';
    elSpeed.textContent = Math.round(speed * 0.4) + 'km/h';
  }
  function fmt(v) { return v === null ? '—' : v.toLocaleString('ja-JP') + '点'; }

  function intro() {
    state = 'idle';
    reset();
    overlay.innerHTML =
      '<div class="cv-card">' +
        '<p class="cv-emoji" aria-hidden="true">🏎️</p>' +
        '<p class="cv-title">ポップレーサー</p>' +
        '<p class="cv-sub">左右タップ / スワイプ / 矢印キーで車線変更<br>車やコーンをよけて🪙コインを集めよう！</p>' +
        '<button type="button" class="btn btn-primary btn-lg" data-pr="start">スタート</button>' +
        '<p class="cv-best">ベスト ' + fmt(api.getBest()) + '</p>' +
      '</div>';
    overlay.hidden = false;
    draw();
  }

  function start() {
    reset();
    api.recordPlay();
    fx.sound('tap');
    overlay.hidden = true;
    state = 'play'; paused = false;
    cg.start(step);
  }

  function spawnRow() {
    var lanes = [0, 1, 2].sort(function () { return Math.random() - 0.5; });
    var blockCount = Math.random() < Math.min(0.55, 0.15 + dist / 40000) ? 2 : 1;
    for (var i = 0; i < blockCount; i++) {
      var isCone = Math.random() < 0.35;
      objs.push({
        kind: isCone ? 'cone' : 'car', lane: lanes[i], y: -60,
        w: isCone ? 34 : 50, h: isCone ? 34 : 84,
        vy: isCone ? 0 : 40 + Math.random() * 60,
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
      });
    }
    if (Math.random() < 0.6) {
      var free = lanes[blockCount];
      for (var c = 0; c < 3; c++) objs.push({ kind: 'coin', lane: free, y: -40 - c * 46, w: 26, h: 26, vy: 0, t: c });
    }
  }

  function changeLane(d) {
    if (state !== 'play' || paused) return;
    var nl = Math.max(0, Math.min(2, car.lane + d));
    if (nl === car.lane) return;
    car.lane = nl;
    car.tilt = d * 0.25;
    fx.sound('tap');
  }

  function step(dt) {
    if (paused) return true;
    speed = Math.min(640, speed + dt * 9);
    var dy = speed * dt;
    dist += dy;
    scroll = (scroll + dy) % 80;
    trees.forEach(function (t) { t.y += dy; if (t.y > H + 30) t.y -= 8 * 75; });

    car.x += (LANES[car.lane] - car.x) * Math.min(1, dt * 14);
    car.tilt *= Math.pow(0.02, dt);

    nextRow -= dy;
    if (nextRow <= 0) {
      spawnRow();
      nextRow = Math.max(170, 300 - dist / 120) + Math.random() * 80;
    }

    var crashed = false;
    objs.forEach(function (o) {
      o.y += dy - o.vy * dt;
      if (o.kind === 'coin') o.t += dt;
      var ox = LANES[o.lane];
      if (Math.abs(ox - car.x) < (o.w + 40) / 2 - 6 && Math.abs(o.y - car.y) < (o.h + 74) / 2 - 8) {
        if (o.kind === 'coin') { o.got = true; coins++; fx.sound('good'); }
        else crashed = true;
      }
    });
    objs = objs.filter(function (o) { return !o.got && o.y < H + 100; });

    hud();
    if (crashed) { crash(); return false; }
    draw();
    return true;
  }

  function crash() {
    state = 'done';
    shake = 1;
    fx.sound('bad');
    var res = api.submitScore(scoreNow());
    var t0 = performance.now();
    (function wobble() {
      shake = Math.max(0, 1 - (performance.now() - t0) / 400);
      draw(true);
      if (shake > 0 && state === 'done') requestAnimationFrame(wobble);
    })();
    overlay.innerHTML =
      '<div class="cv-card result">' +
        (res.isBest ? '<span class="result-badge">🎉 ベスト更新！</span>' : '<span class="result-badge">💥 クラッシュ！</span>') +
        '<p class="result-label">スコア</p>' +
        '<p class="result-value">' + scoreNow().toLocaleString('ja-JP') + '<small>点</small></p>' +
        '<p class="result-meta"><span>距離 <b>' + Math.floor(dist / 10).toLocaleString('ja-JP') + 'm</b></span><span>コイン <b>' + coins + '枚</b></span><span>ベスト <b>' + fmt(res.best) + '</b></span></p>' +
        '<button type="button" class="btn btn-primary btn-lg" data-pr="start">もう一度</button>' +
      '</div>';
    setTimeout(function () { if (state === 'done') overlay.hidden = false; }, 450);
    if (res.isBest) setTimeout(function () { fx.sound('win'); fx.confetti(cg.wrap); }, 450);
  }

  /* ---------- 描画 ---------- */
  function outline(w) { ctx.lineWidth = w || 3; ctx.strokeStyle = INK; ctx.stroke(); }
  function drawCar(x, y, color, tilt, isPlayer) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt || 0);
    ctx.fillStyle = 'rgba(43,35,80,.25)';
    ctx.beginPath(); ctx.roundRect(-22, -36, 48, 82, 14); ctx.fill();
    ctx.fillStyle = INK;
    [[-25, -26], [19, -26], [-25, 14], [19, 14]].forEach(function (p) { ctx.beginPath(); ctx.roundRect(p[0], p[1], 7, 18, 3); ctx.fill(); });
    ctx.beginPath(); ctx.roundRect(-21, -40, 42, 80, 14);
    ctx.fillStyle = color; ctx.fill(); outline(3);
    ctx.beginPath(); ctx.roundRect(-15, -22, 30, 18, 6);
    ctx.fillStyle = '#bfe8ff'; ctx.fill(); outline(2);
    ctx.beginPath(); ctx.roundRect(-14, 10, 28, 14, 5);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); outline(2);
    if (isPlayer) {
      ctx.fillStyle = '#fff'; ctx.font = '900 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 33);
    }
    ctx.restore();
  }
  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake);
    // 芝生
    ctx.fillStyle = '#7fe0b5'; ctx.fillRect(-10, -10, W + 20, H + 20);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (var gy = -80; gy < H + 80; gy += 40) {
      var yy = gy + (scroll % 40);
      ctx.beginPath(); ctx.arc(10, yy, 2.5, 0, Math.PI * 2); ctx.arc(W - 10, yy + 20, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    // 道路
    ctx.fillStyle = '#5b5480'; ctx.fillRect(ROAD_L, -10, ROAD_R - ROAD_L, H + 20);
    // 縁石
    for (var ky = -80; ky < H + 80; ky += 40) {
      var y2 = ky + scroll % 80;
      ctx.fillStyle = Math.floor((ky + 80) / 40) % 2 ? '#fff' : '#ff5c8a';
      ctx.fillRect(ROAD_L - 8, y2, 8, 40); ctx.fillRect(ROAD_R, y2, 8, 40);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ROAD_L - 8, -10); ctx.lineTo(ROAD_L - 8, H + 10); ctx.moveTo(ROAD_R + 8, -10); ctx.lineTo(ROAD_R + 8, H + 10); ctx.stroke();
    // 車線
    ctx.fillStyle = '#ffe066';
    [127, 233].forEach(function (lx) {
      for (var ly = -80; ly < H + 80; ly += 80) ctx.fillRect(lx - 3, ly + scroll, 6, 40);
    });
    // 木
    ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    trees.forEach(function (t) { ctx.fillText(t.e, t.side ? W - 8 : 8, t.y); });

    objs.forEach(function (o) {
      var x = LANES[o.lane];
      if (o.kind === 'coin') {
        var sx = Math.abs(Math.cos(o.t * 5));
        ctx.beginPath(); ctx.ellipse(x, o.y, 12 * Math.max(0.25, sx), 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffc93c'; ctx.fill(); outline(2.5);
      } else if (o.kind === 'cone') {
        ctx.beginPath(); ctx.moveTo(x, o.y - 18); ctx.lineTo(x + 14, o.y + 14); ctx.lineTo(x - 14, o.y + 14); ctx.closePath();
        ctx.fillStyle = '#ff8a3d'; ctx.fill(); outline(3);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 8, o.y - 2, 16, 5);
        ctx.beginPath(); ctx.roundRect(x - 18, o.y + 12, 36, 7, 3); ctx.fillStyle = '#ff8a3d'; ctx.fill(); outline(2);
      } else {
        drawCar(x, o.y, o.color, 0, false);
      }
    });

    drawCar(car.x, car.y, '#ff5c8a', car.tilt, true);
    if (state === 'done') {
      ctx.font = '46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💥', car.x, car.y - 40);
    }
    ctx.restore();

    if (paused) {
      ctx.fillStyle = 'rgba(43,35,80,.55)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = '900 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('一時停止中', W / 2, H / 2 - 10);
      ctx.font = '700 14px sans-serif'; ctx.fillText('タップで再開', W / 2, H / 2 + 22);
    }
  }

  function pause(on) {
    if (state !== 'play') return;
    paused = on;
    if (on) draw();
  }
  cg.onHide = function () { pause(true); };

  /* ---------- 入力 ---------- */
  function onKey(e) {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { pause(!paused); return; }
    if ((e.key === ' ' || e.key === 'Enter') && state !== 'play' && document.activeElement === document.body) { e.preventDefault(); start(); return; }
    if (state !== 'play') return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); changeLane(-1); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); changeLane(1); }
  }
  var sx = 0, sy = 0, down = false;
  function onDown(e) {
    if (state !== 'play') return;
    if (paused) { paused = false; return; }
    down = true; sx = e.clientX; sy = e.clientY;
  }
  function onUp(e) {
    if (!down) return;
    down = false;
    var dx = e.clientX - sx;
    if (Math.abs(dx) > 24) { changeLane(dx > 0 ? 1 : -1); return; }
    /* タップ: 自分の車より左なら左へ、右なら右へ */
    var p = cg.local(e);
    changeLane(p.x < car.x ? -1 : 1);
  }
  function onClick(e) { if (e.target.closest('[data-pr="start"]')) start(); }

  cg.canvas.addEventListener('pointerdown', onDown);
  cg.canvas.addEventListener('pointerup', onUp);
  overlay.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  intro();

  return function unmount() {
    state = 'gone';
    cg.destroy();
    document.removeEventListener('keydown', onKey);
  };
});
