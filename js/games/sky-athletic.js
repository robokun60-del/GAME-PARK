/* GAME PARK - スカイ・アスレチック (3Dアクション)
 * Three.js (js/vendor/three.min.js) をこのゲームを開いたときだけ読み込みます。 */
window.GP.registerGame('sky-athletic', function (root, api) {
  'use strict';
  var fx = window.GP.fx;
  var alive = true;
  var cleanup = [];

  root.innerHTML =
    '<div class="hud">' +
      '<div><span>タイム</span><b id="ath-time">0.00秒</b></div>' +
      '<div><span>落下</span><b id="ath-falls">0回</b></div>' +
      '<div><span>チェックポイント</span><b id="ath-cp">0 / 3</b></div>' +
    '</div>' +
    '<div class="ath-wrap" id="ath-wrap">' +
      '<div class="ath-view" id="ath-view"></div>' +
      '<div class="ath-pad" id="ath-pad" aria-hidden="true"><div class="ath-stick" id="ath-stick"></div></div>' +
      '<button type="button" class="ath-jump" id="ath-jump" aria-label="ジャンプ">JUMP</button>' +
      '<div class="ath-toast" id="ath-toast" role="status" aria-live="polite"></div>' +
      '<div class="cv-overlay" id="ath-overlay"><div class="cv-card"><p class="cv-emoji">⏳</p><p class="cv-title">3Dを読み込み中…</p></div></div>' +
    '</div>';

  var wrap = root.querySelector('#ath-wrap');
  var view = root.querySelector('#ath-view');
  var overlay = root.querySelector('#ath-overlay');
  var toastEl = root.querySelector('#ath-toast');
  var elTime = root.querySelector('#ath-time');
  var elFalls = root.querySelector('#ath-falls');
  var elCp = root.querySelector('#ath-cp');

  function loadThree(cb) {
    if (window.THREE) { cb(); return; }
    var s = document.querySelector('script[data-three]');
    if (!s) {
      s = document.createElement('script');
      s.src = 'js/vendor/three.min.js';
      s.dataset.three = '1';
      document.head.appendChild(s);
    }
    s.addEventListener('load', cb);
    s.addEventListener('error', function () {
      overlay.innerHTML = '<div class="cv-card"><p class="cv-emoji">😢</p><p class="cv-title">3Dの読み込みに失敗しました</p><p class="cv-sub">ページを再読み込みしてください。</p></div>';
    });
  }

  loadThree(function () { if (alive) init(window.THREE); });

  function init(THREE) {
    var test = document.createElement('canvas');
    if (!(test.getContext('webgl') || test.getContext('experimental-webgl'))) {
      overlay.innerHTML = '<div class="cv-card"><p class="cv-emoji">😢</p><p class="cv-title">この端末は3D表示に対応していません</p></div>';
      return;
    }

    /* ---------- シーン ---------- */
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    view.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color('#9fdcff');
    scene.fog = new THREE.Fog('#c9ecff', 30, 90);
    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);

    scene.add(new THREE.HemisphereLight('#ffffff', '#b9a6ff', 0.75));
    var sun = new THREE.DirectionalLight('#fff4dc', 0.85);
    sun.position.set(8, 18, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 60;
    scene.add(sun); scene.add(sun.target);

    function mat(color) { return new THREE.MeshLambertMaterial({ color: color }); }
    var INK = '#2b2350';

    /* 雲 */
    var cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    for (var ci = 0; ci < 18; ci++) {
      var cloud = new THREE.Group();
      for (var cj = 0; cj < 4; cj++) {
        var puff = new THREE.Mesh(new THREE.SphereGeometry(1.4 + Math.random() * 1.2, 12, 10), cloudMat);
        puff.position.set(cj * 1.6 - 2.4, Math.random() * 0.6, Math.random() * 1.2);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 70, -8 - Math.random() * 10, 10 - Math.random() * 120);
      scene.add(cloud);
    }

    /* ---------- コース ---------- */
    var COLORS = ['#ff8fab', '#ffd84d', '#7fe0b5', '#8fb6ff', '#ffab73', '#c5a3ff'];
    var plats = [];
    var colorIdx = 0;
    function addPlat(o) {
      o.w = o.w || 3; o.h = o.h || 0.8; o.d = o.d || 3;
      o.base = new THREE.Vector3(o.x, o.y, o.z);
      var color = o.color || COLORS[colorIdx++ % COLORS.length];
      var g = new THREE.Group();
      var top = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.d), mat(color));
      top.castShadow = true; top.receiveShadow = true;
      g.add(top);
      var edge = new THREE.LineSegments(new THREE.EdgesGeometry(top.geometry), new THREE.LineBasicMaterial({ color: INK }));
      g.add(edge);
      g.position.copy(o.base);
      scene.add(g);
      o.mesh = g; o.body = top;
      o.prev = o.base.clone();
      o.t0 = Math.random() * 6;
      plats.push(o);
      return o;
    }
    function flag(p, color, isGoal) {
      var g = new THREE.Group();
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), mat('#ffffff'));
      pole.position.y = 1.2; g.add(pole);
      var cloth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.05), mat(color));
      cloth.position.set(0.48, 2.05, 0); g.add(cloth);
      if (isGoal) {
        var ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.18, 10, 32), mat('#ffc93c'));
        ring.position.set(0, 1.6, 0); g.add(ring);
        g.userData.ring = ring;
      }
      g.position.set(p.w / 2 - 0.6, p.h / 2, 0);
      g.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
      p.mesh.add(g);
      p.flag = g;
      return g;
    }

    // 1. スタート
    var start = addPlat({ x: 0, y: 0, z: 0, w: 6, d: 6, color: '#ffffff' });
    // 2. 飛び石
    addPlat({ x: 0, y: 0.5, z: -6, w: 2.4, d: 2.4 });
    addPlat({ x: 1.8, y: 1.1, z: -9.6, w: 2.2, d: 2.2 });
    addPlat({ x: -0.6, y: 1.7, z: -13.2, w: 2.2, d: 2.2 });
    addPlat({ x: 1.2, y: 2.3, z: -16.8, w: 2.2, d: 2.2 });
    // CP1
    var cp1 = addPlat({ x: 0, y: 2.3, z: -21.5, w: 5, d: 5, color: '#ffffff', cp: 1 });
    // 3. 動く足場
    addPlat({ x: 0, y: 2.3, z: -26.5, w: 2.6, d: 2.6, move: { axis: 'x', amp: 3.2, speed: 1.3 } });
    addPlat({ x: 0, y: 2.3, z: -31, w: 2.6, d: 2.6, move: { axis: 'x', amp: 3.2, speed: -1.6 } });
    addPlat({ x: 0, y: 2.3, z: -35.5, w: 2.6, d: 2.6, move: { axis: 'y', amp: 1.2, speed: 1.6 } });
    // 4. 落ちる床
    for (var fz = 0; fz < 4; fz++) {
      for (var fxi = -1; fxi <= 1; fxi++) {
        addPlat({ x: fxi * 2.1, y: 2.3, z: -40 - fz * 2.1, w: 1.9, h: 0.5, d: 1.9, color: '#ffe9a8', fall: true });
      }
    }
    // CP2
    var cp2 = addPlat({ x: 0, y: 2.3, z: -51, w: 5, d: 5, color: '#ffffff', cp: 2 });
    // 5. ぐるぐるバー
    var spinPad = addPlat({ x: 0, y: 2.3, z: -59, w: 9, d: 9, color: '#c9f5df' });
    var bar = new THREE.Group();
    var barMesh = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.35, 0.35), mat('#ff5c8a'));
    barMesh.castShadow = true;
    bar.add(barMesh);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 16), mat('#ffc93c'));
    hub.position.y = -0.3; bar.add(hub);
    bar.position.set(0, spinPad.h / 2 + 0.55, 0);
    spinPad.mesh.add(bar);
    // 6. ジャンプ台 → 高台
    addPlat({ x: 0, y: 2.3, z: -66.5, w: 3, d: 3, color: '#ffffff' });
    var pad = addPlat({ x: 0, y: 2.5, z: -70.5, w: 2.4, h: 0.4, d: 2.4, color: '#3ddc97', bounce: 17 });
    var arrow = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.8, 4), mat('#ffffff'));
    arrow.position.y = 0.8; pad.mesh.add(arrow);
    var cp3 = addPlat({ x: 0, y: 8.5, z: -76, w: 5, d: 5, color: '#ffffff', cp: 3 });
    // 7. 細い橋 (左右に揺れる)
    addPlat({ x: 0, y: 8.5, z: -82.5, w: 1.1, h: 0.5, d: 7, color: '#ffab73' });
    addPlat({ x: 0, y: 8.5, z: -88.6, w: 2, d: 2, move: { axis: 'x', amp: 1.6, speed: 2 } });
    addPlat({ x: 0, y: 8.5, z: -94.5, w: 1.1, h: 0.5, d: 7, color: '#ffab73' });
    // ゴール
    var goal = addPlat({ x: 0, y: 8.5, z: -101.5, w: 6, d: 6, color: '#ffd84d', goal: true });
    flag(cp1, '#4d8dff'); flag(cp2, '#4d8dff'); flag(cp3, '#4d8dff');
    var goalFlag = flag(goal, '#ff5c8a', true);
    goalFlag.position.set(0, goal.h / 2, -1.5);

    /* ---------- キャラクター ---------- */
    var hero = new THREE.Group();
    var bodyMat = mat('#ff5c8a');
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.7, 16), bodyMat);
    body.position.y = 0.55; hero.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), mat('#ffe3ea'));
    head.position.y = 1.15; hero.add(head);
    var eyeMat = mat(INK);
    [-0.14, 0.14].forEach(function (ex) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
      eye.position.set(ex, 1.2, -0.37); hero.add(eye);
    });
    var cheekMat = mat('#ff8fab');
    [-0.25, 0.25].forEach(function (ex) {
      var ch = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), cheekMat);
      ch.position.set(ex, 1.08, -0.35); hero.add(ch);
    });
    var cap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#4d8dff'));
    cap.position.y = 1.2; hero.add(cap);
    var feet = [];
    [-0.17, 0.17].forEach(function (ex) {
      var f = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(INK));
      f.position.set(ex, 0.12, 0); hero.add(f); feet.push(f);
    });
    hero.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    scene.add(hero);
    var shadowDot = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshBasicMaterial({ color: '#2b2350', transparent: true, opacity: 0.25 }));
    shadowDot.rotation.x = -Math.PI / 2;
    scene.add(shadowDot);

    /* ---------- 状態 ---------- */
    var P = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), ground: null, coyote: 0, face: 0, squash: 0 };
    var R = 0.38, HEIGHT = 1.5, GRAV = 26, JUMP = 9.6, SPEED = 6.2;
    var yaw = 0, pitch = 0.42, camDist = 7.5;
    var state = 'ready', time = 0, falls = 0, cp = 0, checkpoint = start, started = false, jumpBuf = 0;
    var input = { x: 0, z: 0 }, keys = {}, stick = { x: 0, z: 0 };
    var clock = new THREE.Clock(), raf = 0, elapsed = 0;

    function respawn(p) {
      P.pos.set(p.mesh.position.x, p.mesh.position.y + p.h / 2 + 0.01, p.mesh.position.z);
      P.vel.set(0, 0, 0);
      P.ground = p;
    }
    function resetAll() {
      plats.forEach(function (p) {
        if (p.fall) { p.fallT = null; p.dropping = false; p.gone = false; p.mesh.visible = true; p.mesh.position.copy(p.base); }
      });
      time = 0; falls = 0; cp = 0; checkpoint = start; started = false; yaw = 0;
      respawn(start);
      hud();
    }
    function hud() {
      elTime.textContent = time.toFixed(2) + '秒';
      elFalls.textContent = falls + '回';
      elCp.textContent = cp + ' / 3';
    }
    var toastTimer = null;
    function toast(t) {
      toastEl.textContent = t;
      toastEl.classList.remove('is-on'); void toastEl.offsetWidth; toastEl.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1400);
    }
    function fmtBest(v) { return v === null ? '—' : v.toFixed(2) + '秒'; }
    var touchUI = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;

    function showIntro() {
      state = 'ready';
      overlay.hidden = false;
      overlay.innerHTML =
        '<div class="cv-card">' +
          '<p class="cv-emoji" aria-hidden="true">🏃</p>' +
          '<p class="cv-title">スカイ・アスレチック</p>' +
          '<p class="cv-sub">空に浮かぶコースをかけぬけて🏁ゴールを目指そう！<br>' +
          (touchUI ? '左下スティックで移動・JUMPでジャンプ<br>画面ドラッグで視点を回転' : 'WASD/矢印で移動・スペースでジャンプ<br>ドラッグ(またはQ/E)で視点を回転') + '</p>' +
          '<button type="button" class="btn btn-primary btn-lg" data-ath="start">スタート</button>' +
          '<p class="cv-best">ベスト ' + fmtBest(api.getBest()) + '</p>' +
        '</div>';
    }
    function begin() {
      resetAll();
      overlay.hidden = true;
      state = 'play';
      api.recordPlay();
      fx.sound('tap');
      toast('スタート！');
    }
    function finish() {
      state = 'done';
      var t = Math.round(time * 100) / 100;
      var res = api.submitScore(t);
      fx.sound('win');
      fx.confetti(wrap);
      setTimeout(function () {
        if (!alive) return;
        overlay.hidden = false;
        overlay.innerHTML =
          '<div class="cv-card result">' +
            '<span class="result-badge">' + (res.isBest ? '🎉 ベスト更新！' : '🏁 ゴール！') + '</span>' +
            '<p class="result-label">クリアタイム</p>' +
            '<p class="result-value">' + t.toFixed(2) + '<small>秒</small></p>' +
            '<p class="result-meta"><span>落下 <b>' + falls + '回</b></span><span>ベスト <b>' + fmtBest(res.best) + '</b></span></p>' +
            '<button type="button" class="btn btn-primary btn-lg" data-ath="start">もう一度</button>' +
          '</div>';
      }, 900);
    }

    /* ---------- 物理 ---------- */
    function updatePlatforms(dt) {
      plats.forEach(function (p) {
        p.prev.copy(p.mesh.position);
        if (p.move) {
          var off = Math.sin(elapsed * p.move.speed + p.t0) * p.move.amp;
          p.mesh.position.copy(p.base);
          p.mesh.position[p.move.axis] += off;
        }
        if (p.fall && p.fallT !== null && p.fallT !== undefined) {
          p.fallT += dt;
          if (p.fallT < 0.55) {
            p.mesh.position.x = p.base.x + Math.sin(p.fallT * 60) * 0.06;
          } else {
            p.dropping = true;
            p.mesh.position.y -= dt * (p.fallT - 0.5) * 22;
            if (p.fallT > 3.2) { p.fallT = null; p.dropping = false; p.mesh.position.copy(p.base); }
          }
        }
      });
      bar.rotation.y += dt * 1.9;
      goalFlag.userData.ring.rotation.y += dt * 2;
    }

    function solid(p) { return !(p.fall && p.dropping); }

    function stepPlayer(dt) {
      // 入力 (カメラ基準)
      var ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x;
      var iz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + stick.z;
      var len = Math.hypot(ix, iz);
      if (len > 1) { ix /= len; iz /= len; len = 1; }
      var sin = Math.sin(yaw), cos = Math.cos(yaw);
      var mx = ix * cos + iz * sin, mz = -ix * sin + iz * cos;
      if (len > 0.05 && !started && state === 'play') started = true;

      var accel = P.ground ? 14 : 5;
      P.vel.x += (mx * SPEED - P.vel.x) * Math.min(1, accel * dt);
      P.vel.z += (mz * SPEED - P.vel.z) * Math.min(1, accel * dt);
      if (len > 0.05) {
        var target = Math.atan2(-mx, -mz);
        var d = ((target - P.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        P.face += d * Math.min(1, dt * 12);
      }

      // 乗っている足場の移動に合わせる
      if (P.ground) {
        var g = P.ground;
        P.pos.x += g.mesh.position.x - g.prev.x;
        P.pos.z += g.mesh.position.z - g.prev.z;
        P.pos.y += g.mesh.position.y - g.prev.y;
      }

      // ジャンプ
      if (jumpBuf > 0) jumpBuf -= dt;
      if (P.ground) P.coyote = 0.12; else P.coyote -= dt;
      if (jumpBuf > 0 && P.coyote > 0) {
        P.vel.y = JUMP; P.ground = null; P.coyote = 0; jumpBuf = 0;
        P.squash = -0.25;
        fx.sound('tap');
        if (!started && state === 'play') started = true;
      }

      P.vel.y -= GRAV * dt;
      if (P.vel.y < -30) P.vel.y = -30;
      var prevY = P.pos.y;
      P.pos.x += P.vel.x * dt;
      P.pos.z += P.vel.z * dt;
      P.pos.y += P.vel.y * dt;

      // 足場との当たり判定
      var landed = null;
      plats.forEach(function (p) {
        if (!solid(p) || !p.mesh.visible) return;
        var c = p.mesh.position, hw = p.w / 2, hd = p.d / 2, top = c.y + p.h / 2, bottom = c.y - p.h / 2;
        var inX = Math.abs(P.pos.x - c.x) <= hw + R * 0.6, inZ = Math.abs(P.pos.z - c.z) <= hd + R * 0.6;
        if (inX && inZ && P.vel.y <= 0 && prevY >= top - 0.25 && P.pos.y <= top + 0.02) {
          P.pos.y = top; P.vel.y = 0; landed = p;
          return;
        }
        // 側面: 押し出し
        if (P.pos.y < top - 0.1 && P.pos.y + HEIGHT > bottom) {
          var ox = hw + R - Math.abs(P.pos.x - c.x), oz = hd + R - Math.abs(P.pos.z - c.z);
          if (ox > 0 && oz > 0) {
            if (ox < oz) { P.pos.x += Math.sign(P.pos.x - c.x || 1) * ox; P.vel.x = 0; }
            else { P.pos.z += Math.sign(P.pos.z - c.z || 1) * oz; P.vel.z = 0; }
          }
        }
        // 天井
        if (inX && inZ && P.vel.y > 0 && prevY + HEIGHT <= bottom + 0.05 && P.pos.y + HEIGHT > bottom) {
          P.pos.y = bottom - HEIGHT; P.vel.y = 0;
        }
      });
      if (landed && !P.ground) P.squash = 0.3;
      P.ground = landed;

      if (landed) {
        if (landed.bounce) {
          P.vel.y = landed.bounce; P.ground = null; P.squash = -0.35;
          fx.sound('good');
        }
        if (landed.fall && (landed.fallT === null || landed.fallT === undefined)) landed.fallT = 0;
        if (landed.cp && landed.cp > cp) {
          cp = landed.cp; checkpoint = landed;
          fx.sound('good'); toast('チェックポイント ' + cp + ' / 3 ✨');
          hud();
        }
        if (landed.goal && state === 'play') finish();
      }

      // ぐるぐるバー
      var bc = spinPad.mesh.position, by = bc.y + spinPad.h / 2 + 0.55;
      if (P.pos.y < by + 0.3 && P.pos.y + HEIGHT > by - 0.2) {
        var a = bar.rotation.y, dx = Math.cos(a), dz = -Math.sin(a);
        var rx = P.pos.x - bc.x, rz = P.pos.z - bc.z;
        var along = Math.max(-4.2, Math.min(4.2, rx * dx + rz * dz));
        var px = rx - along * dx, pz = rz - along * dz, dist = Math.hypot(px, pz);
        if (dist < R + 0.2) {
          // 回転方向に吹き飛ばす
          var sgn = along >= 0 ? 1 : -1;
          P.vel.x = dz * 10 * sgn; P.vel.z = -dx * 10 * sgn;
          P.vel.y = 6; P.ground = null;
          P.pos.x += (px / (dist || 1)) * 0.3; P.pos.z += (pz / (dist || 1)) * 0.3;
          fx.sound('bad');
        }
      }

      // 落下
      if (P.pos.y < -14) {
        falls++;
        fx.sound('bad');
        toast('おっと！');
        respawn(checkpoint);
        hud();
      }
    }

    /* ---------- カメラと描画 ---------- */
    var camPos = new THREE.Vector3(0, 5, 8), look = new THREE.Vector3();
    function stepCamera(dt, snap) {
      var t = P.pos;
      var want = new THREE.Vector3(
        t.x + Math.sin(yaw) * Math.cos(pitch) * camDist,
        t.y + 1.2 + Math.sin(pitch) * camDist,
        t.z + Math.cos(yaw) * Math.cos(pitch) * camDist
      );
      if (snap) camPos.copy(want); else camPos.lerp(want, Math.min(1, dt * 8));
      camera.position.copy(camPos);
      look.set(t.x, t.y + 1.1, t.z);
      camera.lookAt(look);
      sun.position.set(t.x + 8, t.y + 18, t.z + 6);
      sun.target.position.set(t.x, t.y, t.z);
    }
    function drawHero(dt) {
      hero.position.copy(P.pos);
      hero.rotation.y = P.face;
      P.squash += (0 - P.squash) * Math.min(1, dt * 10);
      var s = 1 + P.squash;
      hero.scale.set(1 / Math.sqrt(Math.max(0.5, s)), s, 1 / Math.sqrt(Math.max(0.5, s)));
      var moving = P.ground && Math.hypot(P.vel.x, P.vel.z) > 0.8;
      var ph = elapsed * 14;
      feet[0].position.z = moving ? Math.sin(ph) * 0.18 : 0;
      feet[1].position.z = moving ? -Math.sin(ph) * 0.18 : 0;
      body.position.y = 0.55 + (moving ? Math.abs(Math.sin(ph)) * 0.05 : 0);
      // 足元の影
      var gy = -100;
      plats.forEach(function (p) {
        if (!p.mesh.visible) return;
        var c = p.mesh.position, top = c.y + p.h / 2;
        if (Math.abs(P.pos.x - c.x) <= p.w / 2 && Math.abs(P.pos.z - c.z) <= p.d / 2 && top <= P.pos.y + 0.05 && top > gy) gy = top;
      });
      shadowDot.visible = gy > -100;
      shadowDot.position.set(P.pos.x, gy + 0.02, P.pos.z);
    }

    function resize() {
      var w = view.clientWidth, h = view.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(view); else window.addEventListener('resize', resize);
    resize();

    function loop() {
      if (!alive) return;
      var dt = Math.min(0.033, clock.getDelta());
      elapsed += dt;
      updatePlatforms(dt);
      if (state === 'play') {
        stepPlayer(dt);
        if (started) { time += dt; hud(); }
      } else if (state === 'done') {
        P.vel.set(0, 0, 0);
        P.face += dt * 3;
        if (P.ground) { var g = P.ground; P.pos.add(g.mesh.position.clone().sub(g.prev)); }
      }
      stepCamera(dt);
      drawHero(dt);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }

    resetAll();
    stepCamera(0, true);
    showIntro();
    loop();

    /* ---------- 入力 ---------- */
    var KEYMAP = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    function onKeyDown(e) {
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; if (state === 'play') e.preventDefault(); }
      if (e.key === ' ') {
        if (state === 'play') { e.preventDefault(); jumpBuf = 0.15; }
        else if (document.activeElement === document.body) { e.preventDefault(); begin(); }
      }
      if (e.key === 'q' || e.key === 'Q') yaw += 0.35;
      if (e.key === 'e' || e.key === 'E') yaw -= 0.35;
    }
    function onKeyUp(e) { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; }

    // 視点ドラッグ
    var drag = null;
    function onViewDown(e) {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      view.setPointerCapture && view.setPointerCapture(e.pointerId);
    }
    function onViewMove(e) {
      if (!drag || drag.id !== e.pointerId) return;
      yaw -= (e.clientX - drag.x) * 0.008;
      pitch = Math.max(0.12, Math.min(1.1, pitch + (e.clientY - drag.y) * 0.005));
      drag.x = e.clientX; drag.y = e.clientY;
    }
    function onViewUp(e) { if (drag && drag.id === e.pointerId) drag = null; }
    function onWheel(e) {
      e.preventDefault();
      camDist = Math.max(4.5, Math.min(13, camDist + e.deltaY * 0.01));
    }

    // スティック
    var padEl = root.querySelector('#ath-pad'), stickEl = root.querySelector('#ath-stick'), padId = null;
    function padMove(e) {
      var r = padEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2 - 10;
      var dx = e.clientX - cx, dy = e.clientY - cy, l = Math.hypot(dx, dy);
      if (l > max) { dx = dx / l * max; dy = dy / l * max; }
      stick.x = dx / max; stick.z = dy / max;
      stickEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }
    function onPadDown(e) { e.preventDefault(); e.stopPropagation(); padId = e.pointerId; padEl.setPointerCapture && padEl.setPointerCapture(e.pointerId); padMove(e); }
    function onPadMove(e) { if (padId === e.pointerId) padMove(e); }
    function onPadUp(e) { if (padId === e.pointerId) { padId = null; stick.x = 0; stick.z = 0; stickEl.style.transform = ''; } }
    var jumpEl = root.querySelector('#ath-jump');
    function onJump(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play') jumpBuf = 0.15; }
    function onOverlayClick(e) { if (e.target.closest('[data-ath="start"]')) begin(); }
    function onVis() { if (document.hidden) { keys = {}; stick.x = stick.z = 0; } }

    view.addEventListener('pointerdown', onViewDown);
    view.addEventListener('pointermove', onViewMove);
    view.addEventListener('pointerup', onViewUp);
    view.addEventListener('pointercancel', onViewUp);
    view.addEventListener('wheel', onWheel, { passive: false });
    padEl.addEventListener('pointerdown', onPadDown);
    padEl.addEventListener('pointermove', onPadMove);
    padEl.addEventListener('pointerup', onPadUp);
    padEl.addEventListener('pointercancel', onPadUp);
    jumpEl.addEventListener('pointerdown', onJump);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVis);

    cleanup.push(function () {
      cancelAnimationFrame(raf);
      clearTimeout(toastTimer);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    });

    // テスト・デバッグ用
    root._ath = { P: P, begin: begin, plats: plats, get state() { return state; }, respawnAt: function (i) { respawn(plats[i]); } };
  }

  return function unmount() {
    alive = false;
    cleanup.forEach(function (f) { f(); });
  };
});
