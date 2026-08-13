import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { diagnosticPatterns, getDiagnosticPattern } from '@/data/diagnostic-patterns'
import styles from './pattern.module.css'

type Props = { params: Promise<{ slug: string }> }

const baseUrl = 'https://soccer-diagnosis.vercel.app'

export function generateStaticParams() {
  return diagnosticPatterns.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pattern = getDiagnosticPattern((await params).slug)
  if (!pattern) return {}
  const canonical = `${baseUrl}/cases/diagnostic-patterns/${pattern.slug}`
  return {
    title: `${pattern.title.ja}｜谷田部の診断ロジック No.001`,
    description: '症状から観察ポイント、原因候補、処方、実症例、再現性、次の判断までを一つの診断パターンとして構造化した実例です。',
    alternates: { canonical },
    openGraph: {
      title: `${pattern.title.ja}｜谷田部の診断ロジック`,
      description: '症例紹介ではなく、谷田部が何を見て、どう原因を判断し、何を変えたかを再利用できる形で公開。',
      url: canonical,
      type: 'article',
      images: [`https://i.ytimg.com/vi/${pattern.media[0].youtube_id}/hqdefault.jpg`],
    },
  }
}

function Status({ review = false }: { review?: boolean }) {
  return <span className={review ? styles.review : styles.verified}>{review ? '谷田部確認待ち' : '公開記録で確認済み'}</span>
}

