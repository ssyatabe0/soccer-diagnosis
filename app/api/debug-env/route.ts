import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT SET';
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_prefix: key.slice(0, 20),
    timestamp: new Date().toISOString(),
  });
}
