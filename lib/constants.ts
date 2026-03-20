import { DiagnosisType, Question, SubLabel, TargetTag } from './types';

export const SITE_URL = 'https://soccer-kateikyousi.com';

export const DIAGNOSIS_TYPES: DiagnosisType[] = [
  {
    id: 1,
    name: '試合で消えやすい慎重派',
    slug: 'careful-invisible',
    oneWord: '力はあるのに、試合になると"いないように見える"タイプ',
    aruaru: [
      '練習ではできるのに試合だと別人みたい',
      'ボールが来ない位置にいることが多い',
      '「もっと声出して」と言われがち',
    ],
    causeRedefinition: '技術不足ではなく、試合の中で"自分を出すタイミング"がまだつかめていないだけ。慎重さは武器になる素質です。',
    growthPoints: [
      'ボールをもらう前の"準備動作"を1つ加えるだけで変わる',
      '試合中に"消えていい時間"と"出る時間"を分ける練習が効く',
      'まず味方の近くでプレーする習慣から始めると自信がつく',
    ],
    priorityTheme: 'オフザボールの動き出し',
    departments: ['ポジション科', 'トラップ科', 'オフザボール科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#invisible-type`],
  },
  {
    id: 2,
    name: '技術あるのに出せない温存型',
    slug: 'skill-reserved',
    oneWord: '持っている技術を試合で"温存"してしまうタイプ',
    aruaru: [
      '自主練では上手いのに試合では無難なプレーが多い',
      'チャレンジせず安全パスを選びがち',
      '「もっとやれるのに」と親がもどかしくなる',
    ],
    causeRedefinition: '技術がないのではなく、試合で使う"許可"を自分に出せていないだけ。出し方を覚えれば一気に化けるタイプです。',
    growthPoints: [
      '試合で1回だけチャレンジするルールを作る',
      '失敗しても評価される環境体験が大きい',
      '成功体験を"動画で見返す"と自信の回路ができる',
    ],
    priorityTheme: 'チャレンジの出し方',
    departments: ['ドリブル科', '1対1科', 'メンタル科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#reserved-type`],
  },
  {
    id: 3,
    name: '先に急ぎすぎる突進型',
    slug: 'rushing-forward',
    oneWord: 'やる気はあるけど、判断より先に体が動いてしまうタイプ',
    aruaru: [
      'ドリブルで突っ込んで取られることが多い',
      'パスの選択肢が見えていない場面がある',
      '気持ちが強いのにプレーが空回りしやすい',
    ],
    causeRedefinition: '気持ちの強さは最高の武器。あとは"一瞬止まる技術"を加えるだけで、突破力が判断力に変わります。',
    growthPoints: [
      'ドリブルの途中に"顔を上げる一瞬"を入れる練習',
      '2択を持ってからスタートする習慣づけ',
      '突破とパスを"セット"で考えるトレーニング',
    ],
    priorityTheme: '判断スピードの調整',
    departments: ['ドリブル科', '判断力科', 'パス科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#rushing-type`],
  },
  {
    id: 4,
    name: '周りに合わせすぎる遠慮型',
    slug: 'too-considerate',
    oneWord: '空気を読みすぎて、自分のプレーを抑えてしまうタイプ',
    aruaru: [
      '上手い子がいるとボールを譲ってしまう',
      '自分で行ける場面でもパスを選びがち',
      '「もっと自分で行っていいよ」と言われる',
    ],
    causeRedefinition: '協調性が高いのは素晴らしい才能。あとは"自分で行く場面"を決めるだけで、チームの中で輝けます。',
    growthPoints: [
      '試合の中で"ここだけは自分で"という場面を1つ決める',
      '周りと合わせる力を活かした"コンビプレー"を武器にする',
      '自分のプレーで味方が助かる体験を積む',
    ],
    priorityTheme: '自分で行く判断基準',
    departments: ['1対1科', 'メンタル科', 'ポジション科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#considerate-type`],
  },
  {
    id: 5,
    name: 'ボール受ける前で負ける後手型',
    slug: 'late-receiver',
    oneWord: 'ボールが来てから考え始めるので、常に一歩遅れるタイプ',
    aruaru: [
      'トラップした瞬間に詰められてしまう',
      '「もっと早く判断して」と言われる',
      '受けてから周りを見るクセがある',
    ],
    causeRedefinition: '判断力がないのではなく、"見るタイミング"が少しズレているだけ。受ける前に1回見るだけで世界が変わります。',
    growthPoints: [
      'ボールが来る前に首を振る習慣を1つ加える',
      'トラップの方向を"受ける前に決める"練習',
      '体の向きを変えるだけで余裕が生まれる',
    ],
    priorityTheme: '事前準備の動き',
    departments: ['トラップ科', 'キープ力科', 'すぐ取られる改善科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#late-receiver-type`],
  },
  {
    id: 6,
    name: '見えてるのに出せない準備不足型',
    slug: 'unprepared-vision',
    oneWord: '視野は広いのに、体の準備が追いつかないタイプ',
    aruaru: [
      'パスコースは見えているのに出せない',
      '「わかってるのに」と本人も悔しそう',
      '頭と体のスピードにギャップがある',
    ],
    causeRedefinition: '視野の広さは才能。あとは体の準備を先にするだけで、見えているものが全部プレーに変わります。',
    growthPoints: [
      '体の向きを"次のプレー方向"に先に作る練習',
      'ボールを受ける前のステップを意識する',
      '視野と体の準備を同時に行うトレーニング',
    ],
    priorityTheme: 'ボディシェイプの改善',
    departments: ['パス科', 'トラップ科', 'ポジション科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#unprepared-type`],
  },
  {
    id: 7,
    name: '1対1で力を隠す安全運転型',
    slug: 'safe-driver',
    oneWord: '1対1の場面で無難な選択をしてしまうタイプ',
    aruaru: [
      '1対1になるとすぐバックパスしてしまう',
      '抜けそうな場面でも勝負を避ける',
      '「もっと仕掛けて」とコーチに言われる',
    ],
    causeRedefinition: 'リスク管理ができるのは大人なプレーヤーの証。あとは"勝負する基準"を持つだけで、安全運転が武器になります。',
    growthPoints: [
      '1対1で"この条件なら仕掛ける"を決める',
      '成功率より"チャレンジ回数"を評価基準にする',
      '得意な抜き方を1つだけ磨く',
    ],
    priorityTheme: '1対1の判断基準',
    departments: ['ドリブル科', '1対1科', 'フェイント科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#safe-driver-type`],
  },
  {
    id: 8,
    name: '練習と試合で別人になる分離型',
    slug: 'split-personality',
    oneWord: '練習では上手いのに、試合になると全く違う子に見えるタイプ',
    aruaru: [
      '練習では褒められるのに試合で結果が出ない',
      '「練習通りやればいいのに」と思うことが多い',
      '試合になると緊張で固まることがある',
    ],
    causeRedefinition: '練習で身につけた力は確かにある。試合という"環境の違い"に慣れるステップが必要なだけです。',
    growthPoints: [
      '練習に"試合のプレッシャー"を加える工夫',
      '試合前のルーティンを作って安心感を持つ',
      '試合を"練習の確認の場"と再定義する',
    ],
    priorityTheme: '試合適応力の向上',
    departments: ['発達特性科', 'メンタル科', 'オンライン科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#split-type`],
  },
  {
    id: 9,
    name: '最初の一歩が遅れる受け身型',
    slug: 'passive-starter',
    oneWord: '反応はできるけど、自分から動き出す一歩が遅いタイプ',
    aruaru: [
      'ボールが来てから動き始める',
      '攻守の切り替えが一歩遅い',
      '指示があれば動けるが自分からは動きにくい',
    ],
    causeRedefinition: '指示に従える素直さは最高の素質。あとは"自分で判断して動く"きっかけを1つ持つだけです。',
    growthPoints: [
      '「ボールが動いた瞬間に動く」だけを意識する',
      '攻守切り替えの"最初の2歩"を速くする練習',
      '声を出すことで自分のスイッチを入れる',
    ],
    priorityTheme: 'ファーストアクション',
    departments: ['ポジション科', 'トラップ科', 'オフザボール科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#passive-type`],
  },
  {
    id: 10,
    name: 'ミスを恐れて選択が減る慎重型',
    slug: 'fear-of-mistakes',
    oneWord: 'ミスを避けたい気持ちが強くて、プレーの選択肢が狭まるタイプ',
    aruaru: [
      'ミスした後にプレーが消極的になる',
      '難しいプレーを避けて簡単な選択ばかりする',
      '「失敗してもいいから」と言われてもチャレンジしにくい',
    ],
    causeRedefinition: 'ミスを気にできるのは高い意識の表れ。"失敗の定義"を変えるだけで、持っている力が全部出せます。',
    growthPoints: [
      '"ミス"ではなく"チャレンジの結果"と再定義する環境',
      '成功・失敗ではなく"判断の質"で振り返る',
      'ミスの後の切り替えを褒める仕組み',
    ],
    priorityTheme: 'メンタルの再設計',
    departments: ['メンタル科', '1対1科', 'キープ力科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#fear-type`],
  },
  {
    id: 11,
    name: 'ボール触れば良いのに触れない待機型',
    slug: 'waiting-for-ball',
    oneWord: 'ボールに関わるチャンスがあるのに、待ってしまうタイプ',
    aruaru: [
      'ボールの近くにいるのに関わらない',
      'パスをもらえる位置なのに呼ばない',
      '「もっとボール触りに行って」と言われる',
    ],
    causeRedefinition: '控えめな性格は悪いことではない。ボールに"関わっていい"という許可を自分に出すだけで変わります。',
    growthPoints: [
      '"1プレーだけ必ずボールに触る"目標を作る',
      'ボールに近づく動きを1つだけ決めて繰り返す',
      '声を出すことでボールが自然と来る仕組みを作る',
    ],
    priorityTheme: 'ボール関与の増加',
    departments: ['オフザボール科', 'ポジション科', 'トラップ科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#waiting-type`],
  },
  {
    id: 12,
    name: '頭ではわかってるのに体が合わない思考先行型',
    slug: 'thinking-ahead',
    oneWord: '理解力は高いのに、体がついてこないと感じるタイプ',
    aruaru: [
      'サッカーの話をすると詳しいのにプレーに出ない',
      '頭では次のプレーがわかっているのに体が動かない',
      '動画で学ぶのは好きだが実践で活かせない',
    ],
    causeRedefinition: '理解力の高さは将来大きく伸びる土台。頭と体を"つなぐ練習"を入れるだけで、理解が全部プレーに出ます。',
    growthPoints: [
      'イメージトレーニングと実践を交互に行う',
      '考えなくても体が動く"自動化"の練習を増やす',
      '理解力を活かした"声の出し方"でチームに貢献',
    ],
    priorityTheme: '身体連動トレーニング',
    departments: ['発達特性科', 'オンライン科', 'コーディネーション科'],
    caseLinks: [`https://soccer-kateikyousi.com/%e7%97%87%e4%be%8b%e3%82%ab%e3%83%ab%e3%83%86%e9%9b%86/#thinking-type`],
  },
];

export const SUB_LABELS: Record<TargetTag, SubLabel> = {
  beginner: {
    tag: 'beginner',
    label: 'はじめたて土台づくり期',
    message: 'サッカーを始めたばかりの今だからこそ、正しい土台を作るチャンス。最初に"出し方"を知っておくと、この先の伸びが全く違います。',
  },
  low_grade: {
    tag: 'low_grade',
    label: '低学年の伸びしろ育成期',
    message: '低学年のうちに"自分の才能の出し方"を知っておくと、高学年で一気に開花します。今は土台づくりの最高のタイミングです。',
  },
  late_start: {
    tag: 'late_start',
    label: '遅く始めた子の追い上げ設計',
    message: '始めた時期は関係ありません。大事なのは"何を・どの順番で"身につけるか。追い上げの設計図があれば、十分に間に合います。',
  },
  stagnation: {
    tag: 'stagnation',
    label: '伸び悩みの見直しタイミング',
    message: '伸び悩みは"壁"ではなく"見直しのサイン"。今の練習方法を少し変えるだけで、止まっていた成長が動き始めます。',
  },
  selection: {
    tag: 'selection',
    label: 'セレクション準備の見直し期',
    message: 'セレクションまでの限られた時間で、最も効果的に見直すべきポイントがあります。短期間で整理すれば間に合います。',
  },
};

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'お子さんの学年を教えてください',
    options: [
      { text: '年長〜小学1年生', scores: { passive: 1, waiting: 1 }, tags: ['low_grade'] },
      { text: '小学2〜3年生', scores: { passive: 1 }, tags: ['low_grade'] },
      { text: '小学4〜5年生', scores: { careful: 1 } },
      { text: '小学6年生〜中学生', scores: { reserved: 1, split: 1 } },
    ],
  },
  {
    id: 2,
    text: 'サッカーを始めてどのくらいですか？',
    options: [
      { text: 'まだ始めたばかり（〜半年）', scores: { passive: 2, waiting: 1 }, tags: ['beginner'] },
      { text: '1年くらい', scores: { passive: 1 }, tags: ['beginner'] },
      { text: '2〜3年', scores: { careful: 1 } },
      { text: '4年以上', scores: { reserved: 1, split: 1 } },
    ],
  },
  {
    id: 3,
    text: 'サッカーを始めた時期について',
    options: [
      { text: '周りより早く始めた方', scores: {} },
      { text: '周りと同じくらい', scores: {} },
      { text: '周りより少し遅かった', scores: { considerate: 1 }, tags: ['late_start'] },
      { text: 'かなり遅く始めた方', scores: { considerate: 1, passive: 1 }, tags: ['late_start'] },
    ],
  },
  {
    id: 4,
    text: '試合で一番気になることは？',
    options: [
      { text: 'ボールに絡めない・消えてしまう', scores: { invisible: 2, waiting: 1 } },
      { text: '持っている力が出せていない気がする', scores: { reserved: 2, split: 1 } },
      { text: '判断が遅い・ワンテンポ遅れる', scores: { late_receiver: 2, unprepared: 1 } },
      { text: 'チャレンジせず無難なプレーが多い', scores: { safe_driver: 2, fear: 1 } },
    ],
  },
  {
    id: 5,
    text: '普段の練習で感じることは？',
    options: [
      { text: '練習では上手くできるのに…', scores: { split: 2, reserved: 1 } },
      { text: '練習でもなかなか上達しない', scores: { thinking: 1 }, tags: ['stagnation'] },
      { text: '練習は楽しそうだが試合になると違う', scores: { split: 1, fear: 1 } },
      { text: 'そもそも練習についていくのが大変', scores: { passive: 1 }, tags: ['beginner'] },
    ],
  },
  {
    id: 6,
    text: '親から見たお子さんの特徴は？',
    options: [
      { text: '慎重で石橋を叩くタイプ', scores: { careful: 2, fear: 1 } },
      { text: '気持ちは強いが空回りしやすい', scores: { rushing: 2 } },
      { text: '優しくて周りに気を使う', scores: { considerate: 2, waiting: 1 } },
      { text: '頭が良くて理解は早い', scores: { thinking: 2, unprepared: 1 } },
    ],
  },
  {
    id: 7,
    text: 'セレクションや進路について',
    options: [
      { text: 'セレクションを受ける予定がある', scores: { reserved: 1 }, tags: ['selection'] },
      { text: 'いずれ受けたいと思っている', scores: {}, tags: ['selection'] },
      { text: '今は特に考えていない', scores: {} },
      { text: 'まだそこまでの段階ではない', scores: { passive: 1 }, tags: ['beginner'] },
    ],
  },
  {
    id: 8,
    text: '今の"伸び悩み"の長さは？',
    options: [
      { text: 'まだ始めたてなのでわからない', scores: { waiting: 1 }, tags: ['beginner'] },
      { text: '最近少し気になり始めた', scores: { careful: 1 } },
      { text: '半年以上同じ壁がある', scores: { split: 1, late_receiver: 1 }, tags: ['stagnation'] },
      { text: '1年以上変わっていない気がする', scores: { split: 2, thinking: 1 }, tags: ['stagnation'] },
    ],
  },
  {
    id: 9,
    text: 'お子さん本人のタイプは？',
    options: [
      { text: '負けず嫌いで頑張り屋', scores: { rushing: 1, safe_driver: 1 } },
      { text: 'コツコツ努力するタイプ', scores: { reserved: 1, fear: 1 } },
      { text: '感覚派で考えるより動く方', scores: { rushing: 1 } },
      { text: '考えるのが好きで慎重', scores: { thinking: 2, careful: 1 } },
    ],
  },
  {
    id: 10,
    text: 'プレー動画を送って専門家に見てもらいたいですか？',
    options: [
      { text: 'ぜひ見てもらいたい', scores: { all: 2 } },
      { text: '興味はある', scores: { all: 1 } },
      { text: '今はまだいいかな', scores: {} },
      { text: 'まだ動画を撮ったことがない', scores: {}, tags: ['beginner'] },
    ],
  },
];

// Score keys to type ID mapping
export const SCORE_TYPE_MAP: Record<string, number> = {
  invisible: 1,    // 試合で消えやすい慎重派
  reserved: 2,     // 技術あるのに出せない温存型
  rushing: 3,      // 先に急ぎすぎる突進型
  considerate: 4,  // 周りに合わせすぎる遠慮型
  late_receiver: 5, // ボール受ける前で負ける後手型
  unprepared: 6,   // 見えてるのに出せない準備不足型
  safe_driver: 7,  // 1対1で力を隠す安全運転型
  split: 8,        // 練習と試合で別人になる分離型
  passive: 9,      // 最初の一歩が遅れる受け身型
  fear: 10,        // ミスを恐れて選択が減る慎重型
  waiting: 11,     // ボール触れば良いのに触れない待機型
  thinking: 12,    // 頭ではわかってるのに体が合わない思考先行型
  careful: 1,      // alias
};

export const LANE_CONFIG = {
  A: { min: 0, max: 4, label: '教育・無料フォロー', description: 'まずは無料コンテンツで土台づくり' },
  B: { min: 5, max: 8, label: 'オンライン診断', description: '動画を送って専門家に見てもらう' },
  C: { min: 9, max: 100, label: '対面・優先対応', description: '対面で直接見てもらう' },
} as const;

export const LINE_SCENARIOS: Record<TargetTag | 'default', string[]> = {
  default: [
    '【診断結果確定】{name}さんのお子さんの診断結果が出ました。タイプ：{type}。詳しい結果はこちら→{resultUrl}',
    '【よくある間違い】{type}のお子さんに、練習量を増やすだけでは逆効果になることがあります。大事なのは"出し方"の調整です。',
    '【原因の本質】{type}の本当の原因は技術不足ではありません。{causeRedefinition}',
    '【改善事例】同じタイプのお子さんが、たった1つの意識を変えただけで試合で見違えるように変わった事例をご紹介します。',
    '【ご案内】{type}のお子さん向けの{laneOffer}をご用意しています。詳しくはこちら→{offerUrl}',
  ],
  beginner: [
    '【診断結果確定】{name}さんのお子さんは始めたての今がチャンス！タイプ：{type}。詳しくはこちら→{resultUrl}',
    '【始めたてだからこそ】最初に"出し方"を知っておくと、この先の成長速度が全然違います。',
    '【土台づくりのコツ】{type}のお子さんは、まず{priorityTheme}から始めるのが効果的です。',
    '【成長事例】始めたての同じタイプのお子さんが、正しい順番で練習したら半年で見違えた事例です。',
    '【ご案内】始めたてのお子さん向け{laneOffer}をご用意しています→{offerUrl}',
  ],
  low_grade: [
    '【診断結果確定】低学年の今は土台づくりの最高のタイミング！タイプ：{type}→{resultUrl}',
    '【低学年のうちに】高学年で差がつくのは技術より"出し方"。今のうちに知っておくと有利です。',
    '【原因の本質】{type}のお子さんは、{causeRedefinition}',
    '【成長事例】低学年で同じタイプだったお子さんが、高学年で一気に開花した事例をご紹介。',
    '【ご案内】低学年のお子さん向け{laneOffer}→{offerUrl}',
  ],
  late_start: [
    '【診断結果確定】始めた時期より"出し方"が大事！タイプ：{type}→{resultUrl}',
    '【遅く始めても大丈夫】大事なのは何を・どの順番で身につけるか。追い上げの設計図があれば間に合います。',
    '【追い上げのコツ】{type}のお子さんは、{priorityTheme}を優先すると効率的に追い上げできます。',
    '【追い上げ事例】遅く始めた同じタイプのお子さんが、半年で追いついた事例です。',
    '【ご案内】追い上げ設計に最適な{laneOffer}→{offerUrl}',
  ],
  stagnation: [
    '【診断結果確定】伸び悩みは"見直しのサイン"。タイプ：{type}→{resultUrl}',
    '【伸び悩みの正体】練習量の問題ではありません。"出し方"がズレているだけです。',
    '【原因の本質】{type}のお子さんの伸び悩みは、{causeRedefinition}',
    '【見直し事例】同じタイプの伸び悩みが、1つの見直しで動き始めた事例です。',
    '【ご案内】伸び悩み解消に最適な{laneOffer}→{offerUrl}',
  ],
  selection: [
    '【診断結果確定】セレクション準備に"出し方"の見直しを。タイプ：{type}→{resultUrl}',
    '【セレクション対策】短期間で見直すべきポイントがあります。闇雲に練習する前に整理しましょう。',
    '【見直しポイント】{type}のお子さんがセレクションで見られるのは{priorityTheme}です。',
    '【合格事例】同じタイプのお子さんがセレクション前に見直して合格した事例です。',
    '【ご案内】セレクション対策に最適な{laneOffer}→{offerUrl}',
  ],
};

export const DEPARTMENT_LINKS: Record<string, string> = {
  'ポジション科': `${SITE_URL}/department/position`,
  'トラップ科': `${SITE_URL}/department/trap`,
  'オフザボール科': `${SITE_URL}/department/off-the-ball`,
  'ドリブル科': `${SITE_URL}/department/dribble`,
  '1対1科': `${SITE_URL}/department/one-on-one`,
  'メンタル科': `${SITE_URL}/department/mental`,
  '判断力科': `${SITE_URL}/department/decision`,
  'パス科': `${SITE_URL}/department/pass`,
  'キープ力科': `${SITE_URL}/department/keep`,
  'すぐ取られる改善科': `${SITE_URL}/department/ball-protection`,
  'フェイント科': `${SITE_URL}/department/feint`,
  '発達特性科': `${SITE_URL}/department/development`,
  'オンライン科': `${SITE_URL}/department/online`,
  'コーディネーション科': `${SITE_URL}/department/coordination`,
};
