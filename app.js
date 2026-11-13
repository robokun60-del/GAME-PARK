/* GAME PARK - 画面の描画とルーティング
 * URL: #home / #ranking / #new / #categories / #favorites / #game-<id> / #category-<id> */
(function () {
  'use strict';
  var GP = window.GP, store = GP.store;
  var view = document.getElementById('view');
  var searchInput = document.getElementById('search-input');
  var HOME_SECTIONS = ['ranking', 'new', 'categories', 'favorites'];
  var route = { name: 'home' };
  var unmountGame = null;
  var query = '';

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function gameById(id) { return GP.games.filter(function (g) { return g.id === id; })[0] || null; }
  function catById(id) { return GP.categories.filter(function (c) { return c.id === id; })[0] || null; }
  function catName(game) { var c = catById(game.category); return c ? c.name : ''; }
  function icon(inner) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>'; }
  function fmtBest(game) {
    var v = store.getBest(game.id);
    return v === null ? '—' : v.toLocaleString('ja-JP') + game.best.unit;
  }
  function fmtDate(iso) { return iso.replace(/-/g, '.'); }
  function isNew(game) {
    var days = (Date.now() - new Date(game.releasedAt + 'T00:00:00').getTime()) / 86400000;
    return days >= 0 && days <= 30;
  }
  function norm(s) {
    return String(s).normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); })
      .replace(/\s+/g, '');
  }
  function searchGames(q) {
    var n = norm(q);
    return GP.games.filter(function (g) {
      return norm([g.title, g.description, catName(g), g.keywords || ''].join(' ')).indexOf(n) !== -1;
    });
  }

  /* ---------- templates ---------- */
  var HEART = '<path d="M12 20s-7.500-4.400-7.500-10A4.300 4.300 0 0 1 12 7.400 4.300 4.300 0 0 1 19.500 10c0 5.600-7.500 10-7.500 10z"/>';

  function favBtn(game, large) {
    var on = store.isFavorite(game.id);
    return '<button type="button" class="fav' + (large ? ' fav-lg' : '') + '" data-fav="' + esc(game.id) + '" aria-pressed="' + on + '"' +
      ' aria-label="' + esc(game.title) + 'をお気に入りに' + (on ? '登録済み(押すと解除)' : '追加') + '">' +
      icon(HEART) + (large ? '<span>お気に入り</span>' : '') + '</button>';
  }
  function card(game, meta) {
    return '<article class="card">' +
      '<a class="card-link" href="#game-' + esc(game.id) + '">' +
        '<div class="card-media"><img src="' + esc(game.image) + '" alt="" width="640" height="400" loading="lazy" decoding="async">' +
          (isNew(game) ? '<span class="badge">NEW</span>' : '') + '</div>' +
        '<div class="card-body">' +
          '<span class="chip">' + esc(catName(game)) + '</span>' +
          '<h3>' + esc(game.title) + '</h3>' +
          '<p>' + esc(game.description) + '</p>' +
          (meta ? '<span class="card-meta">' + meta + '</span>' : '') +
        '</div>' +
      '</a>' + favBtn(game) + '</article>';
  }
  function featureCard(game) {
    return '<article class="feature">' +
      '<a class="feature-link" href="#game-' + esc(game.id) + '">' +
        '<div class="feature-media"><img src="' + esc(game.image) + '" alt="" width="640" height="400" decoding="async"></div>' +
        '<div class="feature-body">' +
          '<span class="chip">' + esc(catName(game)) + '</span>' +
          '<h3>' + esc(game.title) + '</h3>' +
          '<p>' + esc(game.description) + '</p>' +
          '<span class="btn btn-primary">今すぐ遊ぶ</span>' +
        '</div>' +
      '</a>' + favBtn(game) + '</article>';
  }
  function miniCard(game) {
    return '<a class="mini" href="#game-' + esc(game.id) + '">' +
      '<img src="' + esc(game.image) + '" alt="" width="640" height="400" loading="lazy" decoding="async">' +
      '<span class="mini-body"><b>' + esc(game.title) + '</b>' +
      '<small>' + esc(game.best.label) + ' ' + fmtBest(game) + '</small></span></a>';
  }
  function empty(text, extra) {
    return '<div class="empty"><p>' + text + '</p>' + (extra || '') + '</div>';
  }
  function sectionHead(title, sub) {
    return '<div class="section-head"><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>';
  }

  /* ---------- home ---------- */
  function homeHtml() {
    if (query) {
      var hits = searchGames(query);
      return '<section class="section section-first">' +
        sectionHead('「' + esc(query) + '」の検索結果', hits.length + '件') +
        (hits.length
          ? '<div class="grid">' + hits.map(function (g) { return card(g); }).join('') + '</div>'
          : empty('一致するゲームが見つかりませんでした。別のキーワードでお試しください。',
              '<button type="button" class="btn btn-ghost" data-clear-search>検索をクリア</button>')) +
        '</section>';
    }

    var featured = GP.games.filter(function (g) { return g.featured; });
    var ranked = GP.games.map(function (g, i) { return { g: g, p: store.getPlays(g.id), i: i }; })
      .sort(function (a, b) { return b.p - a.p || a.i - b.i; }).slice(0, 5);
    var anyPlays = ranked.some(function (r) { return r.p > 0; });
    var newest = GP.games.slice().sort(function (a, b) { return a.releasedAt < b.releasedAt ? 1 : -1; });
    var recent = store.getRecent().map(gameById).filter(Boolean);
    var favs = store.getFavorites().map(gameById).filter(Boolean);

    return '' +
      '<section class="hero">' +
        '<div class="hero-text">' +
          '<p class="hero-kicker">FREE BROWSER GAMES</p>' +
          '<h1>無料で、<br>すぐ遊べる。</h1>' +
          '<p class="hero-lead">GAME PARKは、登録もインストールもいらないオリジナルゲームセンター。スマホでもPCでも、開いたその場でプレイできます。</p>' +
          '<div class="hero-actions"><a class="btn btn-primary btn-lg" href="#new">ゲームを探す</a>' +
          '<a class="btn btn-ghost btn-lg" href="#categories">カテゴリーを見る</a></div>' +
          '<ul class="hero-facts"><li><b>' + GP.games.length + '</b>ゲーム公開中</li><li><b>0</b>円・登録不要</li><li><b>' + GP.categories.length + '</b>カテゴリー</li></ul>' +
        '</div>' +
        '<div class="hero-art" aria-hidden="true"><span class="orb o1"></span><span class="orb o2"></span><span class="tile t1">1</span><span class="tile t2">?</span><span class="tile t3"></span></div>' +
      '</section>' +

      '<section class="section" id="sec-featured">' + sectionHead('おすすめゲーム', 'まず遊んでほしいピックアップ') +
        '<div class="feature-grid">' + featured.map(featureCard).join('') + '</div></section>' +

      '<div class="split">' +
        '<section class="section" id="sec-new">' + sectionHead('新着ゲーム', '公開日の新しい順') +
          '<div class="grid">' + newest.map(function (g) { return card(g, fmtDate(g.releasedAt) + ' 公開'); }).join('') + '</div></section>' +
        '<section class="section" id="sec-ranking">' + sectionHead('人気ゲームランキング', 'この端末でのプレイ回数順') +
          '<ol class="rank">' + ranked.map(function (r, i) {
            return '<li><a href="#game-' + esc(r.g.id) + '"><span class="rank-no">' + (i + 1) + '</span>' +
              '<img src="' + esc(r.g.image) + '" alt="" width="640" height="400" loading="lazy" decoding="async">' +
              '<span class="rank-body"><b>' + esc(r.g.title) + '</b><small>' + esc(catName(r.g)) + '</small></span>' +
              '<span class="rank-plays">' + r.p.toLocaleString('ja-JP') + '<small>回</small></span></a></li>';
          }).join('') + '</ol>' +
          (anyPlays ? '' : '<p class="note">まだプレイ記録がありません。遊ぶとランキングに反映されます。</p>') +
        '</section>' +
      '</div>' +

      '<section class="section" id="sec-categories">' + sectionHead('カテゴリー一覧', 'ジャンルから探す') +
        '<div class="cat-grid">' + GP.categories.map(function (c) {
          var n = GP.games.filter(function (g) { return g.category === c.id; }).length;
          return '<a class="cat' + (n ? '' : ' is-empty') + '" href="#category-' + esc(c.id) + '">' +
            '<span class="cat-icon">' + icon(c.icon) + '</span>' +
            '<span class="cat-body"><b>' + esc(c.name) + '</b><small>' + (n ? n + 'ゲーム' : '準備中') + '</small></span></a>';
        }).join('') + '</div></section>' +

      '<section class="section" id="sec-recent">' + sectionHead('最近遊んだゲーム') +
        (recent.length ? '<div class="mini-row">' + recent.map(miniCard).join('') + '</div>'
          : empty('まだ遊んだゲームはありません。気になるゲームを開くとここに表示されます。')) + '</section>' +

      '<section class="section" id="sec-favorites">' + sectionHead('お気に入りゲーム') +
        (favs.length ? '<div class="grid">' + favs.map(function (g) { return card(g); }).join('') + '</div>'
          : empty('お気に入りはまだありません。ゲームカードの ♡ を押すと登録できます。')) + '</section>';
  }

  /* ---------- category ---------- */
  function categoryHtml(cat) {
    var list = GP.games.filter(function (g) { return g.category === cat.id; });
    return '<a class="back" href="#categories">← カテゴリー一覧に戻る</a>' +
      '<section class="section section-first">' +
        '<div class="cat-head"><span class="cat-icon">' + icon(cat.icon) + '</span><div><h1>' + esc(cat.name) + '</h1>' +
        '<p>' + (list.length ? list.length + 'ゲーム' : '準備中') + '</p></div></div>' +
        (list.length ? '<div class="grid">' + list.map(function (g) { return card(g); }).join('') + '</div>'
          : empty('このカテゴリーのゲームは現在準備中です。', '<a class="btn btn-ghost" href="#home">ホームに戻る</a>')) +
      '</section>';
  }

  /* ---------- game ---------- */
  function gameHtml(game) {
    var others = GP.games.filter(function (g) { return g.id !== game.id; });
    return '<a class="back" href="#home">← ホームに戻る</a>' +
      '<header class="game-head"><div>' +
        '<a class="chip" href="#category-' + esc(game.category) + '">' + esc(catName(game)) + '</a>' +
        '<h1>' + esc(game.title) + '</h1><p>' + esc(game.description) + '</p></div>' + favBtn(game, true) + '</header>' +
      '<div class="game-layout">' +
        '<section class="stage" id="stage" aria-label="' + esc(game.title) + ' ゲーム画面"></section>' +
        '<aside class="game-side">' +
          '<dl class="stats"><div><dt>' + esc(game.best.label) + '</dt><dd id="stat-best">' + fmtBest(game) + '</dd></div>' +
          '<div><dt>プレイ回数</dt><dd id="stat-plays">' + store.getPlays(game.id) + '回</dd></div></dl>' +
          '<div class="howto"><h2>遊び方</h2><ol>' + game.howto.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol></div>' +
        '</aside>' +
      '</div>' +
      (others.length ? '<section class="section">' + sectionHead('ほかのゲーム') +
        '<div class="grid">' + others.map(function (g) { return card(g); }).join('') + '</div></section>' : '');
  }
  function mountGame(game) {
    var stage = document.getElementById('stage');
    var mount = GP.impl[game.id];
    if (typeof mount !== 'function') {
      stage.innerHTML = empty('このゲームは現在準備中です。');
      return;
    }
    store.addRecent(game.id);
    var api = {
      recordPlay: function () {
        var n = store.addPlay(game.id), el = document.getElementById('stat-plays');
        if (el) el.textContent = n + '回';
      },
      submitScore: function (value) {
        var res = store.submitScore(game.id, value, game.best.order), el = document.getElementById('stat-best');
        if (el) el.textContent = fmtBest(game);
        return res;
      },
      getBest: function () { return store.getBest(game.id); }
    };
    try {
      unmountGame = mount(stage, api) || null;
    } catch (err) {
      stage.innerHTML = empty('ゲームの読み込みに失敗しました。ページを再読み込みしてください。');
      if (window.console) console.error(err);
    }
  }

  /* ---------- router ---------- */
  function parse() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!h || h === 'home') return { name: 'home' };
    if (HOME_SECTIONS.indexOf(h) !== -1) return { name: 'home', section: h };
    if (h.indexOf('game-') === 0) return { name: 'game', id: h.slice(5) };
    if (h.indexOf('category-') === 0) return { name: 'category', id: h.slice(9) };
    return { name: 'notfound' };
  }
  function setNav() {
    var active = route.name === 'home' ? (route.section || 'home') : route.name === 'category' ? 'categories' : '';
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      if (a.dataset.nav === active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function render(animate) {
    if (unmountGame) { try { unmountGame(); } catch (e) { /* noop */ } unmountGame = null; }
    var title = 'GAME PARK | 無料で遊べるブラウザゲームセンター';
    var game = null;

    if (route.name === 'game' && (game = gameById(route.id))) {
      view.innerHTML = gameHtml(game);
      title = game.title + ' | GAME PARK';
    } else if (route.name === 'category' && catById(route.id)) {
      var cat = catById(route.id);
      view.innerHTML = categoryHtml(cat);
      title = cat.name + 'のゲーム | GAME PARK';
    } else if (route.name === 'home') {
      view.innerHTML = homeHtml();
    } else {
      view.innerHTML = '<section class="section section-first">' +
        empty('お探しのページは見つかりませんでした。', '<a class="btn btn-primary" href="#home">ホームに戻る</a>') + '</section>';
    }
    document.title = title;
    setNav();
    if (animate) {
      view.classList.remove('enter');
      void view.offsetWidth;
      view.classList.add('enter');
    }
    if (game) mountGame(game);
  }
  function scrollToSection(name, smooth) {
    var el = document.getElementById('sec-' + name);
    if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }
  function onRoute() {
    var prev = route;
    route = parse();
    if (route.name !== 'home' && query) { query = ''; searchInput.value = ''; }
    if (route.name === 'home' && route.section && query) { query = ''; searchInput.value = ''; }
    var sameHome = prev.name === 'home' && route.name === 'home' && view.children.length > 0;
    render(!sameHome);
    if (route.name === 'home' && route.section) scrollToSection(route.section, sameHome);
    else window.scrollTo(0, 0);
  }

  /* ---------- events ---------- */
  window.addEventListener('hashchange', onRoute);

  document.addEventListener('click', function (e) {
    var fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      store.toggleFavorite(fav.dataset.fav);
      if (route.name === 'game') {
        /* プレイ中のゲームを壊さないよう、ボタンの表示だけ更新する */
        Array.prototype.forEach.call(document.querySelectorAll('[data-fav]'), function (b) {
          b.setAttribute('aria-pressed', String(store.isFavorite(b.dataset.fav)));
        });
      } else {
        var y = window.scrollY;
        render(false);
        window.scrollTo(0, y);
      }
      return;
    }
    if (e.target.closest('[data-clear-search]')) {
      query = ''; searchInput.value = '';
      render(false);
      searchInput.focus();
      return;
    }
    /* 同じリンクをもう一度押した場合 (hashchange が起きない) も反応させる */
    var link = e.target.closest('a[href^="#"]');
    if (link && link.getAttribute('href') === (location.hash || '#home') && !link.classList.contains('skip-link')) {
      e.preventDefault();
      if (query) { query = ''; searchInput.value = ''; render(false); }
      if (route.name === 'home' && route.section) scrollToSection(route.section, true);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  searchInput.addEventListener('input', function () {
    query = searchInput.value.trim();
    if (route.name !== 'home' || route.section) {
      if (location.hash === '#home') { route = { name: 'home' }; render(true); window.scrollTo(0, 0); }
      else location.hash = '#home';
    } else {
      render(false);
      window.scrollTo(0, 0);
    }
  });
  document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    searchInput.blur();
  });

  /* 保存データの消去 (2回押しで実行) */
  var resetBtn = document.getElementById('reset-data');
  var resetStatus = document.getElementById('reset-status');
  var resetArmed = false, resetTimer = null;
  resetBtn.addEventListener('click', function () {
    clearTimeout(resetTimer);
    if (!resetArmed) {
      resetArmed = true;
      resetBtn.textContent = 'もう一度押すと消去します';
      resetBtn.classList.add('is-danger');
      resetStatus.textContent = '';
      resetTimer = setTimeout(disarm, 4000);
      return;
    }
    store.clearAll();
    disarm();
    resetStatus.textContent = '保存データを消去しました。';
    render(false);
  });
  function disarm() {
    resetArmed = false;
    resetBtn.textContent = '保存データを消去';
    resetBtn.classList.remove('is-danger');
  }

  document.getElementById('year').textContent = new Date().getFullYear();
  onRoute();
})();
