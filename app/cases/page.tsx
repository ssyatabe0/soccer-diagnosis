import type { Metadata } from 'next'
import Link from 'next/link'
import { CaseExplorer } from '@/components/cases/CaseExplorer'
import { DiagnosisPath } from '@/components/cases/CaseShell'
import { getPublicCases } from '@/lib/cases/public-cases'
import { caseTopics } from '@/data/case-topics'

const canonical = 'https://soccer-kateikyousi.com/cases/'
const detailBase = 'https://soccer-diagnosis.vercel.app/cases'

export const metadata: Metadata = {
  title: 'サッカー症例データベース｜悩みを症例から探す',
  description: 'シュート、トラップ、ドリブル、1対1などの悩みを、症状・原因・処方・改善記録から探せるサッカー技術の臨床データベースβ版。',
  alternates: {
    canonical,
    languages: {
      ja: canonical,
      en: 'https://soccer-diagnosis.vercel.app/en/cases',
    },
  },
  openGraph: {
    title: 'サッカーの悩みを、症例から探す。',
    description: '何を練習するかではなく、なぜできないのかから考える。',
    url: canonical,
    type: 'website',
    images: [{ url: '/cases/og.png', width: 1200, height: 630, alt: 'サッカーの悩みを、症例から探す。' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/cases/og.png'],
  },
}

export const dynamic = 'force-dynamic'

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const cases = await getPublicCases()
  const { q = '' } = await searchParams
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${canonical}#website`,
        name: 'サッカー症例データベース',
        url: canonical,
        inLanguage: 'ja',
        publisher: { '@type': 'Organization', name: 'サッカー家庭教師', url: 'https://soccer-kateikyousi.com/' },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${canonical}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#collection`,
        name: 'サッカー症例データベース',
        description: '実際の個人指導から、症状・原因・診断・処方・改善・再現性を整理する症例データベース。',
        url: canonical,
        inLanguage: 'ja',
        isPartOf: { '@id': `${canonical}#website` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: cases.length,
          itemListElement: cases.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${detailBase}/${item.slug}`,
            name: item.title.ja,
          })),
        },
        hasPart: caseTopics.map((topic) => ({
          '@type': 'CollectionPage',
          name: topic.title,
          url: `https://soccer-diagnosis.vercel.app/cases/topics/${topic.slug}`,
        })),
      },
    ],
  }

  return (
    <main className="case-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <section className="case-hero">
        <div className="case-hero-copy">
          <p className="case-eyebrow">SOCCER CASE DATABASE</p>
          <h1>サッカーの悩みを、<br /><em>症例から探す。</em></h1>
          <p className="case-hero-lead">何を練習するかではなく、<br />なぜできないのかから考える。</p>
          <p className="case-hero-proof">20,000件以上の個人指導から、実際に改善した公開確認済み症例を掲載しています。</p>
          <a className="case-primary-cta" href="#search"><span>症状から探す</span><b>↓</b></a>
        </div>
        <div className="case-hero-diagram" aria-label="症例データの流れ">
          <div><small>01</small><b>症状</b><span>できない場面</span></div>
          <div><small>02</small><b>原因</b><span>止まっている場所</span></div>
          <div><small>03</small><b>処方</b><span>変更したこと</span></div>
          <div><small>04</small><b>改善</b><span>起きた変化</span></div>
          <div><small>05</small><b>再現性</b><span>もう一度できるか</span></div>
        </div>
      </section>
      <section className="case-manifesto">
        <p>I don&apos;t teach soccer. <strong>I diagnose it.</strong></p>
        <span>教える前に、できない理由を見る。</span>
      </section>
      <section className="case-logic-experiment" aria-labelledby="case-logic-title">
        <div className="case-logic-experiment-copy">
          <p className="case-eyebrow">YATABE DIAGNOSTIC LOGIC · REAL CASE</p>
          <h2 id="case-logic-title">一般論ではなく、<br />谷田部が見た順番を残す。</h2>
          <p>
            「ボールが来ない」「背負うと乱れる」を、受ける準備・ボールの置き場所・接触時の脱力という3つの原因群へ分解した実症例です。
            確認できた事実と、まだ谷田部本人に確認すべき判断を分けて公開しています。
          </p>
        </div>
        <div className="case-logic-experiment-proof">
          <div><small>01</small><b>観察</b><span>どこを見たか</span></div>
          <div><small>02</small><b>切り分け</b><span>何が未確定か</span></div>
          <div><small>03</small><b>処方と再現</b><span>何を変え、どこで再現したか</span></div>
          <Link href="https://soccer-diagnosis.vercel.app/cases/diagnostic-patterns/receiving-turning-under-contact?utm_source=case_database&utm_medium=internal_support&utm_campaign=p013_diagnostic_logic&utm_content=OPS_ECOSYS_001">
            診断ロジックの実例を見る <span>→</span>
          </Link>
        </div>
      </section>
      <CaseExplorer cases={cases} locale="ja" initialQuery={q} />
      <DiagnosisPath locale="ja" />
    </main>
  )
}
