'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { track } from '@vercel/analytics'
import type {
  CauseDiagnosisFrame,
  CauseDiagnosisResult,
} from '@/lib/cause-diagnosis/types'
import styles from './CauseDiagnosisMvp.module.css'

const FRAME_COUNT = 8
const MAX_FILE_BYTES = 500 * 1024 * 1024

function formatTime(value: number) {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function waitForEvent(target: HTMLMediaElement, event: string) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('動画の読み込みに時間がかかっています。'))
    }, 15_000)
    const done = () => {
      cleanup()
      resolve()
    }
    const failed = () => {
      cleanup()
      reject(new Error('動画を読み込めませんでした。MP4・MOV・WebMをお試しください。'))
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      target.removeEventListener(event, done)
      target.removeEventListener('error', failed)
    }
    target.addEventListener(event, done, { once: true })
    target.addEventListener('error', failed, { once: true })
  })
}

async function extractFrames(file: File): Promise<CauseDiagnosisFrame[]> {
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.src = objectUrl

  try {
    if (video.readyState < 1) await waitForEvent(video, 'loadedmetadata')
    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('動画の長さを取得できませんでした。')

    const sourceWidth = video.videoWidth || 1280
    const sourceHeight = video.videoHeight || 720
    const scale = Math.min(1, 720 / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(2, Math.round(sourceWidth * scale))
    const height = Math.max(2, Math.round(sourceHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('動画フレームを取得できませんでした。')

    const count = duration < 2 ? 4 : FRAME_COUNT
    const timestamps = Array.from({ length: count }, (_, index) => {
      const ratio = 0.06 + (0.88 * index) / Math.max(1, count - 1)
      return Math.min(Math.max(0, duration - 0.05), duration * ratio)
    })
    const frames: CauseDiagnosisFrame[] = []
    for (const timestamp of timestamps) {
      video.currentTime = timestamp
      await waitForEvent(video, 'seeked')
      context.drawImage(video, 0, 0, width, height)
      frames.push({
        timestamp_seconds: Math.round(timestamp * 10) / 10,
        image_data_url: canvas.toDataURL('image/jpeg', 0.68),
      })
    }
    return frames
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function CauseDiagnosisMvp() {
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [symptom, setSymptom] = useState('')
  const [context, setContext] = useState('')
  const [consent, setConsent] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'analyzing' | 'done'>('idle')
  const [frames, setFrames] = useState<CauseDiagnosisFrame[]>([])
  const [result, setResult] = useState<CauseDiagnosisResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) {
      setVideoUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const observations = useMemo(
    () => new Map(result?.observations.map((item) => [item.id, item]) || []),
    [result],
  )

  function chooseFile(next: File | null) {
    setError('')
    setResult(null)
    setFrames([])
    if (!next) {
      setFile(null)
      return
    }
    if (!next.type.startsWith('video/')) {
      setError('動画ファイルを選択してください。')
      return
    }
    if (next.size > MAX_FILE_BYTES) {
      setError('500MB以下の動画を選択してください。動画自体はアップロードされません。')
      return
    }
    setFile(next)
    track('cause_video_selected', {
      file_type: next.type || 'unknown',
      size_mb: Math.round((next.size / 1024 / 1024) * 10) / 10,
    })
  }

  async function analyze() {
    if (!file || symptom.trim().length < 3 || !consent) return
    setError('')
    setResult(null)
    track('cause_diagnosis_started', {
      symptom_length: symptom.trim().length,
      has_context: context.trim().length > 0,
    })
    try {
      setPhase('extracting')
      const extracted = await extractFrames(file)
      setFrames(extracted)
      setPhase('analyzing')
      const response = await fetch('/api/cause-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom: symptom.trim(),
          context: context.trim(),
          frames: extracted,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || '分析を完了できませんでした。')
      setResult(payload)
      setPhase('done')
      track('cause_diagnosis_completed', {
        observation_count: payload.observations.length,
        hypothesis_count: payload.cause_hypotheses.length,
        related_case_count: payload.related_cases.length,
      })
      try {
        localStorage.setItem(`cause-diagnosis:${payload.analysis_id}`, JSON.stringify(payload))
      } catch {}
      window.setTimeout(() => document.getElementById('cause-result')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (caught) {
      track('cause_diagnosis_failed')
      setError(caught instanceof Error ? caught.message : '分析を完了できませんでした。')
      setPhase('idle')
    }
  }

  function downloadResult() {
    if (!result) return
    track('cause_diagnosis_json_saved')
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `soccer-cause-diagnosis-${result.analysis_id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const busy = phase === 'extracting' || phase === 'analyzing'

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <Link className={styles.brand} href="/cases">SOCCER CASE DATABASE</Link>
        <p className={styles.kicker}>AI CAUSE DIAGNOSIS · MVP</p>
        <h1>動画から、<br /><em>原因候補を絞る。</em></h1>
        <p className={styles.lead}>性格診断でも、声かけ生成でもありません。映像で見える事実を先に出し、原因候補を根拠と確認テスト付きで並べます。</p>
        <div className={styles.flow} aria-label="分析の流れ">
          <span>動画</span><b>→</b><span>観察事実</span><b>→</b><span>原因候補</span><b>→</b><span>確認テスト</span><b>→</b><span>関連症例</span>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.inputPanel}>
          <div className={styles.sectionHead}>
            <small>01 · VIDEO</small>
            <h2>改善したいプレーの動画</h2>
            <p>動画本体はサーバーへ保存しません。ブラウザ内で8枚の確認画像を抽出し、その画像だけを分析します。</p>
          </div>

          <label className={styles.dropZone}>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              onChange={(event) => chooseFile(event.target.files?.[0] || null)}
            />
            <span>{file ? '動画を変更' : '動画を選択'}</span>
            <b>{file ? file.name : 'MP4・MOV・WebM / 最大500MB'}</b>
            <small>{file ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : 'スマホ撮影の短い動画で構いません'}</small>
          </label>

          {videoUrl && <video className={styles.video} src={videoUrl} controls playsInline preload="metadata" />}

          <div className={styles.formGrid}>
            <label>
              <span>困っているプレー <b>必須</b></span>
              <textarea
                value={symptom}
                onChange={(event) => setSymptom(event.target.value)}
                maxLength={500}
                placeholder="例：前から来るボールをダイレクトで打つと、山なりになってしまう"
              />
            </label>
            <label>
              <span>選手・場面の補足</span>
              <textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                maxLength={800}
                placeholder="例：小学4年生、右利き。試合ではゴール前で起きる"
              />
            </label>
          </div>

          <label className={styles.consent}>
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>この動画を分析に利用する権限があり、確認画像がAI分析へ送信されることに同意します。</span>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.analyze}
            type="button"
            disabled={!file || symptom.trim().length < 3 || !consent || busy}
            onClick={analyze}
          >
            {phase === 'extracting' ? '動画から確認画像を抽出中…' : phase === 'analyzing' ? '原因候補と根拠を分析中…' : 'AI原因診断を開始'}
          </button>

          {frames.length > 0 && (
            <div className={styles.frames}>
              {frames.map((frame, index) => (
                <figure key={`${frame.timestamp_seconds}-${index}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={frame.image_data_url} alt={`確認フレーム ${index + 1}`} />
                  <figcaption>F{index + 1} · {formatTime(frame.timestamp_seconds)}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        {result && (
          <section className={styles.result} id="cause-result">
            <div className={styles.resultHeader}>
              <div>
                <small>02 · ANALYSIS RESULT</small>
                <h2>{result.primary_issue}</h2>
                <p>{result.summary}</p>
              </div>
              <div className={styles.reviewStatus}>
                <span>AI仮説</span>
                <b>谷田部未確認</b>
              </div>
            </div>

            <div className={styles.resultBlock}>
              <div className={styles.blockTitle}><small>OBSERVATION</small><h3>映像で確認できた事実</h3></div>
              <div className={styles.observations}>
                {result.observations.map((item) => (
                  <article key={item.id}>
                    <div><b>{item.id}</b><span>{formatTime(item.timestamp_seconds)}</span></div>
                    <p>{item.fact}</p>
                    {item.visibility === 'unclear' && <small>映像だけでは不明瞭</small>}
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.resultBlock}>
              <div className={styles.blockTitle}><small>CAUSE HYPOTHESES</small><h3>検証する原因候補</h3></div>
              <div className={styles.hypotheses}>
                {result.cause_hypotheses.map((item) => (
                  <article key={`${item.rank}-${item.cause}`}>
                    <header>
                      <span>候補 {item.rank}</span>
                      <b>確信度 {item.confidence}%</b>
                    </header>
                    <h4>{item.cause}</h4>
                    <p>{item.reasoning}</p>
                    <div className={styles.evidence}>
                      <small>根拠</small>
                      {item.evidence_ids.map((id) => {
                        const observation = observations.get(id)
                        return <span key={id}>{id}{observation ? ` · ${formatTime(observation.timestamp_seconds)}` : ''}</span>
                      })}
                    </div>
                    <dl>
                      <div><dt>確認テスト</dt><dd>{item.verification_test}</dd></div>
                      <div><dt>確認できた場合の介入</dt><dd>{item.if_confirmed_intervention}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.resultBlock}>
              <div className={styles.blockTitle}><small>VERIFY FIRST</small><h3>この順番で確認</h3></div>
              <ol className={styles.verify}>
                {result.verification_order.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>

            <div className={styles.resultBlock}>
              <div className={styles.blockTitle}><small>RELATED CASES</small><h3>近い公開症例</h3></div>
              {result.related_cases.length ? (
                <div className={styles.related}>
                  {result.related_cases.map((item) => (
                    <a
                      href={item.url}
                      key={item.case_id}
                      onClick={() => track('cause_related_case_open', { case_id: item.case_id })}
                    >
                      <small>{item.case_id}</small>
                      <h4>{item.title}</h4>
                      <p>{item.symptom}</p>
                      <span>{item.improvement_time ? `改善 ${item.improvement_time}` : '症例を見る'} →</span>
                    </a>
                  ))}
                </div>
              ) : <p className={styles.noRelated}>一致度の高い公開症例はまだありません。</p>}
            </div>

            <div className={styles.limitations}>
              <b>この結果の限界</b>
              <ul>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              <p>これは映像から作成した原因候補です。確定には、確認テストまたは谷田部による動画・対面確認が必要です。</p>
            </div>

            <div className={styles.resultActions}>
              <button type="button" onClick={downloadResult}>診断JSONを保存</button>
              <a
                href="https://soccer-kateikyousi.com/start/"
                onClick={() => track('cause_expert_cta_click')}
              >
                谷田部に原因確認を依頼
              </a>
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p><b>I don&apos;t teach soccer. I diagnose it.</b></p>
        <Link href="/cases">症例データベースへ戻る</Link>
      </footer>
    </div>
  )
}
