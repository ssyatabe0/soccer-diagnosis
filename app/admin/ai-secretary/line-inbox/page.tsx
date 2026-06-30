import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { CopyReplyButton, ManualMemoForm } from '@/components/ai-secretary/LineInboxActions'

type SearchParams = Record<string, string | string[] | undefined>

type LineInboxItem = {
  id: number
  account_key: string | null
  account_display_name: string | null
  account_service_area: string | null
  line_user_id: string | null
  line_display_name?: string | null
  body: string
  extracted_type: string | null
  intent: string | null
  ai_summary: string | null
  ai_reply_draft: string | null
  manual_memo: string | null
  service_category: string | null
  customer_status: string | null
  customer_id: string | null
  customer_full_name: string | null
  customer_parent_name: string | null
  customer_child_name: string | null
  customer_grade: string | null
  customer_region: string | null
  customer_team_name: string | null
  customer_master_status: string | null
  customer_service_type: string | null
  customer_candidates: Array<{
    user_id: string
    name: string | null
    email: string | null
    score: number
    confidence: string
    reasons: string[]
    profile?: {
      prefecture?: string | null
      type_name?: string | null
      lane?: string | null
      tags?: string[]
      conversion_status?: string | null
      created_at?: string | null
    }
  }> | null
  match_confidence: string | null
  match_reasons: string[] | null
  status: string
  occurred_at: string
  user_id: string | null
  name: string | null
  email: string | null
  prefecture: string | null
  type_name: string | null
  lane: string | null
  tags: string[] | null
  conversion_status: string | null
  staff_required: boolean | null
  selection_priority: boolean | null
}

type CustomerLineAccountRow = {
  account_key: string
  line_user_id: string
  display_name: string | null
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url.replace(/\/+$/, ''), key)
}

function valueOf(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] || fallback
  return value || fallback
}

async function getSearchParams(input: Promise<SearchParams> | SearchParams | undefined) {
  return input ? await Promise.resolve(input) : {}
}

async function loadInbox(status: string) {
  const supabase = getServiceClient()
  if (!supabase) return { items: [] as LineInboxItem[], error: 'supabase_not_configured' }

  const { data, error } = await supabase
    .from('ai_secretary_line_inbox')
    .select('*')
    .eq('status', status)
    .order('occurred_at', { ascending: false })
    .limit(50)

  if (error) return { items: [] as LineInboxItem[], error: error.message }
  const rows = (data || []) as LineInboxItem[]
  const accountKeys = [...new Set(rows.map((item) => item.account_key).filter(Boolean))] as string[]
  const lineUserIds = [...new Set(rows.map((item) => item.line_user_id).filter(Boolean))] as string[]
  const displayNameMap = new Map<string, string>()
  if (accountKeys.length > 0 && lineUserIds.length > 0) {
    const { data: lineAccounts } = await supabase
      .from('customer_line_accounts')
      .select('account_key,line_user_id,display_name')
      .in('account_key', accountKeys)
      .in('line_user_id', lineUserIds)
    for (const account of (lineAccounts || []) as CustomerLineAccountRow[]) {
      if (account.display_name) displayNameMap.set(`${account.account_key}:${account.line_user_id}`, account.display_name)
    }
  }
  const items = rows.map((item) => ({
    ...item,
    line_display_name: item.account_key && item.line_user_id ? displayNameMap.get(`${item.account_key}:${item.line_user_id}`) || null : null,
  }))
  return { items, error: null }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  if (status === 'needs_review') return '未対応'
  if (status === 'matched') return '照合済み'
  if (status === 'handled') return '対応済み'
  return status
}

function intentLabel(intent: string | null) {
  if (intent === 'booking') return '予約・日程'
  if (intent === 'inquiry') return '問い合わせ'
  if (intent === 'ticket_check') return '回数券・期限'
  if (intent === 'positive_feedback') return '成果・感想'
  if (intent === 'diagnosis_result_followup') return '診断フォロー'
  if (intent === 'line_message') return '通常LINE'
  return intent || '未分類'
}

