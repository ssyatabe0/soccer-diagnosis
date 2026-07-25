'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  categoryLabels,
  type CaseCategory,
  type Locale,
  type SoccerCase,
} from '@/data/cases'

const searchAliases: Record<string, string> = {
  'シュートが浮く': 'シュート 山なり 軌道',
  'トラップすると止まりすぎる': 'トラップ ファーストタッチ 前を向けない',
  '前を向けない': '前を向けない トラップ 判断',
  '足が遅い': '走り方 身体の使い方 加速',
  '1対1で抜けない': '1対1 抜けない ドリブル',
  'ボールを奪えない': '守備 判断 身体の使い方',
  'ロングキックが飛ばない': 'ロングキック 飛ばない',
  'long kick has no distance': 'long kick distance',
  'cannot turn forward': 'first touch cannot face forward',
  'lose the ball immediately': 'loses ball immediately retention',
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[・／/、,。.!！?？\s]+/g, ' ')
    .trim()
}

function ageGroupKey(item: SoccerCase) {
  if (item.grade?.ja) return item.grade.ja
  return item.age ? `age:${item.age}` : null
}

function ageGroupLabel(item: SoccerCase, locale: Locale) {
  if (item.grade) return item.grade[locale]
  if (!item.age) return null
  return locale === 'ja' ? `${item.age}歳` : `${item.age} years`
}

function searchableText(item: SoccerCase, locale: Locale) {
  return normalize([
    item.title[locale],
    item.symptom[locale],
    item.complaint?.[locale],
    item.diagnosis?.[locale],
    item.treatment?.[locale],
    item.result?.[locale],
    item.grade?.[locale],
    item.age,
    item.position,
    item.tags[locale],
    ...item.category.map((category) => categoryLabels[category][locale]),
  ].filter(Boolean).join(' '))
}

function CaseCard({ item, locale, priority = false }: { item: SoccerCase; locale: Locale; priority?: boolean }) {
  const isJa = locale === 'ja'
  const href = `${isJa ? '/cases' : '/en/cases'}/${item.slug}`
  return (
    <article className="case-card">
      <Link href={href} className="case-thumb" aria-label={item.title[locale]}>
        {item.comparison_video ? (
          // YouTube thumbnails are the verified source image for these public cases.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://i.ytimg.com/vi/${item.comparison_video}/hqdefault.jpg`}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <span>{item.case_id}</span>
        )}
        <span className="case-video-badge">{isJa ? '改善動画' : 'VIDEO'}</span>
      </Link>
      <div className="case-card-body">
        <div className="case-card-meta">
          <span>{item.grade?.[locale] || (item.age ? `${item.age}${isJa ? '歳' : ' years'}` : isJa ? '年齢未入力' : 'Age not entered')}</span>
          {item.improvement_time && <b>{isJa ? '改善 ' : 'Change: '}{item.improvement_time[locale]}</b>}
        </div>
        <h3><Link href={href}>{item.title[locale]}</Link></h3>
        <p>{item.symptom[locale]}</p>
        <div className="case-card-tags">
          {item.category.slice(0, 2).map((category) => (
            <span key={category}>{categoryLabels[category][locale]}</span>
          ))}
        </div>
      </div>
    </article>
  )
}

