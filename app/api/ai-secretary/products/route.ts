import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, isAiSecretaryAuthorized } from '@/lib/ai-secretary/api'

export async function GET(request: NextRequest) {
  if (!isAiSecretaryAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('service_type', { ascending: true })
    .order('product_type', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ count: data?.length || 0, items: data || [] })
}
