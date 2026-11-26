/* GAME PARK - ストームドロップ (3Dバトルロイヤル)
 * 本体は games/storm-drop/index.html。ここでは iframe で読み込み、
 * 全画面・横向き固定と、プレイ回数・最高順位の記録を受け持ちます。 */
window.GP.registerGame('storm-drop', function (root, api) {
  'use strict';
  var GP = window.GP;
  var SRC = 'games/storm-drop/';
  var frame = null;
  var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function fmtBest(v) { return v === null ? 'まだなし' : v + '位'; }

  function poster() {
    root.innerHTML =
      '<div class="sd-poster">' +
        '<img src="assets/images/storm-drop.svg" alt="" width="640" height="400">' +
        '<div class="sd-poster-body">' +
          '<p class="sd-tag">3D バトルロイヤル</p>' +
          '<button type="button" class="btn btn-primary btn-lg" data-sd="play">▶ 横画面でプレイ</button>' +
          '<p class="sd-note">' + (touch ? '📱 スマホを横向きにして遊んでね' : '🖱️ マウスとキーボードで遊べます') + '</p>' +
          '<p class="sd-best">最高順位 <b>' + fmtBest(api.getBest()) + '</b></p>' +
        '</div>' +
      '</div>';
  }

  function play() {
    root.innerHTML = '<div class="sd-frame"><iframe src="' + SRC + '" title="ストームドロップ" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe></div>';
    frame = root.querySelector('iframe');
    /* スマホ・タブレットは全画面 + 横向き固定。PCはページ内で遊び、全画面ボタンでも大きくできる */
    if (touch || window.innerWidth < 900) GP.fullscreen.enter({ landscape: true });
    frame.addEventListener('load', function () { try { frame.contentWindow.focus(); } catch (e) { /* noop */ } });
  }

  function onClick(e) { if (e.target.closest('[data-sd="play"]')) play(); }
  function onMessage(e) {
    if (!frame || e.source !== frame.contentWindow || e.origin !== location.origin) return;
    var d = e.data || {};
    if (d.gp !== 'storm-drop') return;
    if (d.type === 'start') api.recordPlay();
    if (d.type === 'end' && typeof d.place === 'number' && d.place >= 1) api.submitScore(Math.round(d.place));
  }

  root.addEventListener('click', onClick);
  window.addEventListener('message', onMessage);
  poster();

  return function unmount() {
    window.removeEventListener('message', onMessage);
    if (frame) frame.src = 'about:blank';
  };
});
