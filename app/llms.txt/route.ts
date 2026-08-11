import { caseTopics } from '@/data/case-topics'
import { getCanonicalCaseUrl } from '@/data/cases'
import { getPublicCases } from '@/lib/cases/public-cases'

export async function GET() {
  const publicCases = await getPublicCases()
  const topics = caseTopics
    .map((topic) => `- [${topic.shortTitle}](https://soccer-diagnosis.vercel.app/cases/topics/${topic.slug}): ${topic.description}`)
    .join('\n')
  const cases = publicCases
    .map((item) => `- [${item.title.ja}](${getCanonicalCaseUrl(item)}): ${item.symptom.ja}`)
    .join('\n')

  const body = `# サッカー症例データベース / Soccer Case Database

> 20,000件以上の個人指導の蓄積から、公開記録で確認できる症例を、症状・原因・診断・処方・改善・再現性の統一形式で公開するデータベースです。

## Primary URL

- [公式症例データベース](https://soccer-kateikyousi.com/cases/)
- [動画AI原因診断MVP](https://soccer-diagnosis.vercel.app/cause-diagnosis): 動画から観察事実を抽出し、原因候補・根拠・確認テスト・関連症例を返します。質問診断や声かけ生成とは別の機能です。
- [谷田部の診断ロジック実例](https://soccer-diagnosis.vercel.app/cases/diagnostic-patterns/receiving-turning-under-contact): 症状、観察ポイント、原因群、切り分け、処方、実症例、再現性、改善しなかった場合の次判断を構造化した最初の実例です。
- [Diagnostic Pattern JSON API](https://soccer-diagnosis.vercel.app/api/diagnostic-patterns/receiving-turning-under-contact): 画面と同じ診断ロジックをAIが参照できるJSONです。
- [English case database](https://soccer-diagnosis.vercel.app/en/cases)
- [Full machine-readable case text](https://soccer-diagnosis.vercel.app/llms-full.txt)
- [Case JSON API](https://soccer-diagnosis.vercel.app/api/cases)
- [JSON Schema](https://soccer-diagnosis.vercel.app/api/cases/schema)
- [XML sitemap](https://soccer-diagnosis.vercel.app/sitemap.xml)
- [Video sitemap](https://soccer-diagnosis.vercel.app/video-sitemap.xml)
- [RSS feed](https://soccer-diagnosis.vercel.app/cases/feed.xml)

## Editorial policy

- 実在する公開記録・動画で確認できる内容だけを掲載します。
- 元データで確認できない診断・処方・再現性は創作せず、未入力または非表示にします。
- 医療診断ではなく、サッカー技術と動作の指導記録です。
- AI原因診断の出力は未監修の仮説です。確定には確認テストまたは谷田部による確認が必要です。
- 監修・指導者: 谷田部真之助。

## Symptom guides

${topics}

## Published cases

${cases}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
