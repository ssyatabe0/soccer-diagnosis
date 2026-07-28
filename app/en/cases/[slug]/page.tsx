import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseDetail } from '@/components/cases/CaseDetail'
import { getCanonicalCaseUrl, getCaseBySlug, getRelatedCases, soccerCases } from '@/data/cases'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return soccerCases.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = getCaseBySlug(slug)
  if (!item) return {}
  const canonical = `https://soccer-diagnosis.vercel.app/en/cases/${item.slug}`
  return {
    title: `${item.title.en} | Case ${item.case_id}`,
    description: `${item.grade?.en || (item.age ? `Age ${item.age}` : 'Age not entered')}. A verified case record for: ${item.symptom.en}`,
    alternates: {
      canonical,
      languages: {
        ja: getCanonicalCaseUrl(item),
        en: canonical,
      },
    },
    openGraph: {
      title: item.title.en,
      description: item.symptom.en,
      url: canonical,
      type: 'article',
      images: item.comparison_video ? [`https://i.ytimg.com/vi/${item.comparison_video}/maxresdefault.jpg`] : undefined,
    },
  }
}

export default async function EnglishCasePage({ params }: Props) {
  const { slug } = await params
  const item = getCaseBySlug(slug)
  if (!item) notFound()
  const index = soccerCases.findIndex((entry) => entry.case_id === item.case_id)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.title.en,
    description: item.symptom.en,
    url: `https://soccer-diagnosis.vercel.app/en/cases/${item.slug}`,
    inLanguage: 'en',
    datePublished: item.created_at,
    dateModified: item.updated_at,
    author: { '@type': 'Person', name: 'Shinnosuke Yatabe' },
    publisher: { '@type': 'Organization', name: 'Soccer Skills Hospital' },
  }
  return (
    <div lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CaseDetail item={item} related={getRelatedCases(item)} locale="en" caseNumber={index + 1} />
    </div>
  )
}
