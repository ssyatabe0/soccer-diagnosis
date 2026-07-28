import Link from 'next/link'
import type { SoccerCase } from '@/data/cases'
import { caseTopics } from '@/data/case-topics'
import { DiagnosisPath } from './CaseShell'

function RecordField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}

export function CaseSeoLanding({
  title,
  description,
  intro,
  queries,
  cases,
  currentTopic,
}: {
  title: string
  description: string
  intro: string
  queries: string[]
  cases: SoccerCase[]
  currentTopic?: string
}) {
  return (
    <main className="case-seo-landing">
      <header className="case-seo-hero">
        <p className="case-eyebrow">SYMPTOM CASE GUIDE</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <section className="case-seo-body">
        <ul className="case-seo-intents" aria-label="関連する検索語">
          {queries.map((query) => <li key={query}>{query}</li>)}
        </ul>
        <p className="case-seo-intro">{intro}</p>
        <div className="case-seo-cases">
          {cases.map((item) => (
            <article className="case-seo-case" key={item.case_id}>
              <Link className="case-seo-case-media" href={`/cases/${item.slug}`} aria-label={item.title.ja}>
                {item.comparison_video ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://i.ytimg.com/vi/${item.comparison_video}/hqdefault.jpg`} alt={`${item.title.ja}の改善動画`} />
                ) : <span>{item.case_id}</span>}
              </Link>
              <div className="case-seo-case-copy">
                <small>{item.case_id} · {item.grade?.ja || (item.age ? `${item.age}歳` : '年齢未入力')}</small>
                <h2><Link href={`/cases/${item.slug}`}>{item.title.ja}</Link></h2>
                <p>{item.symptom.ja}</p>
                <dl className="case-seo-record">
                  <RecordField label="本人の悩み" value={item.complaint?.ja} />
                  <RecordField label="診断" value={item.diagnosis?.ja} />
                  <RecordField label="処方" value={item.treatment?.ja} />
                  <RecordField label="変化" value={item.result?.ja} />
                </dl>
                <Link className="case-seo-case-link" href={`/cases/${item.slug}`}>動画と症例カルテを見る →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="case-seo-related">
        <p className="case-eyebrow">RELATED PROBLEMS</p>
        <h2>関連する悩みから探す</h2>
        <div>
          {caseTopics.filter((topic) => topic.slug !== currentTopic).map((topic) => (
            <Link href={`/cases/topics/${topic.slug}`} key={topic.slug}>{topic.shortTitle}</Link>
          ))}
        </div>
      </section>
      <DiagnosisPath locale="ja" />
    </main>
  )
}