function confidenceClass(confidence: string | null) {
  if (confidence === 'high') return 'bg-green-100 text-green-700'
  if (confidence === 'medium') return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

export default async function AiSecretaryLineInboxPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const params = await getSearchParams(searchParams)
  const token = valueOf(params.token)
  const status = valueOf(params.status, 'needs_review')
  const requiredToken = process.env.AI_SECRETARY_READ_TOKEN

  if (!requiredToken) {
    return <SetupMessage title="AI秘書トークン未設定" message="Vercelに AI_SECRETARY_READ_TOKEN を設定すると、この画面を安全に開けます。" />
  }

  if (token !== requiredToken) {
    return <SetupMessage title="閲覧トークンが必要です" message="URL末尾に ?token=Vercelで設定したAI_SECRETARY_READ_TOKEN を付けて開いてください。" />
  }

  const { items, error } = await loadInbox(status)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-green-700">Yatabe AI Secretary MVP</p>
          <h2 className="text-2xl font-black text-gray-900">LINE未対応一覧</h2>
          <p className="text-sm text-gray-500 mt-1">LINE受信、顧客候補、AI要約、返信下書きを確認する読み取り専用画面です。送信はしません。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/admin/ai-secretary/customers?token=${encodeURIComponent(token)}`} className="rounded-full bg-green-600 px-3 py-2 font-bold text-white">
            顧客マスタ
          </Link>
          {['needs_review', 'matched', 'handled'].map((row) => (
            <a
              key={row}
              href={`/admin/ai-secretary/line-inbox?token=${encodeURIComponent(token)}&status=${row}`}
              className={`rounded-full px-3 py-2 font-bold ${status === row ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {statusLabel(row)}
            </a>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Supabase読み取りエラー: {error}
        </div>
      )}

      <div className="grid gap-4">
        {items.map((item) => {
          const candidates = item.customer_candidates || []
          const topCandidate = candidates[0]
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">{statusLabel(item.status)}</span>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      {item.account_display_name || item.account_key || 'line'}
                    </span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{intentLabel(item.intent)}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(item.match_confidence)}`}>
                      照合: {item.match_confidence || '未確定'}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
                      受信日時: {formatDate(item.occurred_at)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">LINE userId: {item.line_user_id || '-'}</div>
                </div>
                {item.line_display_name && <div className="mt-2 text-xs font-bold text-gray-600">LINE表示名: {item.line_display_name}</div>}
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <section className="space-y-4 p-5">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">受信内容</h3>
                    <dl className="mt-2 grid gap-2 rounded-xl bg-white p-3 text-xs text-gray-600 ring-1 ring-gray-100 sm:grid-cols-3">
                      <div>
                        <dt className="font-bold text-gray-400">受信日時</dt>
                        <dd className="mt-1 font-bold text-gray-800">{formatDate(item.occurred_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-gray-400">問い合わせ種別</dt>
                        <dd className="mt-1 font-bold text-gray-800">{intentLabel(item.intent)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-gray-400">対応ステータス</dt>
                        <dd className="mt-1 font-bold text-gray-800">{statusLabel(item.status)} / {item.customer_status || '-'}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-gray-400">LINE公式</dt>
                        <dd className="mt-1 font-bold text-gray-800">{item.account_display_name || item.account_key || '-'}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-gray-400">サービス</dt>
                        <dd className="mt-1 font-bold text-gray-800">{item.account_service_area || item.service_category || '-'}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-800">{item.body}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">AI要約</h3>
                    <p className="mt-2 rounded-xl bg-green-50 p-4 text-sm leading-7 text-green-900">{item.ai_summary || '未生成'}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-gray-900">AI返信下書き</h3>
                      <CopyReplyButton text={item.ai_reply_draft} />
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-900">{item.ai_reply_draft || '未生成'}</pre>
                  </div>
                </section>

                <aside className="space-y-4 border-t border-gray-100 bg-white p-5 lg:border-l lg:border-t-0">
                  <ManualMemoForm id={item.id} initialMemo={item.manual_memo} token={token} />

                  {item.customer_id && (
                    <Link
                      href={`/admin/ai-secretary/customers/${item.customer_id}?token=${encodeURIComponent(token)}`}
                      className="block rounded-xl border border-green-200 bg-green-50 p-4 text-sm transition hover:bg-green-100"
                    >
                      <div className="font-black text-green-950">顧客マスタを開く</div>
                      <div className="mt-1 text-green-800">
                        {item.customer_full_name || item.customer_child_name || item.customer_parent_name || (item.line_display_name ? `LINE表示名: ${item.line_display_name}` : '名前未登録')}
                      </div>
                      <div className="mt-1 text-xs text-green-700">
                        学年: {item.customer_grade || '-'} / 地域: {item.customer_region || '-'} / 所属: {item.customer_team_name || '-'}
                      </div>
                    </Link>
                  )}

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">顧客照合</h3>
                    {item.user_id ? (
                      <CustomerBox
                        name={item.name}
                        email={item.email}
                        typeName={item.type_name}
                        lane={item.lane}
                        tags={item.tags || []}
                        reasons={item.match_reasons || []}
                      />
                    ) : topCandidate ? (
                      <CustomerBox
                        name={topCandidate.name}
                        email={topCandidate.email}
                        typeName={topCandidate.profile?.type_name || null}
                        lane={topCandidate.profile?.lane || null}
                        tags={topCandidate.profile?.tags || []}
                        reasons={topCandidate.reasons || []}
                        score={topCandidate.score}
                      />
                    ) : (
                      <p className="mt-2 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">既存顧客候補なし。保護者名、子ども名、メール、電話、過去履歴で追加確認が必要です。</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">候補一覧</h3>
                    <div className="mt-2 space-y-2">
                      {candidates.length === 0 && <p className="text-sm text-gray-400">候補なし</p>}
                      {candidates.map((candidate) => (
                        <div key={candidate.user_id} className="rounded-xl border border-gray-200 p-3 text-sm">
                          <div className="font-bold text-gray-900">{candidate.name || '名前未登録'}</div>
                          <div className="text-xs text-gray-500">{candidate.email || '-'} / score {candidate.score}</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(candidate.reasons || []).map((reason) => (
                              <span key={reason} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{reason}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </article>
          )
        })}

        {items.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="font-bold text-gray-800">現在、この条件のLINEはありません。</p>
            <p className="mt-2 text-sm text-gray-500">新しいLINEが届くと、Webhook経由でここに表示されます。</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SetupMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
      <h2 className="text-lg font-bold text-yellow-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-yellow-800">{message}</p>
      <p className="mt-3 text-xs text-yellow-700">送信機能はありません。読み取り、照合、要約、返信下書き確認だけを行います。</p>
    </div>
  )
}

function CustomerBox({
  name,
  email,
  typeName,
  lane,
  tags,
  reasons,
  score,
}: {
  name: string | null
  email: string | null
  typeName: string | null
  lane: string | null
  tags: string[]
  reasons: string[]
  score?: number
}) {
  return (
    <div className="mt-2 rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="text-base font-black text-green-950">{name || '名前未登録'}</div>
      <div className="mt-1 text-xs text-green-800">{email || '-'} / {typeName || '-'} / Lane {lane || '-'}</div>
      {typeof score === 'number' && <div className="mt-1 text-xs font-bold text-green-700">候補スコア: {score}</div>}
      <div className="mt-3 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span key={tag} className="rounded bg-white px-2 py-1 text-xs text-green-700">{tag}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {reasons.map((reason) => (
          <span key={reason} className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-800">{reason}</span>
        ))}
      </div>
    </div>
  )
}
