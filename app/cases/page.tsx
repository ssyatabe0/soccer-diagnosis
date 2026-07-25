import type { Metadata } from 'next'
import { CaseExplorer } from '@/components/cases/CaseExplorer'
import { DiagnosisPath } from '@/components/cases/CaseShell'
import { soccerCases } from '@/data/cases'

const canonical = 'https://soccer-diagnosis.vercel.app/cases'

export const metadata: Metadata = {
  title: 'サッカー症例データベース｜悩みを症例から探す',
  description: 'シュート、トラップ、ドリブル、1対1などの悩みを、症状・原因・介入・改善記録から探せるサッカー技術の臨床データベースβ版。',
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

export default function CasesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'サッカー症例データベース',
    description: '実際の個人指導から、症状・原因・診断・処方・改善・再現性を整理する症例データベース。',
    url: canonical,
    inLanguage: 'ja',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: soccerCases.length,
      itemListElement: soccerCases.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${canonical}/${item.slug}`,
        name: item.title.ja,
      })),
    },
  }

  return (
    <main className="case-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <section className="case-hero">
        <div className="case-hero-copy">
          <p className="case-eyebrow">SOCCER CASE DATABASE / BETA</p>
          <h1>サッカーの悩みを、<br /><em>症例から探す。</em></h1>
          <p className="case-hero-lead">何を練習するかではなく、<br />なぜできないのかから考える。</p>
          <p className="case-hero-proof">20,000件以上の個人指導から、実際に改善した公開確認済み症例を掲載しています。</p>
          <a className="case-primary-cta" href="#search"><span>症状から探す</span><b>↓</b></a>
        </div>
        <div className="case-hero-diagram" aria-label="症例データの流れ">
          <div><small>01</small><b>症状</b><span>できない場面</span></div>
          <div><small>02</small><b>原因</b><span>止まっている場所</span></div>
          <div><small>03</small><b>介入</b><span>変更したこと</span></div>
          <div><small>04</small><b>改善</b><span>起きた変化</span></div>
          <div><small>05</small><b>再現性</b><span>もう一度できるか</span></div>
        </div>
      </section>
      <section className="case-manifesto">
        <p>I don&apos;t teach soccer. <strong>I diagnose it.</strong></p>
        <span>教える前に、できない理由を見る。</span>
      </section>
      <CaseExplorer cases={soccerCases} locale="ja" />
      <DiagnosisPath locale="ja" />
    </main>
  )
}
