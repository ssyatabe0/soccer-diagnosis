import Link from 'next/link'
import { categoryLabels, type Locale, type SoccerCase } from '@/data/cases'
import { DiagnosisPath } from './CaseShell'

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="case-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function CaseDetail({
  item,
  related,
  locale,
  caseNumber,
}: {
  item: SoccerCase
  related: SoccerCase[]
  locale: Locale
  caseNumber: number
}) {
  const isJa = locale === 'ja'
  const base = isJa ? '/cases' : '/en/cases'

  return (
    <main className="case-detail-main">
      <nav className="case-breadcrumb" aria-label={isJa ? 'パンくず' : 'Breadcrumb'}>
        <Link href={base}>{isJa ? '症例データベース' : 'Case database'}</Link>
        <span>/</span>
        <span>{item.case_id}</span>
      </nav>

      <header className="case-detail-hero">
        <div>
          <p className="case-eyebrow">{isJa ? `症例 No.${String(caseNumber).padStart(3, '0')}` : `CASE No.${String(caseNumber).padStart(3, '0')}`}</p>
          <h1>{item.title[locale]}</h1>
          <p>{item.symptom[locale]}</p>
          <div className="case-detail-tags">
            {item.category.map((category) => <span key={category}>{categoryLabels[category][locale]}</span>)}
          </div>
        </div>
        <aside>
          <div><small>{isJa ? '年齢・学年' : 'AGE / GRADE'}</small><b>{item.grade?.[locale] || (item.age ? `${item.age}${isJa ? '歳' : ' years'}` : isJa ? '未入力' : 'Not entered')}</b></div>
          <div><small>{isJa ? 'ポジション' : 'POSITION'}</small><b>{item.position || (isJa ? '未入力' : 'Not entered')}</b></div>
          <div><small>{isJa ? '改善まで' : 'TIME TO CHANGE'}</small><b>{item.improvement_time?.[locale] || (isJa ? '動画で確認' : 'See video')}</b></div>
        </aside>
      </header>

      <section className="case-comparison">
        <div className="case-section-heading">
          <p className="case-eyebrow">BEFORE / AFTER</p>
          <h2>{isJa ? '比較動画' : 'Comparison video'}</h2>
          <p>{isJa ? '分割したBEFORE / AFTERクリップは未登録です。公開済みの比較動画をそのまま表示しています。' : 'Separate before and after clips are not registered yet. The verified public comparison video is shown as published.'}</p>
        </div>
        {item.comparison_video ? (
          <div className="case-video-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${item.comparison_video}`}
              title={item.title[locale]}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="case-video-empty">{isJa ? '動画未入力' : 'Video not entered'}</div>
        )}
      </section>

      <section className="case-chart">
        <div className="case-section-heading">
          <p className="case-eyebrow">CLINICAL RECORD</p>
          <h2>{isJa ? '症状 → 原因 → 介入 → 変化' : 'Symptom → Cause → Intervention → Change'}</h2>
          <p>{isJa ? '元データで確認できない項目は表示していません。' : 'Fields not supported by the source record are hidden.'}</p>
        </div>
        <dl>
          <Field label={isJa ? '症状' : 'Symptom'} value={item.symptom[locale]} />
          <Field label={isJa ? '本人・保護者の悩み' : 'Player / parent concern'} value={item.complaint?.[locale]} />
          <Field label={isJa ? '診断' : 'Diagnosis'} value={item.diagnosis?.[locale]} />
          <Field label={isJa ? '処方' : 'Intervention'} value={item.treatment?.[locale]} />
          <Field label={isJa ? '変化' : 'Change'} value={item.result?.[locale]} />
          <Field label={isJa ? '再現性' : 'Repeatability'} value={item.reproducibility?.[locale]} />
          <Field label={isJa ? '谷田部コメント' : 'Yatabe note'} value={item.comment?.[locale]} />
        </dl>
        {(!item.diagnosis || !item.treatment) && (
          <div className="case-source-note">
            <b>{isJa ? '未入力項目について' : 'About missing fields'}</b>
            <p>{isJa ? '診断・処方の具体的内容が元データで確認できないため、β版では創作せず非表示にしています。' : 'The source record does not contain a verified diagnosis or intervention, so the beta does not invent one.'}</p>
          </div>
        )}
      </section>

      <section className="case-evidence">
        <div>
          <small>{isJa ? '登録日' : 'CREATED'}</small>
          <b>{new Intl.DateTimeFormat(isJa ? 'ja-JP' : 'en-US', { dateStyle: 'medium', timeZone: 'Asia/Tokyo' }).format(new Date(item.created_at))}</b>
        </div>
        <div>
          <small>{isJa ? '更新日' : 'UPDATED'}</small>
          <b>{new Intl.DateTimeFormat(isJa ? 'ja-JP' : 'en-US', { dateStyle: 'medium', timeZone: 'Asia/Tokyo' }).format(new Date(item.updated_at))}</b>
        </div>
        <a href={item.source_url} target="_blank" rel="noreferrer">
          <small>{isJa ? '出典' : 'SOURCE'}</small>
          <b>{isJa ? '元の公開記録を確認 ↗' : 'Open the public source ↗'}</b>
        </a>
      </section>

      <section className="case-related">
        <div className="case-section-heading"><p className="case-eyebrow">RELATED CASES</p><h2>{isJa ? '関連症例' : 'Related cases'}</h2></div>
        <div>
          {related.map((entry) => (
            <Link href={`${base}/${entry.slug}`} key={entry.case_id}>
              <small>{entry.case_id}</small>
              <b>{entry.title[locale]}</b>
              <span>{entry.grade?.[locale] || (entry.age ? `${entry.age}${isJa ? '歳' : ' years'}` : isJa ? '年齢未入力' : 'Age not entered')} · {entry.improvement_time?.[locale] || (isJa ? '動画で確認' : 'See video')}</span>
            </Link>
          ))}
        </div>
      </section>

      <DiagnosisPath locale={locale} />
    </main>
  )
}
