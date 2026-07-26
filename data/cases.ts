export type Locale = 'ja' | 'en'

export type LocalizedText = {
  ja: string
  en: string
}

export type CaseCategory =
  | 'shooting'
  | 'first-touch'
  | 'dribbling'
  | 'one-v-one'
  | 'body-movement'
  | 'running'
  | 'defending'
  | 'passing'
  | 'long-ball'
  | 'decision-making'
  | 'breathing'
  | 'return-from-injury'
  | 'match-play'
  | 'other'

export type SoccerCase = {
  case_id: string
  slug: string
  title: LocalizedText
  age: string | null
  grade: LocalizedText | null
  position: string | null
  symptom: LocalizedText
  complaint: LocalizedText | null
  diagnosis: LocalizedText | null
  treatment: LocalizedText | null
  before_video: string | null
  after_video: string | null
  comparison_video: string | null
  improvement_time: LocalizedText | null
  result: LocalizedText | null
  reproducibility: LocalizedText | null
  comment: LocalizedText | null
  category: CaseCategory[]
  tags: LocalizedText
  created_at: string
  updated_at: string
  source_url: string
  source_status: 'public-source' | 'verified-video'
  featured_rank: number
  future: {
    player_id: string | null
    lesson_id: string | null
    improvement_events: unknown[]
    cause_identification_seconds: number | null
    improvement_seconds: number | null
    success_rate: number | null
    session_tracking: unknown[]
    overseas_case: boolean
    ai_analysis: unknown | null
  }
}

const blankFuture = (overseas_case = false): SoccerCase['future'] => ({
  player_id: null,
  lesson_id: null,
  improvement_events: [],
  cause_identification_seconds: null,
  improvement_seconds: null,
  success_rate: null,
  session_tracking: [],
  overseas_case,
  ai_analysis: null,
})

const proofCase = (
  input: Omit<SoccerCase, 'complaint' | 'diagnosis' | 'treatment' | 'before_video' | 'after_video' | 'result' | 'reproducibility' | 'comment' | 'future'>,
): SoccerCase => ({
  ...input,
  complaint: input.symptom,
  diagnosis: null,
  treatment: null,
  before_video: null,
  after_video: null,
  result: null,
  reproducibility: null,
  comment: null,
  future: blankFuture(),
})

export const categoryLabels: Record<CaseCategory, LocalizedText> = {
  shooting: { ja: 'シュート', en: 'Shooting' },
  'first-touch': { ja: 'トラップ / ファーストタッチ', en: 'First Touch' },
  dribbling: { ja: 'ドリブル', en: 'Dribbling' },
  'one-v-one': { ja: '1対1', en: '1v1' },
  'body-movement': { ja: '身体の使い方', en: 'Body Movement' },
  running: { ja: '走り方', en: 'Running' },
  defending: { ja: '守備', en: 'Defending' },
  passing: { ja: 'パス', en: 'Passing' },
  'long-ball': { ja: 'ロングボール', en: 'Long Ball' },
  'decision-making': { ja: '判断', en: 'Decision Making' },
  breathing: { ja: '呼吸', en: 'Breathing' },
  'return-from-injury': { ja: '怪我後の動き', en: 'Return from Injury' },
  'match-play': { ja: '試合中のプレー', en: 'Match Play' },
  other: { ja: 'その他', en: 'Other' },
}

