import { NextRequest, NextResponse } from 'next/server';
import { buildResultMessages } from '@/lib/line-result-templates';
import { DIAGNOSIS_TYPES } from '@/lib/constants';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

async function replyMessage(replyToken: string, messages: { type: string; text: string }[]) {
  const res = await fetch(LINE_REPLY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    console.error('LINE reply failed:', res.status, await res.text());
    return false;
  }
  return true;
}

async function pushMessage(userId: string, messages: { type: string; text: string }[]) {
  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!res.ok) {
    console.error('LINE push failed:', res.status, await res.text());
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== 'message' || event.message?.type !== 'text') continue;

      const text = event.message.text || '';
      const replyToken = event.replyToken;
      const userId = event.source?.userId;

      // resultId を抽出
      const match = text.match(/resultId=([a-f0-9-]+)/i);
      if (!match) continue;

      const resultId = match[1];

      // Supabase から結果取得
      let typeId = 1;
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/diagnosis_results?id=eq.${resultId}&select=type_id`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
          const data = await res.json();
          if (data?.[0]?.type_id) {
            typeId = data[0].type_id;
          }
        }
      } catch (e) {
        console.error('Supabase fetch error:', e);
        // typeId をメッセージ本文から推測
        const typeMatch = text.match(/type=(.+?)(\n|$)/);
        if (typeMatch) {
          const found = DIAGNOSIS_TYPES.find(t => t.name === typeMatch[1]);
          if (found) typeId = found.id;
        }
      }

      // テンプレートからメッセージ生成
      const templateTexts = buildResultMessages(typeId);
      const lineMessages = templateTexts.map(t => ({ type: 'text' as const, text: t }));

      // reply を試行、失敗なら push
      const replied = await replyMessage(replyToken, lineMessages);
      if (!replied && userId) {
        await pushMessage(userId, lineMessages);
      }

      // Supabase に line_user_id を紐付け
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey && userId) {
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
                line_user_id: userId,
                line_delivery_step: 1,
              }),
            }
          );
        }
      } catch (e) {
        console.error('Supabase update error:', e);
      }

      console.log('LINE auto-reply sent:', resultId, typeId);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    console.error('webhook error:', e);
    return NextResponse.json({ status: 'ok' });
  }
}
