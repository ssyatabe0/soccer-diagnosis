import { NextRequest, NextResponse } from 'next/server'
import { cleanNumber, cleanText, getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function POST(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const customerId = cleanText(body?.customer_id, 80)
  const productId = cleanText(body?.product_id, 80)
  if (!customerId) return NextResponse.json({ error: 'customer_id_required' }, { status: 400 })

  let product = null as null | { id: string; product_type: string; ticket_count: number | null; price: number | null; monthly_fee: number | null }
  if (productId) {
    const { data, error } = await supabase.from('products').select('id, product_type, ticket_count, price, monthly_fee').eq('id', productId).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    product = data
  }

  const contract = {
    customer_id: customerId,
    product_id: productId,
    contract_type: cleanText(body?.contract_type, 40) || product?.product_type || 'ticket',
    status: cleanText(body?.status, 40) || 'active',
    purchase_date: cleanText(body?.purchase_date, 20) || new Date().toISOString().slice(0, 10),
    start_date: cleanText(body?.start_date, 20),
    first_usage_date: cleanText(body?.first_usage_date, 20),
    valid_until: cleanText(body?.valid_until, 20),
    purchased_count: cleanNumber(body?.purchased_count) ?? product?.ticket_count ?? null,
    used_count: cleanNumber(body?.used_count) ?? 0,
    amount: cleanNumber(body?.amount) ?? product?.price ?? null,
    monthly_fee: cleanNumber(body?.monthly_fee) ?? product?.monthly_fee ?? null,
    payment_status: cleanText(body?.payment_status, 40) || 'unknown',
    notes: cleanText(body?.notes),
    source: 'admin_manual',
  }

  const { data, error } = await supabase.from('contracts').insert(contract).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('customer_timeline_events').insert({
    customer_id: customerId,
    event_type: 'enrollment',
    title: '契約登録',
    body: contract.notes || '管理画面から契約を登録しました。',
    source: 'admin',
    source_table: 'contracts',
    source_id: data.id,
    occurred_at: new Date().toISOString(),
  })

  return NextResponse.json({ status: 'ok', contract: data })
}
