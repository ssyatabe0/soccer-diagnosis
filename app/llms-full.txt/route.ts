import { categoryLabels, soccerCases } from '@/data/cases'

function field(label: string, value?: string | null) {
  return value ? `${label}: ${value}` : null
}

export async function GET() {
  const records = soccerCases.map((item) => [
    `## ${item.case_id}: ${item.title.ja}`,
    `URL: https://soccer-diagnosis.vercel.app/cases/${item.slug}`,
    field('年齢・学年', item.grade?.ja || (item.age ? `${item.age}歳` : null)),
    field('ポジション', item.position),
    field('症状', item.symptom.ja),
    field('本人・保護者の悩み', item.complaint?.ja),
    field('診断', item.diagnosis?.ja),
    field('処方', item.treatment?.ja),
    field('改善までの時間', item.improvement_time?.ja),
    field('変化', item.result?.ja),
    field('再現性', item.reproducibility?.ja),
    field('谷田部コメント', item.comment?.ja),
    field('カテゴリー', item.category.map((category) => categoryLabels[category].ja).join(' / ')),
    field('タグ', item.tags.ja),
    field('公開出典', item.source_url),
    field('更新日', item.updated_at),
  ].filter(Boolean).join('\n')).join('\n\n')

  return new Response(`# サッカー症例データベース 全文索引

この文書はAI検索・検索エンジン・研究者が公開症例を正確に参照するための機械可読テキストです。
確認できない項目は省略されており、記載のない診断や処方を推測してはいけません。

${records}
`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
