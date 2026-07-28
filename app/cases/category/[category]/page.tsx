import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CaseSeoLanding } from '@/components/cases/CaseSeoLanding'
import { categoryLabels, type CaseCategory } from '@/data/cases'
import { getPublicCases } from '@/lib/cases/public-cases'

type Props = { params: Promise<{ category: string }> }
const baseUrl = 'https://soccer-diagnosis.vercel.app'
const categories = Object.keys(categoryLabels) as CaseCategory[]

function asCategory(value: string): CaseCategory | null {
  return categories.includes(value as CaseCategory) ? value as CaseCategory : null
}

export function generateStaticParams() {
  return categories.map((category) => ({ category }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: rawCategory } = await params
  const category = asCategory(rawCategory)
  if (!category) return {}
  const label = categoryLabels[category].ja
  const canonical = `${baseUrl}/cases/category/${category}`
  return {
    title: `サッカーの${label}に関する改善症例｜症例データベース`,
    description: `サッカーの${label}に関する実在の改善症例を、年齢・症状・診断・処方・改善動画から探せます。確認できない情報は創作せず非表示にしています。`,
    alternates: { canonical },
    openGraph: {
      title: `サッカーの${label}に関する改善症例`,
      description: `${label}の悩みを、練習メニューではなく実際の改善症例から探せます。`,
      url: canonical,
      type: 'website',
      images: ['/cases/og.png'],
    },
  }
}

export default async function CaseCategoryPage({ params }: Props) {
  const { category: rawCategory } = await params
  const category = asCategory(rawCategory)
  if (!category) notFound()
  const label = categoryLabels[category].ja
  const publicCases = await getPublicCases()
  const cases = publicCases.filter((item) => item.category.includes(category))
  const title = `サッカーの${label}に関する改善症例`
  const description = `${label}の悩みを、実際のレッスンで起きた症状・原因・介入・変化の記録から探せます。`
  const canonical = `${baseUrl}/cases/category/${category}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: title,
        description,
        url: canonical,
        inLanguage: 'ja',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: cases.length,
          itemListElement: cases.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title.ja,
            url: `${baseUrl}/cases/${item.slug}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '症例データベース', item: 'https://soccer-kateikyousi.com/cases/' },
          { '@type': 'ListItem', position: 2, name: label, item: canonical },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CaseSeoLanding
        title={title}
        description={description}
        intro={`同じ${label}の悩みでも、年齢、身体の使い方、相手との関係、前後のプレーによって原因は異なります。このページでは、公開記録で確認できる症例だけを一覧化しています。`}
        queries={[`サッカー ${label} できない`, `サッカー ${label} 改善`, `${label} 原因`, `${label} 個人レッスン`]}
        cases={cases}
      />
    </>
  )
}
