import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'node:crypto'
import { getCanonicalCaseUrl, type SoccerCase } from '@/data/cases'
import { getServiceClient } from '@/lib/ai-secretary/api'
import { getPublicCases } from '@/lib/cases/public-cases'
import type {
  CauseDiagnosisFrame,
  CauseDiagnosisHypothesis,
  CauseDiagnosisObservation,
  CauseDiagnosisResult,
} from '@/lib/cause-diagnosis/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FRAMES = 8
const MAX_BODY_BYTES = 4_000_000
const OPENAI_MODEL = 'gpt-5.4'
const GATEWAY_MODEL = 'openai/gpt-5.4'

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'primary_issue',
    'summary',
    'observations',
    'cause_hypotheses',
    'verification_order',
    'related_case_ids',
    'limitations',
  ],
  properties: {
    primary_issue: { type: 'string' },
    summary: { type: 'string' },
    observations: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'timestamp_seconds', 'fact', 'visibility'],
        properties: {
          id: { type: 'string' },
          timestamp_seconds: { type: 'number' },
          fact: { type: 'string' },
          visibility: { type: 'string', enum: ['visible', 'unclear'] },
        },
      },
    },
    cause_hypotheses: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'rank',
          'cause',
          'evidence_ids',
          'reasoning',
          'confidence',
          'verification_test',
          'if_confirmed_intervention',
        ],
        properties: {
          rank: { type: 'integer', minimum: 1, maximum: 3 },
          cause: { type: 'string' },
          evidence_ids: { type: 'array', items: { type: 'string' } },
          reasoning: { type: 'string' },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          verification_test: { type: 'string' },
          if_confirmed_intervention: { type: 'string' },
        },
      },
    },
    verification_order: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: { type: 'string' },
    },
    related_case_ids: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string' },
    },
    limitations: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: { type: 'string' },
    },
  },
} as const

function compactCase(item: SoccerCase) {
  return {
    case_id: item.case_id,
    title: item.title.ja,
    symptom: item.symptom.ja,
    diagnosis: item.diagnosis?.ja || null,
    treatment: item.treatment?.ja || null,
    result: item.result?.ja || null,
    categories: item.category,
    tags: item.tags.ja,
  }
}

function validateFrames(value: unknown): CauseDiagnosisFrame[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > MAX_FRAMES) return null
  const frames: CauseDiagnosisFrame[] = []
  for (const frame of value) {
    if (
      !frame ||
      typeof frame.timestamp_seconds !== 'number' ||
      !Number.isFinite(frame.timestamp_seconds) ||
      typeof frame.image_data_url !== 'string' ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(frame.image_data_url)
    ) return null
    frames.push({
      timestamp_seconds: Math.max(0, Math.round(frame.timestamp_seconds * 10) / 10),
      image_data_url: frame.image_data_url,
    })
  }
  return frames
}

function outputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text
  const output = Array.isArray(payload.output) ? payload.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : []
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
        return (part as { text: string }).text
      }
    }
  }
  return ''
}

function relatedCases(ids: unknown, cases: SoccerCase[]) {
  const allowed = new Map(cases.map((item) => [item.case_id, item]))
  const unique = Array.isArray(ids)
    ? [...new Set(ids.filter((id): id is string => typeof id === 'string'))]
    : []
  return unique.flatMap((id) => {
    const item = allowed.get(id)
    if (!item) return []
    return [{
      case_id: item.case_id,
      title: item.title.ja,
      symptom: item.symptom.ja,
      improvement_time: item.improvement_time?.ja || null,
      url: getCanonicalCaseUrl(item),
    }]
  }).slice(0, 3)
}

function normalizeObservations(value: unknown): CauseDiagnosisObservation[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Partial<CauseDiagnosisObservation>
    if (
      typeof row.id !== 'string' ||
      typeof row.timestamp_seconds !== 'number' ||
      typeof row.fact !== 'string' ||
      (row.visibility !== 'visible' && row.visibility !== 'unclear')
    ) return []
    return [{
      id: row.id,
      timestamp_seconds: row.timestamp_seconds,
      fact: row.fact,
      visibility: row.visibility,
    }]
  })
}

