export type CaseRecord = {
  id?: string
  case_code?: string | null
  age: number | null
  grade: string | null
  position: string | null
  problem: string | null
  cause: string | null
  improvement: string | null
  result: string | null
  parent_feedback: string | null
  publish_status: string
  country: string | null
  region: string | null
  tags: string[] | null
  full_name?: string | null
  parent_name?: string | null
  child_name?: string | null
}

export type CaseVideo = {
  id: string
  title: string
  category: string | null
  publish_status: string
  youtube_url: string | null
  short_url: string | null
  description: string | null
  thumbnail_idea: string | null
  sns_caption: string | null
}

export function caseName(item: CaseRecord) {
  return item.case_code || item.child_name || item.full_name || item.parent_name || '症例カルテ'
}

export function summarizeCase(item: CaseRecord) {
  return [
    item.problem ? `悩み: ${item.problem}` : null,
    item.cause ? `原因: ${item.cause}` : null,
    item.improvement ? `改善: ${item.improvement}` : null,
    item.result ? `結果: ${item.result}` : null,
  ].filter(Boolean).join('\n')
}

export function generateBlogDraft(item: CaseRecord) {
  return `# ${item.problem || 'サッカーの悩み'}を改善した症例\n\n## 相談内容\n${item.problem || '相談内容を整理します。'}\n\n## 原因\n${item.cause || '動き方、判断、技術面から原因を整理します。'}\n\n## 改善したこと\n${item.improvement || 'トレーニング内容を記録します。'}\n\n## 結果\n${item.result || '変化や成果を記録します。'}\n\n## 保護者の声\n${item.parent_feedback || '公開許可を確認後に掲載します。'}\n\n※公開前に個人情報と許可状況を必ず確認してください。`
}

export function generateSeoArticle(item: CaseRecord) {
  const keyword = item.problem || 'サッカー 個人レッスン 改善'
  return `タイトル案: ${keyword}の原因と改善方法｜実際の指導症例から解説\n\n導入:\n${keyword}で悩む選手は、技術だけでなく姿勢・判断・成功体験の不足が関係していることがあります。\n\n本文構成:\n1. よくある悩み\n2. 今回の症例\n3. 原因分析\n4. 改善メニュー\n5. 変化したポイント\n6. 同じ悩みの家庭への提案\n\n症例要約:\n${summarizeCase(item)}\n\nCTA:\n同じ悩みがある場合は、現在のプレー動画や試合状況から改善ポイントを整理できます。`
}

export function generateVideoSupport(item: CaseRecord) {
  const base = item.problem || 'サッカーの悩み改善'
  return {
    title: `${base}を変えた練習法｜${item.grade || '小学生'}の改善症例`,
    description: `今回の動画では「${base}」に悩んでいた選手の改善ポイントを紹介します。\n原因: ${item.cause || 'プレー分析で確認'}\n改善: ${item.improvement || '個別トレーニングで改善'}\n結果: ${item.result || '変化を確認'}\n※個人が特定される情報は公開前に確認してください。`,
    thumbnail: `左: 悩み「${base}」 / 右: 改善後の変化。大きな文字で「抜けない原因はここ」`,
    sns: `「${base}」で悩んでいた選手の改善症例。\n原因を整理して、練習の順番を変えるだけでプレーが変わることがあります。\n#サッカー個人レッスン #ドリブル #育成年代`,
  }
}

export function matchesCaseQuery(item: CaseRecord, q: string) {
  const text = [item.case_code, item.problem, item.cause, item.improvement, item.result, item.parent_feedback, item.country, item.region, item.position, ...(item.tags || [])].filter(Boolean).join(' ').toLowerCase()
  const query = q.toLowerCase()
  const aliases: Record<string, string[]> = {
    'ドリブルで抜けない子': ['ドリブル', '抜けない', '1対1'],
    'mls next': ['mls', 'next', '海外', 'アメリカ'],
    '海外選手': ['海外', 'アメリカ', 'グアム', 'mls'],
    '左利き': ['左利き', '左足'],
    'シュート打てない': ['シュート', '打てない', '決定力'],
    '自信がない': ['自信', 'メンタル', '消極的'],
    '試合で消える': ['試合', '消える', '関われない'],
  }
  const words = aliases[query] || query.split(/\s+/).filter(Boolean)
  return words.some((word) => text.includes(word.toLowerCase()))
}
