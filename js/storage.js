/* GAME PARK - 保存機能 (localStorage)
 * お気に入り / 最近遊んだゲーム / ベストスコア / プレイ回数 を保存します。
 * localStorage が使えない環境でもエラーにならず、メモリ上で動作します。 */
(function () {
  'use strict';
  var GP = (window.GP = window.GP || {});
  var KEY = 'gamepark:v1';
  var RECENT_MAX = 12;
  var data = null;

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function load() {
    if (data) return data;
    var raw = {};
    try { raw = JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch (e) { raw = {}; }
    data = {
      favorites: Array.isArray(raw.favorites) ? raw.favorites.filter(String) : [],
      recent: Array.isArray(raw.recent) ? raw.recent.filter(String) : [],
      best: isObj(raw.best) ? raw.best : {},
      plays: isObj(raw.plays) ? raw.plays : {}
    };
    return data;
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 保存不可でも続行 */ }
  }

  GP.store = {
    getFavorites: function () { return load().favorites.slice(); },
    isFavorite: function (id) { return load().favorites.indexOf(id) !== -1; },
    toggleFavorite: function (id) {
      var d = load(), i = d.favorites.indexOf(id);
      if (i === -1) d.favorites.unshift(id); else d.favorites.splice(i, 1);
      save();
      return i === -1;
    },
    getRecent: function () { return load().recent.slice(); },
    addRecent: function (id) {
      var d = load();
      d.recent = [id].concat(d.recent.filter(function (x) { return x !== id; })).slice(0, RECENT_MAX);
      save();
    },
    getPlays: function (id) { return Number(load().plays[id]) || 0; },
    addPlay: function (id) {
      var d = load();
      d.plays[id] = (Number(d.plays[id]) || 0) + 1;
      save();
      return d.plays[id];
    },
    getBest: function (id) {
      var v = load().best[id];
      return typeof v === 'number' && isFinite(v) ? v : null;
    },
    /* order: 'desc' = 大きいほど良い / 'asc' = 小さいほど良い */
    submitScore: function (id, value, order) {
      var d = load(), cur = this.getBest(id);
      var isBest = cur === null || (order === 'asc' ? value < cur : value > cur);
      if (isBest) { d.best[id] = value; save(); }
      return { isBest: isBest, best: isBest ? value : cur };
    },
    clearAll: function () {
      data = { favorites: [], recent: [], best: {}, plays: {} };
      try { window.localStorage.removeItem(KEY); } catch (e) { /* noop */ }
    }
  };
})();
