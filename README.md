# GAME PARK

登録不要・完全無料で遊べるオリジナルブラウザゲームセンター。
HTML / CSS / JavaScript のみで作られた静的サイトで、GitHub Pages などの無料ホスティングでそのまま公開できます。

## 収録ゲーム

| ゲーム | カテゴリー | 記録 |
|---|---|---|
| 反射神経チャレンジ | アクション | ベストスコア(高いほど良い) |
| 数字当てゲーム | カジュアル | 最少回数(少ないほど良い) |
| スライドパズル | パズル | 最少手数(少ないほど良い) |

## ファイル構成

```
gamepark/
├── index.html              … サイトの起点
├── .nojekyll               … GitHub Pages で Jekyll 処理を無効化
├── README.md
├── css/
│   └── style.css           … デザイン全体(レスポンシブ対応)
├── js/
│   ├── storage.js          … localStorage 保存(お気に入り・履歴・ベスト・プレイ回数)
│   ├── games-data.js       … ゲーム／カテゴリーの登録データ
│   ├── app.js              … 画面描画・ルーティング・検索
│   └── games/
│       ├── reaction.js     … 反射神経チャレンジ
│       ├── number-guess.js … 数字当てゲーム
│       └── slide-puzzle.js … スライドパズル
└── assets/images/          … オリジナルSVG素材(サムネイル・favicon)
```

## GitHub Pages での公開手順

1. GitHub にログインし、右上の「+」→「New repository」でリポジトリを作成(例: `gamepark`、Public を選択)。
2. 作成したリポジトリの「Add file」→「Upload files」を開き、ZIP を展開した **gamepark フォルダの中身**(index.html、css、js、assets など)をすべてドラッグ&ドロップして「Commit changes」。
   - `.nojekyll` は隠しファイルのため表示されないことがあります。無くても動作しますが、あると確実です。
3. リポジトリの「Settings」→ 左メニュー「Pages」を開く。
4. 「Build and deployment」の Source を「Deploy from a branch」、Branch を `main` / `/(root)` にして「Save」。
5. 1〜2分後、同じ画面に `https://<ユーザー名>.github.io/gamepark/` が表示されたら公開完了です。

更新するときは、変更したファイルを同じ手順でアップロードするだけで自動的に反映されます。

### コマンドで公開する場合

```bash
cd gamepark
git init
git add .
git commit -m "GAME PARK 初版"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/gamepark.git
git push -u origin main
```
その後、上の手順 3〜5 で Pages を有効にします。

## ローカルで確認する

`index.html` をブラウザで直接開いても動作します。サーバーで確認する場合:

```bash
cd gamepark
python3 -m http.server 8000
# → http://localhost:8000 を開く
```

## ゲームの追加方法

1. `js/games-data.js` の `GP.games` に1件追加します。

```js
{
  id: 'my-game',
  title: 'マイゲーム',
  description: 'ゲームの説明文',
  image: 'assets/images/my-game.svg',   // 推奨 640×400
  category: 'action',                   // action / adventure / puzzle / race / shooting / sports / simulation / casual
  featured: false,                      // true でおすすめに表示
  releasedAt: '2026-12-01',             // 新着順の並びに使用
  keywords: 'まいげーむ',                // 検索用(ひらがな等)
  best: { order: 'desc', unit: '点', label: 'ベストスコア' }, // asc = 少ないほど良い
  howto: ['遊び方1', '遊び方2']
}
```

2. `js/games/my-game.js` を作成します。

```js
window.GP.registerGame('my-game', function (root, api) {
  root.innerHTML = '<button>スタート</button>';
  // api.recordPlay()        … プレイ開始時に呼ぶ(プレイ回数+1)
  // api.submitScore(value)  … 結果を送る → { isBest, best }
  // api.getBest()           … 現在のベスト
  return function unmount() { /* タイマー解除などの後片付け */ };
});
```

3. `index.html` の `app.js` の前に `<script src="js/games/my-game.js"></script>` を追加します。

これだけで、ホーム・カテゴリー・検索・ランキング・お気に入り・最近遊んだゲームに自動で反映されます。

## 保存データについて

お気に入り・最近遊んだゲーム・ベストスコア・プレイ回数はブラウザの localStorage(キー `gamepark:v1`)に保存され、再読み込みしても残ります。サーバーには送信されません。フッターの「保存データを消去」で削除できます。
ランキングは「この端末でのプレイ回数」に基づきます(静的サイトのため、全ユーザー共通の集計はありません)。

## 動作環境

Chrome / Safari / Edge の最新版(Android、iPhone、iPad、PC)。
