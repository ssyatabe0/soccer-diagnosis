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