function normalizeHypotheses(value: unknown, observationIds: Set<string>): CauseDiagnosisHypothesis[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Partial<CauseDiagnosisHypothesis>
    if (
      typeof row.rank !== 'number' ||
      typeof row.cause !== 'string' ||
      !Array.isArray(row.evidence_ids) ||
      typeof row.reasoning !== 'string' ||
      typeof row.confidence !== 'number' ||
      typeof row.verification_test !== 'string' ||
      typeof row.if_confirmed_intervention !== 'string'
    ) return []
    return [{
      rank: row.rank,
      cause: row.cause,
      evidence_ids: row.evidence_ids.filter((id): id is string => typeof id === 'string' && observationIds.has(id)),
      reasoning: row.reasoning,
      confidence: Math.min(100, Math.max(0, Math.round(row.confidence))),
      verification_test: row.verification_test,
      if_confirmed_intervention: row.if_confirmed_intervention,
    }]
  }).sort((a, b) => a.rank - b.rank).slice(0, 3)
}

export async function POST(request: NextRequest) {
  const gatewayToken = process.env.AI_GATEWAY_API_KEY
    || process.env.VERCEL_OIDC_TOKEN
    || request.headers.get('x-vercel-oidc-token')
  const directOpenAiKey = process.env.OPENAI_API_KEY
  if (!gatewayToken && !directOpenAiKey) {
    return NextResponse.json(
      { error: 'ai_not_configured', message: 'AI原因診断は現在準備中です。管理者がAPI接続を完了すると利用できます。' },
      { status: 503 },
    )
  }

  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload_too_large', message: '抽出画像が大きすぎます。別の短い動画でお試しください。' }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json', message: '送信データを読み込めませんでした。' }, { status: 400 })
  }
  const frames = validateFrames(body.frames)
  if (!frames) {
    return NextResponse.json({ error: 'invalid_frames', message: '動画から3〜8枚の確認画像を取得できませんでした。' }, { status: 400 })
  }

  const symptom = typeof body.symptom === 'string' ? body.symptom.trim().slice(0, 500) : ''
  const context = typeof body.context === 'string' ? body.context.trim().slice(0, 800) : ''
  if (symptom.length < 3) {
    return NextResponse.json({ error: 'symptom_required', message: '困っているプレーを具体的に入力してください。' }, { status: 400 })
  }

  const cases = await getPublicCases()
  const catalog = cases.map(compactCase)
  const frameGuide = frames.map((frame, index) => `F${index + 1}=動画${frame.timestamp_seconds.toFixed(1)}秒`).join(', ')
  const prompt = [
    `相談された症状: ${symptom}`,
    context ? `選手・場面の補足: ${context}` : '選手・場面の補足: 未入力',
    `入力フレーム: ${frameGuide}`,
    '',
    '公開症例カタログ:',
    JSON.stringify(catalog),
    '',
    '上の映像フレームで直接観察できる事実と、そこから検証すべき技術的原因候補を分離してください。',
    '関連症例IDは公開症例カタログに存在するcase_idだけを選んでください。',
  ].join('\n')

  const imageContent = frames.map((frame) => ({
    type: 'input_image',
    image_url: frame.image_data_url,
    detail: 'high',
  }))

  const safetyHash = createHash('sha256')
    .update(`${request.headers.get('x-forwarded-for') || 'anonymous'}:cause-diagnosis`)
    .digest('hex')
    .slice(0, 64)

  const useGateway = Boolean(gatewayToken)
  const requestedModel = process.env.OPENAI_CAUSE_DIAGNOSIS_MODEL
    || (useGateway ? GATEWAY_MODEL : OPENAI_MODEL)
  const requestPayload = {
    model: requestedModel,
    reasoning: { effort: 'medium' },
    ...(!useGateway ? { safety_identifier: safetyHash } : {}),
    instructions: [
      'あなたはサッカー技術の原因診断補助AIです。性格診断や保護者向け声かけは行いません。',
      '症状、観察事実、原因候補、根拠、確認テスト、介入候補を明確に分離してください。',
      '静止フレームから見えない接触の強さ、痛み、呼吸、心理、ボール速度、前後の動作を断定しないでください。',
      '原因は確定診断ではなく検証順の候補です。根拠に使う観察IDを必ず示してください。',
      '観察IDはO1、O2のように付け、timestamp_secondsは最も近い入力フレームの時刻を使ってください。',
      '確認テストは1項目だけ変えて比較できる、短く安全なテストにしてください。',
      '医療・怪我の診断はせず、痛みや怪我が疑われる場合は専門家確認が必要とlimitationsに明記してください。',
      '日本語で簡潔に回答してください。',
    ].join('\n'),
    input: [{
      type: 'message',
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        ...imageContent,
      ],
    }],
    text: {
      format: {
        type: 'json_schema',
        name: 'soccer_cause_diagnosis',
        strict: true,
        schema: analysisSchema,
      },
    },
    max_output_tokens: 4000,
    ...(useGateway ? {
      providerOptions: {
        gateway: {
          models: [requestedModel, 'anthropic/claude-sonnet-4.6'],
        },
      },
    } : {}),
  }

  const response = await fetch(
    useGateway ? 'https://ai-gateway.vercel.sh/v1/responses' : 'https://api.openai.com/v1/responses',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gatewayToken || directOpenAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    },
  )
  const responseBody = await response.json() as Record<string, unknown>
  if (!response.ok) {
    console.error('[cause-diagnosis] AI provider error', response.status, responseBody)
    const providerError = responseBody.error
    const providerErrorType = providerError && typeof providerError === 'object'
      ? (providerError as { type?: unknown }).type
      : null
    if (providerErrorType === 'customer_verification_required') {
      return NextResponse.json(
        { error: 'ai_billing_required', message: 'AI接続の利用準備中です。公開テスト開始までお待ちください。' },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: 'analysis_failed', message: 'AI分析を完了できませんでした。時間をおいて再度お試しください。' },
      { status: 502 },
    )
  }

  const text = outputText(responseBody)
  if (!text) {
    return NextResponse.json({ error: 'empty_analysis', message: '分析結果を取得できませんでした。' }, { status: 502 })
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_analysis_json', message: '分析結果を読み込めませんでした。' }, { status: 502 })
  }
  const observations = normalizeObservations(parsed.observations)
  const hypotheses = normalizeHypotheses(parsed.cause_hypotheses, new Set(observations.map((item) => item.id)))
  if (!observations.length || !hypotheses.length) {
    return NextResponse.json({ error: 'invalid_analysis', message: '根拠を伴う分析結果を作成できませんでした。' }, { status: 502 })
  }

  const result: CauseDiagnosisResult = {
    analysis_id: randomUUID(),
    primary_issue: typeof parsed.primary_issue === 'string' ? parsed.primary_issue : symptom,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    observations,
    cause_hypotheses: hypotheses,
    verification_order: Array.isArray(parsed.verification_order)
      ? parsed.verification_order.filter((item): item is string => typeof item === 'string').slice(0, 3)
      : [],
    related_cases: relatedCases(parsed.related_case_ids, cases),
    limitations: Array.isArray(parsed.limitations)
      ? parsed.limitations.filter((item): item is string => typeof item === 'string').slice(0, 5)
      : [],
    reviewed_by_coach: false,
    model: typeof responseBody.model === 'string' ? responseBody.model : requestedModel,
    analyzed_at: new Date().toISOString(),
  }

  const supabase = getServiceClient()
  if (supabase) {
    const { error } = await supabase.from('ai_diagnoses').insert({
      source_type: 'video',
      source_id: result.analysis_id,
      source_text: [symptom, context].filter(Boolean).join('\n'),
      concern_type: result.primary_issue,
      cause_candidates: result.cause_hypotheses.map((item) => `${item.cause}（確信度${item.confidence}%）`),
      improvement_priorities: result.verification_order,
      recommended_service: 'private_lesson',
      next_step: result.cause_hypotheses[0]?.verification_test || '谷田部による動画確認',
      ai_summary: JSON.stringify({
        summary: result.summary,
        observations: result.observations,
        related_case_ids: result.related_cases.map((item) => item.case_id),
        limitations: result.limitations,
        reviewed_by_coach: false,
      }),
      status: 'draft',
    })
    if (error) console.error('[cause-diagnosis] result persistence failed', error.message)
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
