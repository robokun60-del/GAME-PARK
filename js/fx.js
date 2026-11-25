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
})();
