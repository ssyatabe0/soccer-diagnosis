import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseDetail } from '@/components/cases/CaseDetail'
import { getCaseBySlug, getRelatedCases, soccerCases } from '@/data/cases'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return soccerCases.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = getCaseBySlug(slug)
  if (!item) return {}
  const canonical = `https://soccer-diagnosis.vercel.app/cases/${item.slug}`
  return {
    title: `${item.title.ja}｜症例 ${item.case_id}`,
    description: `${item.grade?.ja || (item.age ? `${item.age}歳` : '年齢未入力')}。症状「${item.symptom.ja}」の改善動画と確認済み症例記録。`,
    alternates: {
      canonical,
      languages: {
        ja: canonical,
        en: `https://soccer-diagnosis.vercel.app/en/cases/${item.slug}`,
      },
    },
    openGraph: {
      title: item.title.ja,
      description: item.symptom.ja,
      url: canonical,
      type: 'article',
      images: item.comparison_video ? [`https://i.ytimg.com/vi/${item.comparison_video}/maxresdefault.jpg`] : undefined,
    },
  }
}

export default async function CasePage({ params }: Props) {
  const { slug } = await params
  const item = getCaseBySlug(slug)
  if (!item) notFound()
  const index = soccerCases.findIndex((entry) => entry.case_id === item.case_id)
  const canonical = `https://soccer-diagnosis.vercel.app/cases/${item.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.title.ja,
    description: item.symptom.ja,
    url: canonical,
    inLanguage: 'ja',
    datePublished: item.created_at,
    dateModified: item.updated_at,
    author: { '@type': 'Person', name: '谷田部真之助' },
    publisher: { '@type': 'Organization', name: 'サッカー技術の病院' },
    about: item.category.map((category) => ({ '@type': 'Thing', name: category })),
    video: item.comparison_video ? {
      '@type': 'VideoObject',
      name: item.title.ja,
      description: item.symptom.ja,
      thumbnailUrl: `https://i.ytimg.com/vi/${item.comparison_video}/maxresdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${item.comparison_video}`,
      uploadDate: item.created_at,
    } : undefined,
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CaseDetail item={item} related={getRelatedCases(item)} locale="ja" caseNumber={index + 1} />
    </>
  )
}
