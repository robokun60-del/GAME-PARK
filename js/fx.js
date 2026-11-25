/* GAME PARK - 演出 (紙吹雪・効果音)
 * GP.fx.confetti(el)  … el の位置から紙吹雪を飛ばす
 * GP.fx.sound(name)   … 'tap' / 'good' / 'bad' / 'win' の短い効果音 */
(function () {
  'use strict';
  var GP = (window.GP = window.GP || {});
  var COLORS = ['#ff5c8a', '#ffc93c', '#3ddc97', '#4d8dff', '#a66cff', '#ff8a3d'];
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = null;

  function audio() {
    if (ctx) return ctx;
    var A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    try { ctx = new A(); } catch (e) { ctx = null; }
    return ctx;
  }
  function tone(c, freq, start, dur, type, vol) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime + start);
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, c.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur + 0.02);
  }
  var SOUNDS = {
    tap: function (c) { tone(c, 660, 0, 0.08, 'triangle', 0.08); },
    good: function (c) { tone(c, 880, 0, 0.1, 'triangle'); tone(c, 1320, 0.07, 0.14, 'triangle'); },
    bad: function (c) { tone(c, 220, 0, 0.2, 'square', 0.05); },
    win: function (c) {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(c, f, i * 0.09, 0.22, 'triangle', 0.1); });
    }
  };

  function isMuted() {
    try { return window.localStorage.getItem('gamepark:mute') === '1'; } catch (e) { return false; }
  }

  GP.fx = {
    isMuted: isMuted,
    setMuted: function (m) {
      try { window.localStorage.setItem('gamepark:mute', m ? '1' : '0'); } catch (e) { /* noop */ }
    },
    sound: function (name) {
      if (isMuted() || !SOUNDS[name]) return;
      var c = audio();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      try { SOUNDS[name](c); } catch (e) { /* noop */ }
    },
    confetti: function (el) {
      if (reduced) return;
      var r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
      var cx = r.left + r.width / 2, cy = r.top + r.height / 3;
      var layer = document.createElement('div');
      layer.className = 'confetti';
      for (var i = 0; i < 70; i++) {
        var p = document.createElement('i');
        var ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 260;
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        p.style.background = COLORS[i % COLORS.length];
        p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(ang) * dist * 0.7 + 'px');
        p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
        p.style.animationDelay = Math.random() * 0.12 + 's';
        if (i % 3 === 0) p.style.borderRadius = '50%';
        layer.appendChild(p);
      }
      document.body.appendChild(layer);
      setTimeout(function () { layer.remove(); }, 1800);
    }
  };

  /* キャンバス型ゲームの共通部品
   * GP.canvasGame(root, W, H) → { canvas, ctx, overlay, local(e), start(step), stop(), destroy() }
   * step(dt) は毎フレーム呼ばれ、false を返すとループが止まる */
  GP.canvasGame = function (root, W, H) {
    var wrap = document.createElement('div');
    wrap.className = 'cv-wrap';
    wrap.innerHTML = '<canvas class="cv"></canvas><div class="cv-overlay"></div>';
    root.appendChild(wrap);
    var canvas = wrap.firstChild, overlay = wrap.lastChild;
    var ctx = canvas.getContext('2d');
    if (!ctx.roundRect) { /* 古いブラウザ向け */
      ctx.roundRect = function (x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
      };
    }
    var raf = 0, last = 0, stepFn = null, running = false;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      if (stepFn(dt) === false) { running = false; return; }
      raf = requestAnimationFrame(frame);
    }
    function onVis() { if (document.hidden && running) api.onHide && api.onHide(); }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);

    var api = {
      W: W, H: H, wrap: wrap, canvas: canvas, ctx: ctx, overlay: overlay, onHide: null,
      local: function (e) {
        var r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
      },
      start: function (step) {
        stepFn = step; running = true; last = performance.now();
        cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      isRunning: function () { return running; },
      destroy: function () {
        api.stop();
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVis);
      }
    };
    return api;
  };
})();
