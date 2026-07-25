import { NextResponse } from 'next/server'
import { soccerCases } from '@/data/cases'

export function GET() {
  return NextResponse.json({
    schema_version: '1.0.0-beta',
    generated_at: new Date().toISOString(),
    count: soccerCases.length,
    cases: soccerCases,
  })
}
