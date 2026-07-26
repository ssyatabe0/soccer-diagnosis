import { NextResponse } from 'next/server'
import { getPublicCases } from '@/lib/cases/public-cases'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://soccer-kateikyousi.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300, s-maxage=3600',
}

export async function GET() {
  const cases = await getPublicCases()
  return NextResponse.json({
    schema_version: '1.0.0-beta',
    schema_url: 'https://soccer-diagnosis.vercel.app/api/cases/schema',
    generated_at: new Date().toISOString(),
    count: cases.length,
    cases,
  }, { headers: corsHeaders })
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}