export const soccerCases: SoccerCase[] = [
  {
    case_id: 'CASE-0001',
    slug: 'direct-volley-low-fast-strong',
    title: {
      ja: '山なりのダイレクトシュートを低く・速く・強く',
      en: 'Turning a Looping First-Time Shot into a Low, Fast, Powerful Strike',
    },
    age: null,
    grade: null,
    position: null,
    symptom: {
      ja: 'ダイレクトシュートが山なりになり、低く速い軌道にならない',
      en: 'First-time shots loop upward instead of travelling low and fast.',
    },
    complaint: {
      ja: 'ダイレクトシュートの軌道と強さを改善したい',
      en: 'The player wanted a lower, faster and more powerful first-time shot.',
    },
    diagnosis: null,
    treatment: null,
    before_video: null,
    after_video: null,
    comparison_video: '6hKZZPeIyD8',
    improvement_time: { ja: '5分', en: '5 minutes' },
    result: {
      ja: '山なりだったダイレクトシュートが、低く・速く・強い軌道へ近づいた。',
      en: 'The looping first-time shot moved toward a lower, faster and more powerful trajectory.',
    },
    reproducibility: null,
    comment: {
      ja: '具体的な原因特定秒数は未確認のため、動画で確認できる変化のみを掲載しています。',
      en: 'The exact diagnosis timestamp has not been verified, so only the visible change in the video is published.',
    },
    category: ['shooting', 'body-movement'],
    tags: {
      ja: 'シュート ダイレクトシュート ミート 軌道 キック 身体の使い方',
      en: 'shooting first-time shot volley contact trajectory kicking body movement',
    },
    created_at: '2026-07-14T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://www.youtube.com/watch?v=6hKZZPeIyD8',
    source_status: 'verified-video',
    featured_rank: 1,
    future: blankFuture(),
  },
  proofCase({
    case_id: 'CASE-0002',
    slug: 'afraid-of-high-balls',
    title: { ja: '浮き玉と高いボールが怖い', en: 'Fear of High and Aerial Balls' },
    age: null,
    grade: { ja: '小学2年生', en: 'Grade 2 elementary school' },
    position: null,
    symptom: { ja: '浮き玉と高いボールの処理が怖い', en: 'The player is afraid of controlling high and aerial balls.' },
    comparison_video: '76m9vZCx7Gg',
    improvement_time: { ja: '1分', en: '1 minute' },
    category: ['first-touch', 'body-movement'],
    tags: { ja: '小学2年 浮き玉 高いボール トラップ 怖い', en: 'grade 2 aerial ball high ball first touch fear' },
    created_at: '2026-06-26T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-76m9vzcx7gg/',
    source_status: 'public-source',
    featured_rank: 2,
  }),
  proofCase({
    case_id: 'CASE-0003',
    slug: 'beginner-long-kick',
    title: { ja: 'ロングキックが蹴れない', en: 'A Beginner Who Could Not Play a Long Kick' },
    age: null,
    grade: { ja: 'サッカー歴1か月の初心者女子', en: 'Female beginner with one month of soccer experience' },
    position: null,
    symptom: { ja: 'ロングキックが蹴れない', en: 'The player cannot strike a long kick.' },
    comparison_video: 'ZJ7VflYwaKU',
    improvement_time: { ja: '3分', en: '3 minutes' },
    category: ['long-ball', 'body-movement'],
    tags: { ja: '初心者 女子 ロングキック キック 飛ばない', en: 'beginner female player long kick kicking distance' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-zj7vflywaku/',
    source_status: 'public-source',
    featured_rank: 3,
  }),
  proofCase({
    case_id: 'CASE-0004',
    slug: 'juggling-does-not-continue',
    title: { ja: 'リフティングが続かない', en: 'Juggling Breaks Down Quickly' },
    age: null,
    grade: null,
    position: null,
    symptom: { ja: 'リフティングが続かない', en: 'The player cannot keep juggling the ball.' },
    comparison_video: 'EawYcWyPMbk',
    improvement_time: { ja: '3分', en: '3 minutes' },
    category: ['other', 'body-movement'],
    tags: { ja: 'リフティング ボールコントロール 身体の使い方', en: 'juggling ball control body movement' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-eawycwypmbk/',
    source_status: 'public-source',
    featured_rank: 4,
  }),
  proofCase({
    case_id: 'CASE-0005',
    slug: 'grade3-long-kick-distance',
    title: { ja: 'ロングキックが飛ばない', en: 'Grade 3 Long Kick Lacks Distance' },
    age: null,
    grade: { ja: '小学3年生', en: 'Grade 3 elementary school' },
    position: null,
    symptom: { ja: 'ロングキックが飛ばない', en: 'The player cannot generate distance on a long kick.' },
    comparison_video: 'RanHMOJiwvs',
    improvement_time: { ja: '3回', en: '3 attempts' },
    category: ['long-ball', 'body-movement'],
    tags: { ja: '小学3年 ロングキック 飛ばない キック', en: 'grade 3 long kick distance kicking' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-ranhmojiwvs/',
    source_status: 'public-source',
    featured_rank: 5,
  }),
  proofCase({
    case_id: 'CASE-0006',
    slug: 'grade2-long-kick',
    title: { ja: '小学2年生のロングキック改善', en: 'Improving a Grade 2 Long Kick' },
    age: null,
    grade: { ja: '小学2年生', en: 'Grade 2 elementary school' },
    position: null,
    symptom: { ja: 'ロングキックを改善したい', en: 'The player needs to improve long-kick distance and contact.' },
    comparison_video: 'K7pfVzs2lZU',
    improvement_time: { ja: '5分', en: '5 minutes' },
    category: ['long-ball', 'body-movement'],
    tags: { ja: '小学2年 ロングキック キック 身体の使い方', en: 'grade 2 long kick kicking body movement' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-k7pfvzs2lzu/',
    source_status: 'public-source',
    featured_rank: 6,
  }),
  proofCase({
    case_id: 'CASE-0007',
    slug: 'kick-power-after-dribble',
    title: { ja: 'ドリブルからのキック力を強化', en: 'Generating More Power after a Dribble' },
    age: null,
    grade: null,
    position: null,
    symptom: { ja: 'ドリブル後のキックに力が伝わらない', en: 'The player cannot transfer enough power into a kick after dribbling.' },
    comparison_video: '_45ehjM_U-s',
    improvement_time: { ja: '5分', en: '5 minutes' },
    category: ['shooting', 'dribbling', 'body-movement'],
    tags: { ja: 'ドリブル キック力 シュート 身体の使い方', en: 'dribbling kick power shooting body movement' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-_45ehjm_u-s/',
    source_status: 'public-source',
    featured_rank: 7,
  }),
  proofCase({
    case_id: 'CASE-0008',
    slug: 'feint-not-usable',
    title: { ja: 'フェイントが使えない', en: 'A Feint That Does Not Work in 1v1' },
    age: null,
    grade: { ja: '小学1年生', en: 'Grade 1 elementary school' },
    position: null,
    symptom: { ja: 'フェイントをプレーで使えない', en: 'The player cannot use a feint effectively in play.' },
    comparison_video: 'YprDZ3mXlQk',
    improvement_time: { ja: '5分', en: '5 minutes' },
    category: ['dribbling', 'one-v-one'],
    tags: { ja: '小学1年 フェイント ドリブル 1対1 抜けない', en: 'grade 1 feint dribbling 1v1 cannot beat defender' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-yprdz3mxlqk/',
    source_status: 'public-source',
    featured_rank: 8,
  }),
  proofCase({
    case_id: 'CASE-0009',
    slug: 'aerial-control-difficult',
    title: { ja: '浮き玉の処理が苦手', en: 'Difficulty Controlling Aerial Balls' },
    age: null,
    grade: null,
    position: null,
    symptom: { ja: '浮き玉の処理が苦手', en: 'The player struggles to control aerial balls.' },
    comparison_video: '_z4_u3ltgUY',
    improvement_time: { ja: '5分', en: '5 minutes' },
    category: ['first-touch', 'body-movement'],
    tags: { ja: '浮き玉 トラップ ファーストタッチ 身体の使い方', en: 'aerial ball first touch control body movement' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-xadmccvpxcs/',
    source_status: 'public-source',
    featured_rank: 9,
  }),
  proofCase({
    case_id: 'CASE-0010',
    slug: 'age10-cannot-shoot',
    title: { ja: '10歳・シュートを打てない', en: 'A 10-Year-Old Who Could Not Shoot' },
    age: '10',
    grade: null,
    position: null,
    symptom: { ja: 'シュートを打てない', en: 'The player cannot get a shot away.' },
    comparison_video: 'IY_omHDazwk',
    improvement_time: { ja: '5分', en: '5 minutes' },
    category: ['shooting', 'body-movement'],
    tags: { ja: '10歳 シュート 打てない ミート 身体の使い方', en: 'age 10 shooting cannot shoot contact body movement' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-iy_omhdazwk/',
    source_status: 'public-source',
    featured_rank: 10,
  }),
  proofCase({
    case_id: 'CASE-0011',
    slug: 'first-touch-cannot-face-forward',
    title: { ja: 'トラップ後に前を向いてシュートを打てない', en: 'Cannot Face Forward and Shoot after the First Touch' },
    age: null,
    grade: { ja: '小学1年生', en: 'Grade 1 elementary school' },
    position: null,
    symptom: { ja: 'トラップ後に前を向いてシュートへ移れない', en: 'The first touch does not allow the player to face forward and shoot.' },
    comparison_video: 'KFj23PhVFBA',
    improvement_time: null,
    category: ['first-touch', 'shooting', 'decision-making'],
    tags: { ja: '小学1年 トラップ 前を向けない シュート ファーストタッチ', en: 'grade 1 first touch cannot face forward shooting' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-kfj23phvfba/',
    source_status: 'public-source',
    featured_rank: 11,
  }),
  proofCase({
    case_id: 'CASE-0012',
    slug: 'escape-pressure-decision',
    title: { ja: '詰められても逃げられない', en: 'Cannot Escape When Pressed' },
    age: null,
    grade: { ja: '小学5年生', en: 'Grade 5 elementary school' },
    position: null,
    symptom: { ja: '相手に詰められると逃げ道を作れない', en: 'The player cannot create an escape route when pressed.' },
    comparison_video: 'i8gMetONb-c',
    improvement_time: null,
    category: ['decision-making', 'one-v-one', 'first-touch'],
    tags: { ja: '小学5年 判断 詰められる 逃げられない 1対1', en: 'grade 5 decision making pressed escape 1v1' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-i8gmetonb-c/',
    source_status: 'public-source',
    featured_rank: 12,
  }),
  proofCase({
    case_id: 'CASE-0013',
    slug: 'grade8-defensive-aerial-ball',
    title: { ja: '中学2年生・守備での浮き玉処理', en: 'Grade 8 Defensive Aerial-Ball Control' },
    age: null,
    grade: { ja: '中学2年生', en: 'Grade 8 / second year of junior high school' },
    position: null,
    symptom: { ja: '守備で浮き玉をうまく処理できない', en: 'The player struggles to deal with aerial balls while defending.' },
    comparison_video: '_z4_u3ltgUY',
    improvement_time: { ja: '5分', en: '5 minutes' },
    category: ['defending', 'first-touch', 'body-movement'],
    tags: { ja: '中学2年 守備 浮き玉 トラップ 身体の使い方', en: 'grade 8 defending aerial ball first touch body movement' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-_z4_u3ltguy/',
    source_status: 'public-source',
    featured_rank: 13,
  }),
  proofCase({
    case_id: 'CASE-0014',
    slug: 'grade8-cross-kick',
    title: { ja: '中学2年生・クロスボールのキック', en: 'Grade 8 Crossing Technique' },
    age: null,
    grade: { ja: '中学2年生', en: 'Grade 8 / second year of junior high school' },
    position: null,
    symptom: { ja: 'クロスボールのキックを安定させたい', en: 'The player needs a more consistent crossing technique.' },
    comparison_video: '3PXwZFUZoS0',
    improvement_time: { ja: '10分', en: '10 minutes' },
    category: ['passing', 'long-ball', 'body-movement'],
    tags: { ja: '中学2年 クロス キック ロングボール パス', en: 'grade 8 crossing kicking long ball passing' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-3pxwzfuzos0/',
    source_status: 'public-source',
    featured_rank: 14,
  }),
  proofCase({
    case_id: 'CASE-0015',
    slug: 'grade4-loses-ball-in-match',
    title: { ja: '試合で相手にボールを取られる', en: 'Losing the Ball to Opponents in Matches' },
    age: null,
    grade: { ja: '小学4年生', en: 'Grade 4 elementary school' },
    position: null,
    symptom: { ja: '試合で相手にボールを取られ、抜けない', en: 'The player loses the ball in matches and cannot beat an opponent.' },
    comparison_video: '21ZrUYrgZQY',
    improvement_time: null,
    category: ['dribbling', 'one-v-one', 'match-play'],
    tags: { ja: '小学4年 試合 ドリブル 取られる 抜けない 1対1', en: 'grade 4 match dribbling loses ball cannot beat defender 1v1' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-21zruyrgzqy/',
    source_status: 'public-source',
    featured_rank: 15,
  }),
  proofCase({
    case_id: 'CASE-0016',
    slug: 'grade2-awkward-dribbling',
    title: { ja: '小学2年生・ドリブルがぎこちない', en: 'Awkward Dribbling in Grade 2' },
    age: null,
    grade: { ja: '小学2年生', en: 'Grade 2 elementary school' },
    position: null,
    symptom: { ja: 'ドリブルの動きがぎこちない', en: 'The player looks awkward and disconnected while dribbling.' },
    comparison_video: '_WhwHTNIx48',
    improvement_time: null,
    category: ['dribbling', 'body-movement'],
    tags: { ja: '小学2年 ドリブル ぎこちない 身体の使い方', en: 'grade 2 dribbling awkward body movement' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-_whwhtnix48/',
    source_status: 'public-source',
    featured_rank: 16,
  }),
  proofCase({
    case_id: 'CASE-0017',
    slug: 'ball-taken-immediately',
    title: { ja: 'すぐにボールを取られる', en: 'The Ball Is Taken Immediately' },
    age: null,
    grade: null,
    position: null,
    symptom: { ja: 'ボールを持つとすぐに取られる', en: 'The player loses the ball almost immediately after receiving it.' },
    comparison_video: 'RY2yfMeteDc',
    improvement_time: null,
    category: ['dribbling', 'one-v-one', 'body-movement'],
    tags: { ja: 'ボールキープ すぐ取られる ドリブル 1対1 身体の使い方', en: 'ball retention loses ball dribbling 1v1 body movement' },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/video-proof-ry2yfmetedc/',
    source_status: 'public-source',
    featured_rank: 17,
  }),
  {
    case_id: 'CASE-0018',
    slug: 'mls-next-forward-receiving-turning',
    title: {
      ja: 'ボールが来ない・背負うとキープやターンが乱れる',
      en: 'Receiving More Passes and Turning under Pressure',
    },
    age: '16',
    grade: { ja: '高校生', en: 'High school player' },
    position: 'FW / WG',
    symptom: {
      ja: 'ボールが来ず、相手を背負うとキープやターンが乱れる',
      en: 'The player was not receiving enough passes and lost control when holding off a defender or turning.',
    },
    complaint: {
      ja: 'ボールへの関与を増やし、背負った状態のキープとターンを安定させたい',
      en: 'Increase involvement on the ball and become more stable when receiving with a defender behind.',
    },
    diagnosis: {
      ja: 'パスを出しやすい立ち位置、走り出しのタイミング、コース取り、体の向き、コートの使い方と戦術理解が不足。背負った状態では、ボールの置き場所、ターン時の身体操作、相手の力を受けた時の脱力と利用が整理されていなかった。',
      en: 'Positioning, run timing, movement lines, body orientation and use of space were not giving teammates a clear passing option. With a defender behind, ball placement, turning mechanics and the ability to absorb and use contact were not yet organised.',
    },
    treatment: {
      ja: '走り出しのタイミング、パスコースを作るコース取り、体の向き、受け方、コートの使い方と戦術理解を修正。キープ・ターンでは、基本ターン、ボールコントロール、相手の力を利用する考え方、身体操作、実戦的なトラップ技術を簡略化して指導した。',
      en: 'Adjusted run timing, passing-lane movement, body orientation, receiving shape, use of space and tactical understanding. For holding and turning, the session simplified the basic turn, ball control, use of the opponent’s force, body mechanics and game-realistic first touch.',
    },
    before_video: null,
    after_video: null,
    comparison_video: '-yBaE4kztvU',
    improvement_time: null,
    result: {
      ja: 'パスを受ける回数とボールへの関与回数が増え、受ける位置が改善。背負った状態でもボールを失いにくくなり、ターン時のボールコントロールが安定し、接触を受けてもプレーが乱れにくくなった。',
      en: 'The player received more passes and became involved more often. Receiving positions improved, ball retention became more reliable with a defender behind, turns were cleaner and contact disrupted play less often.',
    },
    reproducibility: {
      ja: '高校サッカー部練習参加・ゲーム形式トレーニングを含む実戦環境で変化を確認。',
      en: 'The change was observed in a high-school team training environment and game-based practice.',
    },
    comment: null,
    category: ['first-touch', 'body-movement', 'decision-making', 'match-play', 'one-v-one'],
    tags: {
      ja: '16歳 高校生 FW WG MLS NEXT 受け方 ターン キープ 判断 身体操作',
      en: 'age 16 high school FW WG MLS NEXT receiving turning retention decision making body movement',
    },
    created_at: '2026-06-27T00:00:00+09:00',
    updated_at: '2026-07-25T00:00:00+09:00',
    source_url: 'https://soccer-kateikyousi.com/intl-mlsnext-001-fw-wg/',
    source_status: 'public-source',
    featured_rank: 18,
    future: blankFuture(true),
  },
]

export function getCaseBySlug(slug: string) {
  return soccerCases.find((item) => item.slug === slug)
}

export function getRelatedCases(item: SoccerCase, candidates: SoccerCase[] = soccerCases, limit = 3) {
  return candidates
    .filter((candidate) => candidate.case_id !== item.case_id)
    .map((candidate) => ({
      candidate,
      score:
        candidate.category.filter((category) => item.category.includes(category)).length * 3 +
        candidate.tags.ja.split(' ').filter((tag) => item.tags.ja.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || a.candidate.featured_rank - b.candidate.featured_rank)
    .slice(0, limit)
    .map(({ candidate }) => candidate)
}