export default async function DiagnosticPatternPage({ params }: Props) {
  const pattern = getDiagnosticPattern((await params).slug)
  if (!pattern) notFound()
  const apiUrl = `/api/diagnostic-patterns/${pattern.slug}`
  const video = pattern.media[0]
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: pattern.title.ja,
    description: pattern.symptom.statement.ja,
    url: `${baseUrl}/cases/diagnostic-patterns/${pattern.slug}`,
    inLanguage: 'ja',
    author: { '@type': 'Person', name: '谷田部真之助' },
    about: pattern.cause_groups.map((cause) => ({ '@type': 'Thing', name: cause.label.ja })),
    citation: pattern.sources.map((source) => source.url),
  }

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <header className={styles.hero}>
        <div className={styles.heroMeta}>
          <span>DIAGNOSTIC LOGIC / {pattern.pattern_id}</span>
          <span>VERSION {pattern.version}</span>
        </div>
        <p className={styles.kicker}>症例を並べるのではなく、判断を残す。</p>
        <h1>{pattern.title.ja}</h1>
        <p className={styles.lead}>
          16歳・高校生・FW / WGの実症例から、谷田部が見た項目、確認できた原因、変えた内容、起きた変化を一つの再利用可能な診断パターンにしました。
        </p>
        <div className={styles.truthBar}>
          <div><b>確定</b><span>症状・原因群・処方・変化・実戦再現</span></div>
          <div><b>未確定</b><span>切り分け順・確認テスト・不改善時の次手</span></div>
        </div>
      </header>

      <nav className={styles.jumpNav} aria-label="診断ロジック内メニュー">
        <a href="#symptom">01 症状</a>
        <a href="#observe">02 観察</a>
        <a href="#cause">03 原因</a>
        <a href="#discriminate">04 切り分け</a>
        <a href="#intervention">05 処方</a>
        <a href="#evidence">06 実症例</a>
        <a href="#fallback">07 次判断</a>
      </nav>

      <section className={styles.flow}>
        <article id="symptom" className={styles.block}>
          <div className={styles.number}>01</div>
          <div className={styles.content}>
            <div className={styles.heading}><div><p>SYMPTOM</p><h2>症状</h2></div><Status /></div>
            <p className={styles.statement}>{pattern.symptom.statement.ja}</p>
            <div className={styles.factGrid}>
              {pattern.symptom.observed_facts.map((item) => <div key={item.id}><small>{item.id}</small><p>{item.fact.ja}</p></div>)}
            </div>
          </div>
        </article>

        <article id="observe" className={styles.block}>
          <div className={styles.number}>02</div>
          <div className={styles.content}>
            <div className={styles.heading}><div><p>OBSERVATION POINTS</p><h2>何を見るか</h2></div><Status /></div>
            <div className={styles.cardGrid}>
              {pattern.observation_points.map((item) => (
                <div className={styles.card} key={item.id}>
                  <small>{item.id}</small><h3>{item.label.ja}</h3><p>{item.what_to_observe.ja}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article id="cause" className={styles.block}>
          <div className={styles.number}>03</div>
          <div className={styles.content}>
            <div className={styles.heading}><div><p>CAUSE GROUPS</p><h2>確認された原因群</h2></div><Status /></div>
            <p className={styles.note}>3つは公開記録にある原因です。ただし、主原因・副次原因の順位はまだ付けていません。</p>
            <div className={styles.causeList}>
              {pattern.cause_groups.map((cause, index) => (
                <div key={cause.id}><span>0{index + 1}</span><div><h3>{cause.label.ja}</h3><p>{cause.documented_finding.ja}</p></div></div>
              ))}
            </div>
          </div>
        </article>

        <article id="discriminate" className={`${styles.block} ${styles.pendingBlock}`}>
          <div className={styles.number}>04</div>
          <div className={styles.content}>
            <div className={styles.heading}><div><p>DISCRIMINATION</p><h2>どう切り分けたか</h2></div><Status review /></div>
            <p className={styles.statementSmall}>{pattern.discrimination.missing.ja}</p>
            <div className={styles.questionBox}>
              <b>谷田部に確認して埋める質問</b>
              <ol>{pattern.discrimination.review_questions.map((item) => <li key={item.ja}>{item.ja}</li>)}</ol>
            </div>
          </div>
        </article>

        <article id="intervention" className={styles.block}>
          <div className={styles.number}>05</div>
          <div className={styles.content}>
            <div className={styles.heading}><div><p>INTERVENTION</p><h2>何を変えたか</h2></div><Status /></div>
            <div className={styles.interventions}>
              {pattern.interventions.map((item) => (
                <div key={item.id}><small>{item.id} → {item.target_cause_ids.join(' / ')}</small><p>{item.change.ja}</p></div>
              ))}
            </div>
          </div>
        </article>

        <article id="evidence" className={styles.block}>
          <div className={styles.number}>06</div>
          <div className={styles.content}>
            <div className={styles.heading}><div><p>EVIDENCE & REPRODUCIBILITY</p><h2>何が変わり、どこで再現したか</h2></div><Status /></div>
            <div className={styles.evidenceGrid}>
              <div>
                <ul className={styles.changeList}>{pattern.improvement.changes.map((item) => <li key={item.ja}>{item.ja}</li>)}</ul>
                <div className={styles.repro}><small>REPRODUCIBILITY</small><p>{pattern.improvement.reproducibility.ja}</p></div>
              </div>
              <div className={styles.videoWrap}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`}
                  title="関連・比較動画"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <p><b>関連・比較動画</b> — {video.verification_note.ja}</p>
              </div>
            </div>
            <div className={styles.sourceLinks}>
              <Link href="/cases/mls-next-forward-receiving-turning">症例 CASE-0018を見る →</Link>
              <a href={pattern.sources[0].url} target="_blank" rel="noreferrer">公式サイトの原資料を見る ↗</a>
            </div>
          </div>
        </article>

        <article id="fallback" className={`${styles.block} ${styles.pendingBlock}`}>
          <div className={styles.number}>07</div>
          <div className={styles.content}>
            <div className={styles.heading}><div><p>NEXT JUDGMENT</p><h2>改善しなかった場合の次判断</h2></div><Status review /></div>
            <p className={styles.statementSmall}>{pattern.fallback_logic.missing.ja}</p>
            <div className={styles.questionBox}>
              <b>次の動画カルテで必ず残す項目</b>
              <ol>{pattern.fallback_logic.review_questions.map((item) => <li key={item.ja}>{item.ja}</li>)}</ol>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.machineSection}>
        <div>
          <p className={styles.kicker}>MACHINE READABLE</p>
          <h2>この画面と同じ内容を、AIが読める。</h2>
          <p>画面専用の文章ではなく、症状・観察・原因・切り分け・処方・証拠・次判断をIDで接続しています。今後の動画解析は、この型へ自動追加できます。</p>
        </div>
        <a href={apiUrl} target="_blank" rel="noreferrer">構造化JSONを開く <span>↗</span></a>
      </section>
      <section className={styles.diagnosisCta}>
        <div>
          <p className={styles.kicker}>APPLY THIS LOGIC TO YOUR VIDEO</p>
          <h2>同じ症状でも、原因は同じとは限りません。</h2>
          <p>あなたの動画から観察事実を先に抜き出し、原因候補・根拠・確認テスト・近い症例まで並べます。声かけ生成ではなく、原因を切り分ける入口です。</p>
        </div>
        <Link href="/cause-diagnosis?utm_source=diagnostic_pattern&utm_medium=internal_support&utm_campaign=p013_diagnostic_logic&utm_content=OPS_ECOSYS_001">
          自分の動画で原因候補を出す <span>→</span>
        </Link>
      </section>
    </main>
  )
}
