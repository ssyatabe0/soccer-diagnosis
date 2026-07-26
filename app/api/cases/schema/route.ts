import caseSchema from '@/data/case.schema.json'

const headers = {
  'Access-Control-Allow-Origin': 'https://soccer-kateikyousi.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
}

export function GET() {
  return Response.json(caseSchema, { headers })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers })
}

