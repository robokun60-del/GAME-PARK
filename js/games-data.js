/* GAME PARK - ゲーム・カテゴリーの登録データ
 *
 * ■ ゲームを追加する手順
 *   1. 下の GP.games に1件追加する (id / title / description / image / category など)
 *   2. js/games/<id>.js を作り、GP.registerGame('<id>', function (root, api) { ... }) で本体を実装
 *   3. index.html に <script src="js/games/<id>.js"></script> を追加
 *   4. サムネイル画像を assets/images/ に置く (推奨 640x400)
 */
(function () {
  'use strict';
  var GP = (window.GP = window.GP || {});

  GP.categories = [
    { id: 'action',     name: 'アクション',     icon: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' },
    { id: 'adventure',  name: 'アドベンチャー', icon: '<circle cx="12" cy="12" r="9"/><path d="m15.500 8.500-2 5-5 2 2-5z"/>' },
    { id: 'puzzle',     name: 'パズル',         icon: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z"/><path d="M13 13h7v7h-7z" stroke-dasharray="2 2.500"/>' },
    { id: 'race',       name: 'レース',         icon: '<path d="M5 21V4M5 4h14l-2.500 4 2.500 4H5"/>' },
    { id: 'shooting',   name: 'シューティング', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.500"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>' },
    { id: 'sports',     name: 'スポーツ',       icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.500 3 3.500 15 0 18M12 3c-3.500 3-3.500 15 0 18"/>' },
    { id: 'simulation', name: 'シミュレーション', icon: '<path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>' },
    { id: 'casual',     name: 'カジュアル',     icon: '<circle cx="12" cy="12" r="9"/><path d="M8.500 14.500c1.200 1.800 5.800 1.800 7 0M9 9.500h.01M15 9.500h.01"/>' }
  ];

  /* best.order … 'desc': 大きいほど良い / 'asc': 小さいほど良い */
  GP.games = [
    {
      id: 'sky-athletic',
      title: 'スカイ・アスレチック',
      description: 'GAME PARK初の3Dゲーム！空に浮かぶアスレチックコースを走ってジャンプ。動く足場や落ちる床、ぐるぐるバーを越えてゴールを目指そう。',
      image: 'assets/images/sky-athletic.svg',
      category: 'adventure',
      featured: true,
      is3d: true,
      releasedAt: '2026-11-25',
      keywords: 'すかいあすれちっく 3D アスレチック ジャンプ アクション 障害物 パルクール',
      best: { order: 'asc', unit: '秒', label: '最速タイム' },
      howto: [
        'PC: WASD/矢印キーで移動、スペースでジャンプ、マウスドラッグ(またはQ/E)で視点を回転。',
        'スマホ: 左下のスティックで移動、右下のJUMPでジャンプ、画面をドラッグで視点を回転。',
        '落ちても🚩チェックポイントから再スタート。動く足場・落ちる床・ぐるぐるバーに注意！',
        '🏁ゴールまでのタイムを競おう。右上の「全画面」で大きく遊べます。'
      ]
    },
    {
      id: 'star-blaster',
      title: 'スター・ブラスター',
      description: '宇宙からやってくるカラフルなモンスターを撃ちまくれ！⭐で3way弾、💖でライフ回復。どこまでレベルを上げられる？',
      image: 'assets/images/star-blaster.svg',
      category: 'shooting',
      featured: true,
      releasedAt: '2026-11-25',
      keywords: 'すたーぶらすたー シューティング 宇宙 うちゅう 弾幕 STG',
      best: { order: 'desc', unit: '点', label: 'ハイスコア' },
      howto: [
        '画面をドラッグ(PCは矢印キー/WASD)で自機を移動。弾は自動で発射されます。',
        '敵を倒すと得点。1500点ごとにレベルアップして敵が強くなります。',
        '⭐を取ると8秒間3way弾、💖でライフが1回復。',
        '敵や敵の弾に当たるとライフが減り、0になるとゲームオーバー。Pキーで一時停止。'
      ]
    },
    {
      id: 'candy-merge',
      title: 'キャンディ・マージ',
      description: '同じお菓子をぶつけて合体！🍬が🍭、🍪…とどんどん進化。盤面がいっぱいになる前に👑の王冠スイーツを目指そう。',
      image: 'assets/images/candy-merge.svg',
      category: 'puzzle',
      featured: true,
      releasedAt: '2026-11-25',
      keywords: 'きゃんでぃまーじ 合体 がったい スワイプ お菓子 おかし 数字 パズル',
      best: { order: 'desc', unit: '点', label: 'ハイスコア' },
      howto: [
        'スワイプ(PCは矢印キー/WASD)で、全部のお菓子を同じ方向にスライド。',
        '同じお菓子どうしがぶつかると合体して1段階進化します。',
        '動かすたびに新しいお菓子が1つ出現。',
        '👑(レベル11)を作ればクリア！動かせなくなったら終了です。'
      ]
    },
    {
      id: 'pop-racer',
      title: 'ポップレーサー',
      description: '3車線の道路をかっ飛ばせ！前の車やコーンをよけて、コインを集めながらどこまで走れるかに挑戦。',
      image: 'assets/images/pop-racer.svg',
      category: 'race',
      featured: false,
      releasedAt: '2026-11-25',
      keywords: 'ぽっぷれーさー レース 車 くるま ドライブ よけ',
      best: { order: 'desc', unit: '点', label: 'ハイスコア' },
      howto: [
        '画面の左右をタップ、またはスワイプ(PCは←→キー)で車線を変更。',
        '前を走る車やコーンにぶつかるとクラッシュでゲーム終了。',
        '🪙コインは1枚50点。走った距離(m)もそのまま得点になります。',
        'だんだんスピードアップ！Pキーで一時停止。'
      ]
    },
    {
      id: 'reaction',
      title: '反射神経チャレンジ',
      description: 'ランダムなタイミングで現れるターゲットを素早くタップ。5ラウンドの反応速度でスコアを競おう。',
      image: 'assets/images/reaction.svg',
      category: 'action',
      featured: true,
      releasedAt: '2026-11-12',
      keywords: 'はんしゃしんけい 反応 タップ スピード',
      best: { order: 'desc', unit: '点', label: 'ベストスコア' },
      howto: [
        '「スタート」を押すとゲーム開始。',
        'ピンクのターゲットが現れたら、できるだけ早くタップ。',
        '反応が速いほど高得点(1ラウンド最大1000点)。',
        '空振りは−100点、2秒たつと時間切れ。全5ラウンド。'
      ]
    },
    {
      id: 'slide-puzzle',
      title: 'スライドパズル',
      description: '3×3のタイルをスライドさせて1〜8を順番に並べよう。少ない手数でのクリアを目指す定番パズル。',
      image: 'assets/images/slide-puzzle.svg',
      category: 'puzzle',
      featured: true,
      releasedAt: '2026-11-11',
      keywords: 'すらいどぱずる 8パズル 頭脳 タイル',
      best: { order: 'asc', unit: '手', label: '最少手数' },
      howto: [
        '空きマスの隣にあるタイルをタップすると動きます。',
        '左上から 1〜8 の順に並べ、右下を空きマスにすればクリア。',
        '「シャッフル」でいつでも新しい配置に。',
        'PCでは矢印キーでも操作できます。'
      ]
    },
    {
      id: 'number-guess',
      title: '数字当てゲーム',
      description: '1〜100の中から選ばれた秘密の数字を推理。「大きい・小さい」のヒントを頼りに少ない回数で当てよう。',
      image: 'assets/images/number-guess.svg',
      category: 'casual',
      featured: false,
      releasedAt: '2026-11-10',
      keywords: 'すうじあて かずあて 推理 ハイアンドロー',
      best: { order: 'asc', unit: '回', label: '最少回数' },
      howto: [
        '1〜100の数字を入力して「判定する」。',
        '正解より大きいか小さいかのヒントが出ます。',
        'ヒントで範囲をしぼり、少ない回数で正解を目指そう。'
      ]
    }
  ];

  /* ゲーム本体の登録。mount(root, api) は必要なら後片付け用の関数を返す。 */
  GP.impl = {};
  GP.registerGame = function (id, mount) { GP.impl[id] = mount; };
})();
