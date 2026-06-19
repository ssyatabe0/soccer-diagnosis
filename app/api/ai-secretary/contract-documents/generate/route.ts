import { NextRequest, NextResponse } from 'next/server'
import { cleanNumber, cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'
import { createContractPdfBuffer } from '@/lib/ai-secretary/pdf'

type TemplateRow = {
  id: string
  template_key: string
  name: string
  service_type: string
  document_type: string
  body: string | null
}

function yen(value: unknown) {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number <= 0) return '-'
  return `${number.toLocaleString('ja-JP')}円`
}

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const customerId = cleanText(body?.customer_id, 80)
  const templateId = cleanText(body?.template_id, 80)
  if (!customerId) return NextResponse.json({ error: 'customer_id_required' }, { status: 400 })
  if (!templateId) return NextResponse.json({ error: 'template_id_required' }, { status: 400 })

  const [{ data: customer, error: customerError }, { data: template, error: templateError }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase.from('contract_templates').select('*').eq('id', templateId).single(),
  ])
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 })
  if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 })

  const templateRow = template as TemplateRow
  const amount = cleanNumber(body?.amount)
  const monthlyFee = cleanNumber(body?.monthly_fee)
  const startDate = cleanText(body?.start_date, 20) || new Date().toISOString().slice(0, 10)
  const endDate = cleanText(body?.end_date, 20)
  const validUntil = cleanText(body?.valid_until, 20) || endDate
  const ticketCount = cleanNumber(body?.ticket_count)
  const paymentMethod = cleanText(body?.payment_method, 100) || customer.payment_method || '未設定'
  const notes = cleanText(body?.notes)
  const missing = [
    !customer.parent_name ? '保護者名' : null,
    !customer.child_name ? '子ども名' : null,
    !customer.email ? 'メールアドレス' : null,
    !customer.phone ? '電話番号' : null,
    !customer.address ? '住所' : null,
  ].filter(Boolean).join('、')

  const pdf = createContractPdfBuffer(templateRow.name, [
    { label: '契約書種別', value: templateRow.name },
    { label: 'サービス', value: cleanText(body?.service_name, 200) || templateRow.service_type },
    { label: '保護者名', value: customer.parent_name },
    { label: '子ども名', value: customer.child_name },
    { label: '住所', value: customer.address },
    { label: '電話番号', value: customer.phone },
    { label: 'メールアドレス', value: customer.email },
    { label: '契約開始日', value: startDate },
    { label: '契約終了日', value: endDate },
    { label: '回数券情報', value: ticketCount ? `${ticketCount}回` : '-' },
    { label: '有効期限', value: validUntil },
    { label: '料金', value: amount ? yen(amount) : monthlyFee ? `月謝 ${yen(monthlyFee)}` : '-' },
    { label: '支払方法', value: paymentMethod },
    { label: '不足情報', value: missing || 'なし' },
    { label: '注意事項', value: notes || '契約内容は谷田部確認後に確定。クラウドサイン送信は未実施。' },
    { label: '本文メモ', value: templateRow.body },
  ])

  const fileName = `${templateRow.template_key}-${customerId.slice(0, 8)}-${Date.now()}.pdf`
  const snapshot = {
    customer,
    template: templateRow,
    service_name: cleanText(body?.service_name, 200) || templateRow.service_type,
    amount,
    monthly_fee: monthlyFee,
    start_date: startDate,
    end_date: endDate,
    valid_until: validUntil,
    ticket_count: ticketCount,
    payment_method: paymentMethod,
    missing_fields: missing,
    notes,
  }

  const { data: document, error } = await supabase.from('contract_documents').insert({
    customer_id: customerId,
    template_id: templateId,
    title: templateRow.name,
    service_type: templateRow.service_type,
    status: 'created',
    file_name: fileName,
    content_type: 'application/pdf',
    pdf_base64: pdf.toString('base64'),
    field_snapshot: snapshot,
    ai_suggestion: buildSuggestion(templateRow.name, missing, paymentMethod, amount, monthlyFee),
    notes,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('customer_timeline_events').insert({
    customer_id: customerId,
    event_type: 'memo',
    title: `契約書PDF作成: ${templateRow.name}`,
    body: `ステータス: 作成済み。自動送信はしていません。${missing ? ` 不足情報: ${missing}` : ''}`,
    source: 'contract_document',
    source_table: 'contract_documents',
    source_id: String(document.id),
    occurred_at: new Date().toISOString(),
  })

  return NextResponse.json({ status: 'ok', document })
}

function buildSuggestion(templateName: string, missing: string, paymentMethod: string, amount: number | null, monthlyFee: number | null) {
  const price = amount ? yen(amount) : monthlyFee ? `月謝 ${yen(monthlyFee)}` : '料金未設定'
  return [
    `推奨契約書: ${templateName}`,
    `不足情報: ${missing || 'なし'}`,
    `料金: ${price}`,
    `支払方法: ${paymentMethod}`,
    '注意: 契約内容は自動確定しません。送付前に谷田部確認が必要です。',
  ].join('\n')
}
