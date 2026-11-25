/* GAME PARK - スター・ブラスター (縦スクロールシューティング) */
window.GP.registerGame('star-blaster', function (root, api) {
  'use strict';
  var fx = window.GP.fx;
  var W = 360, H = 540, INK = '#2b2350';

  root.innerHTML =
    '<div class="hud">' +
      '<div><span>スコア</span><b id="sb-score">0</b></div>' +
      '<div><span>ライフ</span><b id="sb-lives">❤❤❤</b></div>' +
      '<div><span>レベル</span><b id="sb-level">1</b></div>' +
    '</div>';
  var cg = window.GP.canvasGame(root, W, H);
  cg.wrap.classList.add('sb');
  var ctx = cg.ctx, overlay = cg.overlay;
  var elScore = root.querySelector('#sb-score');
  var elLives = root.querySelector('#sb-lives');
  var elLevel = root.querySelector('#sb-level');

  var player, bullets, enemies, ebullets, items, parts, stars;
  var score, lives, level, fireT, spawnT, triple, time, state = 'idle', paused = false;
  var keys = {}, pointer = null;

  stars = [];
  for (var i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 2, v: 20 + Math.random() * 60 });

  function reset() {
    player = { x: W / 2, y: H - 70, r: 15, inv: 0 };
    bullets = []; enemies = []; ebullets = []; items = []; parts = [];
    score = 0; lives = 3; level = 1; fireT = 0; spawnT = 0.6; triple = 0; time = 0;
    hud();
  }
  function hud() {
    elScore.textContent = score.toLocaleString('ja-JP');
    elLives.textContent = lives > 0 ? new Array(lives + 1).join('❤') : '—';
    elLevel.textContent = level;
  }

  function intro() {
    state = 'idle';
    overlay.innerHTML =
      '<div class="cv-card">' +
        '<p class="cv-emoji" aria-hidden="true">🚀</p>' +
        '<p class="cv-title">スター・ブラスター</p>' +
        '<p class="cv-sub">ドラッグ / 矢印キーで移動・弾は自動発射<br>⭐で3way弾、💖でライフ回復！</p>' +
        '<button type="button" class="btn btn-primary btn-lg" data-sb="start">スタート</button>' +
        '<p class="cv-best">ベスト ' + fmt(api.getBest()) + '</p>' +
      '</div>';
    overlay.hidden = false;
    reset();
    draw();
  }
  function fmt(v) { return v === null ? '—' : v.toLocaleString('ja-JP') + '点'; }

  function start() {
    reset();
    api.recordPlay();
    fx.sound('tap');
    overlay.hidden = true;
    state = 'play'; paused = false;
    cg.start(step);
  }

  function spawnEnemy() {
    var r = Math.random(), e;
    if (level >= 3 && r < 0.18) e = { type: 'tank', r: 24, hp: 4, vy: 45, vx: 0, pts: 300, color: '#a66cff' };
    else if (level >= 2 && r < 0.5) e = { type: 'zig', r: 16, hp: 1, vy: 90 + level * 6, vx: 0, pts: 150, color: '#3ddc97' };
    else e = { type: 'basic', r: 17, hp: 1, vy: 80 + level * 8, vx: (Math.random() - 0.5) * 40, pts: 100, color: '#ff8a3d' };
    e.x = e.r + Math.random() * (W - e.r * 2);
    e.y = -e.r;
    e.t = Math.random() * 6;
    e.maxHp = e.hp;
    e.shootT = 1 + Math.random() * 2;
    e.flash = 0;
    enemies.push(e);
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.3, color: color });
    }
  }

  function hitPlayer() {
    if (player.inv > 0) return;
    lives--;
    player.inv = 1.6;
    burst(player.x, player.y, '#ff5c8a', 18);
    fx.sound('bad');
    cg.wrap.classList.remove('is-hit'); void cg.wrap.offsetWidth; cg.wrap.classList.add('is-hit');
    hud();
    if (lives <= 0) gameOver();
  }

  function step(dt) {
    if (paused) return true;
    time += dt;
    // 背景の星
    stars.forEach(function (s) { s.y += s.v * dt; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } });

    // 自機の移動
    var sp = 280;
    if (keys.left) player.x -= sp * dt;
    if (keys.right) player.x += sp * dt;
    if (keys.up) player.y -= sp * dt;
    if (keys.down) player.y += sp * dt;
    if (pointer) {
      player.x += (pointer.x - player.x) * Math.min(1, dt * 14);
      player.y += (pointer.y - 50 - player.y) * Math.min(1, dt * 14);
    }
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(H * 0.35, Math.min(H - player.r - 6, player.y));
    if (player.inv > 0) player.inv -= dt;
    if (triple > 0) triple -= dt;

    // 自動発射
    fireT -= dt;
    if (fireT <= 0) {
      fireT = 0.17;
      bullets.push({ x: player.x, y: player.y - 18, vx: 0, vy: -520 });
      if (triple > 0) {
        bullets.push({ x: player.x - 8, y: player.y - 12, vx: -140, vy: -500 });
        bullets.push({ x: player.x + 8, y: player.y - 12, vx: 140, vy: -500 });
      }
    }
    bullets.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; });
    bullets = bullets.filter(function (b) { return b.y > -20 && b.x > -20 && b.x < W + 20; });

    // 敵の出現
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnEnemy();
      spawnT = Math.max(0.28, 1.05 - level * 0.09) * (0.7 + Math.random() * 0.6);
    }

    enemies.forEach(function (e) {
      e.t += dt;
      if (e.type === 'zig') e.x += Math.sin(e.t * 4) * 150 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.r || e.x > W - e.r) e.vx *= -1;
      if (e.flash > 0) e.flash -= dt;
      if (level >= 3 && e.y > 20 && e.y < H * 0.6) {
        e.shootT -= dt;
        if (e.shootT <= 0) {
          e.shootT = 2.2 + Math.random() * 2 - Math.min(1, level * 0.08);
          var a = Math.atan2(player.y - e.y, player.x - e.x), v = 150 + level * 8;
          ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
        }
      }
    });

    // 当たり判定: 弾 × 敵
    bullets.forEach(function (b) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.hp > 0 && Math.abs(b.x - e.x) < e.r + 3 && Math.abs(b.y - e.y) < e.r + 6) {
          b.y = -999; e.hp--; e.flash = 0.08;
          if (e.hp <= 0) {
            score += e.pts;
            burst(e.x, e.y, e.color, 14);
            fx.sound('good');
            var drop = Math.random();
            if (drop < 0.07) items.push({ x: e.x, y: e.y, type: 'star', t: 0 });
            else if (drop < 0.1 && lives < 3) items.push({ x: e.x, y: e.y, type: 'heart', t: 0 });
          }
          break;
        }
      }
    });
    enemies = enemies.filter(function (e) {
      if (e.hp <= 0) return false;
      if (e.y > H + e.r) return false;
      var d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < e.r + player.r - 4) { e.hp = 0; burst(e.x, e.y, e.color, 10); hitPlayer(); return false; }
      return true;
    });

    ebullets.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; });
    ebullets = ebullets.filter(function (b) {
      if (Math.hypot(b.x - player.x, b.y - player.y) < player.r - 3) { hitPlayer(); return false; }
      return b.y < H + 10 && b.y > -10 && b.x > -10 && b.x < W + 10;
    });

    items.forEach(function (it) { it.y += 90 * dt; it.t += dt; });
    items = items.filter(function (it) {
      if (Math.hypot(it.x - player.x, it.y - player.y) < player.r + 14) {
        if (it.type === 'star') triple = 8; else lives = Math.min(3, lives + 1);
        fx.sound('win');
        burst(it.x, it.y, '#ffc93c', 12);
        hud();
        return false;
      }
      return it.y < H + 20;
    });

    parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; });
    parts = parts.filter(function (p) { return p.life > 0; });

    var nl = 1 + Math.floor(score / 1500);
    if (nl !== level) { level = nl; fx.sound('good'); }
    hud();
    draw();
    return state === 'play';
  }

  /* ---------- 描画 ---------- */
  function outline(w) { ctx.lineWidth = w || 3; ctx.strokeStyle = INK; ctx.stroke(); }
  function draw() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3a2d78'); g.addColorStop(1, '#7a4fd0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    stars.forEach(function (s) { ctx.globalAlpha = 0.4 + s.s / 4; ctx.fillRect(s.x, s.y, s.s, s.s * 2); });
    ctx.globalAlpha = 1;

    items.forEach(function (it) {
      ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.type === 'star' ? '⭐' : '💖', it.x, it.y + Math.sin(it.t * 6) * 3);
    });

    bullets.forEach(function (b) {
      ctx.beginPath(); ctx.roundRect(b.x - 3.5, b.y - 9, 7, 18, 4);
      ctx.fillStyle = '#ffc93c'; ctx.fill(); outline(2);
    });
    ebullets.forEach(function (b) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5c8a'; ctx.fill(); outline(2);
    });

    enemies.forEach(function (e) {
      ctx.beginPath();
      if (e.type === 'tank') ctx.roundRect(e.x - e.r, e.y - e.r * 0.8, e.r * 2, e.r * 1.6, 12);
      else ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = e.flash > 0 ? '#fff' : e.color; ctx.fill(); outline(3);
      // 目
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.x - e.r * 0.35, e.y - 2, e.r * 0.26, 0, Math.PI * 2); ctx.arc(e.x + e.r * 0.35, e.y - 2, e.r * 0.26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(e.x - e.r * 0.35, e.y, e.r * 0.12, 0, Math.PI * 2); ctx.arc(e.x + e.r * 0.35, e.y, e.r * 0.12, 0, Math.PI * 2); ctx.fill();
      if (e.type === 'tank' && e.hp < e.maxHp) {
        ctx.fillStyle = INK; ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 5);
        ctx.fillStyle = '#3ddc97'; ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * e.hp / e.maxHp, 5);
      }
    });

    parts.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    });
    ctx.globalAlpha = 1;

    // 自機
    if (!(player.inv > 0 && Math.floor(player.inv * 12) % 2)) {
      var x = player.x, y = player.y;
      ctx.beginPath(); ctx.moveTo(x - 6, y + 14); ctx.lineTo(x, y + 24 + Math.random() * 6); ctx.lineTo(x + 6, y + 14);
      ctx.fillStyle = '#ffc93c'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y - 20); ctx.quadraticCurveTo(x + 10, y - 8, x + 18, y + 12); ctx.lineTo(x + 8, y + 15);
      ctx.lineTo(x - 8, y + 15); ctx.lineTo(x - 18, y + 12); ctx.quadraticCurveTo(x - 10, y - 8, x, y - 20);
      ctx.fillStyle = triple > 0 ? '#ffc93c' : '#ff5c8a'; ctx.fill(); outline(3);
      ctx.beginPath(); ctx.arc(x, y - 3, 5, 0, Math.PI * 2); ctx.fillStyle = '#8fd6ff'; ctx.fill(); outline(2);
    }

    if (paused) {
      ctx.fillStyle = 'rgba(43,35,80,.55)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = '900 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('一時停止中', W / 2, H / 2 - 10);
      ctx.font = '700 14px sans-serif'; ctx.fillText('タップで再開', W / 2, H / 2 + 22);
    }
  }

  function gameOver() {
    state = 'done';
    var res = api.submitScore(score);
    draw();
    overlay.innerHTML =
      '<div class="cv-card result">' +
        (res.isBest ? '<span class="result-badge">🎉 ベスト更新！</span>' : '<span class="result-badge">GAME OVER</span>') +
        '<p class="result-label">スコア</p>' +
        '<p class="result-value">' + score.toLocaleString('ja-JP') + '<small>点</small></p>' +
        '<p class="result-meta"><span>到達レベル <b>' + level + '</b></span><span>ベスト <b>' + fmt(res.best) + '</b></span></p>' +
        '<button type="button" class="btn btn-primary btn-lg" data-sb="start">もう一度</button>' +
      '</div>';
    overlay.hidden = false;
    if (res.isBest) { fx.sound('win'); fx.confetti(cg.wrap); }
  }

  function pause(on) {
    if (state !== 'play') return;
    paused = on;
    if (on) draw();
  }
  cg.onHide = function () { pause(true); };

  /* ---------- 入力 ---------- */
  var KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
  function onKeyDown(e) {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { pause(!paused); return; }
    if ((e.key === ' ' || e.key === 'Enter') && state !== 'play' && document.activeElement === document.body) { e.preventDefault(); start(); return; }
    if (KEYMAP[e.key] && state === 'play') { keys[KEYMAP[e.key]] = true; e.preventDefault(); }
  }
  function onKeyUp(e) { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; }
  function onDown(e) {
    if (state !== 'play') return;
    if (paused) { paused = false; return; }
    pointer = cg.local(e);
    cg.canvas.setPointerCapture && cg.canvas.setPointerCapture(e.pointerId);
  }
  function onMove(e) { if (pointer) pointer = cg.local(e); }
  function onUp() { pointer = null; }
  function onClick(e) { if (e.target.closest('[data-sb="start"]')) start(); }

  cg.canvas.addEventListener('pointerdown', onDown);
  cg.canvas.addEventListener('pointermove', onMove);
  cg.canvas.addEventListener('pointerup', onUp);
  cg.canvas.addEventListener('pointercancel', onUp);
  overlay.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  intro();

  return function unmount() {
    cg.destroy();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  };
});
