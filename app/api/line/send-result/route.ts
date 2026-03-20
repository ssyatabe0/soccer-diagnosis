import { NextRequest, NextResponse } from 'next/server';
import { buildLineResultMessage } from '@/lib/line-result-templates';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineUserId, displayName, resultId, typeName } = body;

    if (!lineUserId || !resultId || !typeName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'placeholder') {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return NextResponse.json({ error: 'LINE未設定' }, { status: 500 });
    }

    const messageText = buildLineResultMessage(typeName);
    const greeting = `${displayName || ''}さん、診断ありがとうございます！`;

    const messages = [
      { type: 'text', text: greeting },
      { type: 'text', text: messageText.slice(0, 5000) },
    ];

    const pushRes = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to: lineUserId, messages }),
    });

    if (!pushRes.ok) {
      const errText = await pushRes.text();
      console.error('LINE push failed:', pushRes.status, errText);
      return NextResponse.json({ error: 'LINE送信失敗' }, { status: 500 });
    }

    console.log('LINE push success:', resultId, lineUserId);

    // Supabase に line_user_id を紐付け
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        await fetch(
          `${supabaseUrl}/rest/v1/users?id=eq.${resultId}`,
          {
            method: 'PATCH',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              line_user_id: lineUserId,
              line_display_name: displayName || null,
              line_delivery_step: 1,
            }),
          }
        );
      }
    } catch (e) {
      console.error('Supabase update error:', e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-result error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
