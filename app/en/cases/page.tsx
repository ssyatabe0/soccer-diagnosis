import type { Metadata } from 'next'
import { CaseExplorer } from '@/components/cases/CaseExplorer'
import { DiagnosisPath } from '@/components/cases/CaseShell'
import { soccerCases } from '@/data/cases'

const canonical = 'https://soccer-diagnosis.vercel.app/en/cases'

export const metadata: Metadata = {
  title: 'Soccer Case Database | Search by the Problem',
  description: 'A beta clinical-style database of real soccer development cases, organised by symptom, cause, intervention, change and repeatability.',
  alternates: {
    canonical,
    languages: {
      ja: 'https://soccer-diagnosis.vercel.app/cases',
      en: canonical,
    },
  },
  openGraph: {
    title: 'Find the soccer problem through real cases.',
    description: 'Start with why the skill breaks down, not with another drill.',
    url: canonical,
    type: 'website',
    images: [{ url: '/cases/og.png', width: 1200, height: 630, alt: 'Soccer Case Database beta' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/cases/og.png'],
  },
}

export default function EnglishCasesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Soccer Case Database',
    description: 'Real individual soccer training cases organised by symptom, cause, intervention, change and repeatability.',
    url: canonical,
    inLanguage: 'en',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: soccerCases.length,
      itemListElement: soccerCases.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${canonical}/${item.slug}`,
        name: item.title.en,
      })),
    },
  }

  return (
    <main className="case-home" lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <section className="case-hero">
        <div className="case-hero-copy">
          <p className="case-eyebrow">SOCCER CASE DATABASE / BETA</p>
          <h1>Find the problem<br /><em>through real cases.</em></h1>
          <p className="case-hero-lead">Start with why the skill breaks down,<br />not with another drill.</p>
          <p className="case-hero-proof">Built from 20,000+ individual coaching sessions. This beta publishes only cases supported by existing public records or verified video.</p>
          <a className="case-primary-cta" href="#search"><span>Search by symptom</span><b>↓</b></a>
        </div>
        <div className="case-hero-diagram" aria-label="Case data flow">
          <div><small>01</small><b>Symptom</b><span>Where play breaks down</span></div>
          <div><small>02</small><b>Cause</b><span>What is blocking the skill</span></div>
          <div><small>03</small><b>Intervention</b><span>What changed</span></div>
          <div><small>04</small><b>Result</b><span>What became different</span></div>
          <div><small>05</small><b>Repeatability</b><span>Can it happen again?</span></div>
        </div>
      </section>
      <section className="case-manifesto">
        <p>I don&apos;t teach soccer. <strong>I diagnose it.</strong></p>
        <span>Understand the cause before adding another drill.</span>
      </section>
      <CaseExplorer cases={soccerCases} locale="en" />
      <DiagnosisPath locale="en" />
    </main>
  )
}
