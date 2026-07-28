export type CaseTopic = {
  slug: string
  title: string
  shortTitle: string
  description: string
  intro: string
  queries: string[]
  caseSlugs: string[]
}

export const caseTopics: CaseTopic[] = [
  {
    slug: 'shooting-contact',
    title: 'サッカーでシュートが浮く・ミートできない症例',
    shortTitle: 'シュートが浮く・ミートできない',
    description: 'サッカーでシュートが浮く、ミートできない、強く打てない悩みに関連する実在症例を、症状・診断・処方・改善動画から比較できます。',
    intro: '同じ「シュートが浮く」という症状でも、ボールへの入り方、身体の使い方、前のプレーとのつながりなど、確認すべき点は一人ずつ異なります。ここでは公開記録で確認できる関連症例だけをまとめています。',
    queries: ['サッカー シュート 浮く', 'シュート ミートできない', 'ダイレクトシュート 当たらない', 'キック力 弱い'],
    caseSlugs: ['direct-volley-low-fast-strong', 'kick-power-after-dribble', 'age10-cannot-shoot', 'first-touch-cannot-face-forward'],
  },
  {
    slug: 'first-touch-forward',
    title: 'サッカーのトラップが止まりすぎる・前を向けない症例',
    shortTitle: 'トラップが止まりすぎる・前を向けない',
    description: 'トラップすると止まりすぎる、前向きで受けられない、ファーストタッチから次のプレーへ移れない悩みの関連症例集。',
    intro: 'ファーストタッチの悩みは「止める技術」だけでは判断できません。次に進みたい方向、相手との距離、身体の向きまで含め、実際に何が変わったかを症例単位で確認できます。',
    queries: ['サッカー トラップ 止めすぎる', '前向きで受けられない', 'ファーストタッチ 動かす', 'トラップ後 前を向けない'],
    caseSlugs: ['first-touch-cannot-face-forward', 'escape-pressure-decision', 'aerial-control-difficult', 'grade8-defensive-aerial-ball'],
  },
  {
    slug: 'long-kick-distance',
    title: 'サッカーでロングキックが飛ばない症例',
    shortTitle: 'ロングキックが飛ばない',
    description: 'ロングキックが飛ばない、ロングボールを強く蹴れない悩みに関連する、小学生・中学生・初心者の確認済み改善症例。',
    intro: '距離が出ない症状だけを見て、筋力不足と決めつけることはできません。公開症例では、年齢や経験の異なる選手に起きた変化を動画と記録から比較できます。',
    queries: ['サッカー ロングキック 飛ばない', 'ロングボール 蹴れない', '小学生 ロングキック', 'クロスボール キック'],
    caseSlugs: ['beginner-long-kick', 'grade3-long-kick-distance', 'grade2-long-kick', 'grade8-cross-kick'],
  },
  {
    slug: 'one-on-one-dribbling',
    title: 'サッカーの1対1で抜けない・ドリブルで取られる症例',
    shortTitle: '1対1で抜けない・ドリブルで取られる',
    description: '1対1で抜けない、フェイントが使えない、ドリブルするとすぐ取られる悩みに関連する実在症例を比較できます。',
    intro: '技の数を増やしても、相手との関係やボールを動かす位置が変わらなければ、1対1の結果は変わらないことがあります。症例ごとの症状と変化を確認してください。',
    queries: ['サッカー 1対1 抜けない', 'ドリブル すぐ取られる', 'フェイント 使えない', '試合でボールを取られる'],
    caseSlugs: ['feint-not-usable', 'grade4-loses-ball-in-match', 'grade2-awkward-dribbling', 'ball-taken-immediately'],
  },
  {
    slug: 'aerial-ball-control',
    title: 'サッカーで浮き玉・高いボールの処理が苦手な症例',
    shortTitle: '浮き玉・高いボールが苦手',
    description: '浮き玉が怖い、高いボールをトラップできない、守備で浮き球を処理できない悩みの確認済み症例。',
    intro: '浮き玉への恐怖、落下点、身体の向き、守備時の判断は、見た目が似ていても同じ問題とは限りません。年齢と場面の異なる公開症例から探せます。',
    queries: ['サッカー 浮き玉 怖い', '高いボール トラップできない', '浮き球 処理 苦手', '守備 浮き玉'],
    caseSlugs: ['afraid-of-high-balls', 'aerial-control-difficult', 'grade8-defensive-aerial-ball'],
  },
  {
    slug: 'protect-the-ball',
    title: 'サッカーですぐボールを取られる・逃げられない症例',
    shortTitle: 'すぐボールを取られる・逃げられない',
    description: '相手に詰められると逃げられない、ボールを持つとすぐ取られる、試合でキープできない悩みの関連症例。',
    intro: 'ボールを失う理由は、ドリブル技術だけではありません。受ける前の準備、最初のタッチ、相手との距離、判断を含め、公開症例に記録された変化を比較できます。',
    queries: ['サッカー すぐボールを取られる', '詰められると逃げられない', 'ボールキープ できない', '試合 ドリブル 取られる'],
    caseSlugs: ['escape-pressure-decision', 'grade4-loses-ball-in-match', 'ball-taken-immediately', 'mls-next-forward-receiving-turning'],
  },
]

export function getCaseTopic(slug: string) {
  return caseTopics.find((topic) => topic.slug === slug)
}