export function CaseExplorer({ cases, locale }: { cases: SoccerCase[]; locale: Locale }) {
  const isJa = locale === 'ja'
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CaseCategory | 'all'>('all')
  const [grade, setGrade] = useState('all')

  const results = useMemo(() => {
    const normalizedQuery = normalize(query)
    const expanded = normalize(searchAliases[normalizedQuery] || query)
    const words = expanded.split(' ').filter(Boolean)
    return cases.filter((item) => {
      if (category !== 'all' && !item.category.includes(category)) return false
      if (grade !== 'all' && ageGroupKey(item) !== grade) return false
      if (!words.length) return true
      const haystack = searchableText(item, locale)
      return words.some((word) => haystack.includes(word))
    })
  }, [cases, category, grade, locale, query])

  const ageGroups = Array.from(
    new Map(
      cases
        .map((item) => {
          const key = ageGroupKey(item)
          const label = ageGroupLabel(item, locale)
          return key && label ? [key, label] : null
        })
        .filter((entry): entry is [string, string] => Boolean(entry)),
    ).entries(),
  )
  const fastest = cases.filter((item) => /秒|分|second|minute/.test(item.improvement_time?.[locale] || '')).slice().sort((a, b) => {
    const aValue = Number.parseInt(a.improvement_time?.ja || '999', 10)
    const bValue = Number.parseInt(b.improvement_time?.ja || '999', 10)
    return aValue - bValue
  }).slice(0, 4)
  const latest = cases.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4)
  const popular = cases.slice().sort((a, b) => a.featured_rank - b.featured_rank).slice(0, 4)

  function selectCategory(next: CaseCategory) {
    setCategory(next)
    document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <section className="case-search-panel" id="search">
        <div className="case-section-heading">
          <p className="case-eyebrow">{isJa ? 'SYMPTOM SEARCH' : 'SYMPTOM SEARCH'}</p>
          <h2>{isJa ? '症状を、そのまま入力してください。' : 'Describe the problem in your own words.'}</h2>
        </div>
        <div className="case-search-box">
          <label htmlFor="case-query">{isJa ? '症状・悩み・技術名' : 'Symptom, problem or skill'}</label>
          <div>
            <input
              id="case-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isJa ? '例：シュートが浮く、前を向けない' : 'e.g. my long kick has no distance'}
            />
            <span aria-hidden="true">↗</span>
          </div>
          <div className="case-suggestions">
            {(isJa
              ? ['シュートが浮く', 'トラップすると止まりすぎる', '前を向けない', '1対1で抜けない', 'ロングキックが飛ばない']
              : ['long kick has no distance', 'cannot turn forward', 'lose the ball immediately']
            ).map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => setQuery(suggestion)}>{suggestion}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="case-categories" id="categories">
        <div className="case-section-heading">
          <p className="case-eyebrow">CATEGORIES</p>
          <h2>{isJa ? 'カテゴリーから探す。' : 'Browse by category.'}</h2>
        </div>
        <div className="case-category-grid">
          {(Object.keys(categoryLabels) as CaseCategory[]).map((key, index) => {
            const count = cases.filter((item) => item.category.includes(key)).length
            return (
              <button type="button" key={key} onClick={() => selectCategory(key)} className={category === key ? 'active' : ''}>
                <small>{String(index + 1).padStart(2, '0')}</small>
                <b>{categoryLabels[key][locale]}</b>
                <span>{count} {isJa ? '症例' : count === 1 ? 'case' : 'cases'}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="case-results" id="search-results">
        <div className="case-results-head">
          <div>
            <p className="case-eyebrow">{isJa ? 'CASE INDEX' : 'CASE INDEX'}</p>
            <h2>{isJa ? '症例一覧' : 'All cases'} <span>{results.length}</span></h2>
          </div>
          <div className="case-filters">
            <select value={category} onChange={(event) => setCategory(event.target.value as CaseCategory | 'all')} aria-label={isJa ? 'カテゴリー' : 'Category'}>
              <option value="all">{isJa ? '全カテゴリー' : 'All categories'}</option>
              {(Object.keys(categoryLabels) as CaseCategory[]).map((key) => <option key={key} value={key}>{categoryLabels[key][locale]}</option>)}
            </select>
            <select value={grade} onChange={(event) => setGrade(event.target.value)} aria-label={isJa ? '年齢・学年' : 'Age or grade'}>
              <option value="all">{isJa ? '全年齢' : 'All ages'}</option>
              {ageGroups.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            {(query || category !== 'all' || grade !== 'all') && (
              <button type="button" onClick={() => { setQuery(''); setCategory('all'); setGrade('all') }}>
                {isJa ? '条件をリセット' : 'Reset'}
              </button>
            )}
          </div>
        </div>
        <div className="case-card-grid">
          {results.map((item, index) => <CaseCard key={item.case_id} item={item} locale={locale} priority={index < 2} />)}
        </div>
        {!results.length && (
          <div className="case-empty">
            <b>{isJa ? '一致する公開症例はまだありません。' : 'No published case matches yet.'}</b>
            <p>{isJa ? '検索語を短くするか、カテゴリーをリセットしてください。未公開症例は順次追加します。' : 'Try a shorter phrase or reset the category. More verified cases will be added.'}</p>
          </div>
        )}
      </section>

      <section className="case-curation">
        <div className="case-curation-block">
          <div className="case-section-heading"><p className="case-eyebrow">LATEST</p><h2>{isJa ? '最新症例' : 'Latest cases'}</h2></div>
          <div className="case-mini-grid">{latest.map((item) => <CaseCard key={item.case_id} item={item} locale={locale} />)}</div>
        </div>
        <div className="case-curation-block">
          <div className="case-section-heading"><p className="case-eyebrow">FAST CHANGE</p><h2>{isJa ? '改善までが短かった症例' : 'Fastest recorded changes'}</h2></div>
          <div className="case-mini-grid">{fastest.map((item) => <CaseCard key={item.case_id} item={item} locale={locale} />)}</div>
        </div>
        <div className="case-curation-block">
          <div className="case-section-heading">
            <p className="case-eyebrow">FEATURED</p>
            <h2>{isJa ? '人気症例' : 'Popular cases'}</h2>
            <small>{isJa ? 'β版の注目症例枠。閲覧数ランキングは本公開後に切り替えます。' : 'Beta editorial picks. This will switch to view-based ranking after launch.'}</small>
          </div>
          <div className="case-mini-grid">{popular.map((item) => <CaseCard key={item.case_id} item={item} locale={locale} />)}</div>
        </div>
        <div className="case-age-block">
          <div className="case-section-heading"><p className="case-eyebrow">BY AGE</p><h2>{isJa ? '年齢別症例' : 'Browse by age'}</h2></div>
          <div>
            {ageGroups.map(([key, label]) => (
              <button type="button" key={key} onClick={() => { setGrade(key); document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' }) }}>
                <b>{label}</b><span>{cases.filter((entry) => ageGroupKey(entry) === key).length}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
