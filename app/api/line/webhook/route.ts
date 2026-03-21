import { NextRequest, NextResponse } from 'next/server';
import { getReplyByTypeName, ERROR_NO_ID, ERROR_NOT_FOUND } from '@/lib/line-result-templates';

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

async function replyLine(replyToken: string, text: string) {
  console.log('[reply] sending:', text.slice(0, 100));
  const messages = text.length <= 5000
    ? [{ type: 'text', text }]
    : [{ type: 'text', text: text.slice(0, 4900) + '\n（続き）' }, { type: 'text', text: text.slice(4900) }];

  const res = await fetch(REPLY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ replyToken, messages }),
  });
  const body = await res.text();
  console.log('[reply] status:', res.status, 'body:', body);
  return res.ok;
}

export async function GET() {
  return NextResponse.json({ status: 'webhook endpoint is alive', token_set: !!TOKEN && TOKEN !== 'placeholder' });
}

export async function POST(request: NextRequest) {
  console.log('========== [webhook] POST received ==========');
  console.log('[webhook] TOKEN set:', !!TOKEN && TOKEN !== 'placeholder');

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch (e) {
    console.error('[webhook] failed to read body:', e);
    return NextResponse.json({ status: 'ok' });
  }

  console.log('[webhook] body:', rawBody.slice(0, 300));

  let events: any[] = [];
  try {
    const parsed = JSON.parse(rawBody);
    events = parsed.events || [];
  } catch (e) {
    console.error('[webhook] JSON parse error:', e);
    return NextResponse.json({ status: 'ok' });
  }

  console.log('[webhook] events:', events.length);

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    console.log(`[webhook] event[${i}] type:`, ev.type, 'message.type:', ev.message?.type);

    if (ev.type !== 'message' || ev.message?.type !== 'text') {
      console.log(`[webhook] event[${i}] skip (not text)`);
      continue;
    }

    const text = ev.message.text || '';
    const replyToken = ev.replyToken;
    console.log(`[webhook] text: "${text}"`);
    console.log(`[webhook] replyToken: ${replyToken}`);

    // === ID抽出 ===
    const idMatch = text.match(/(?:診断結果)?ID[:：]\s*([a-f0-9-]+)/i);
    console.log('[webhook] idMatch:', idMatch ? idMatch[1] : 'null');

    if (!idMatch) {
      // IDなし → テスト返信
      console.log('[webhook] no ID → sending ack reply');
      await replyLine(replyToken, '受信しました。\n\n診断結果の続きを受け取るには、サイトの「結果をコピーする」ボタンで取得したテキストをそのまま送ってください。');
      continue;
    }

    const resultId = idMatch[1];
    console.log('[webhook] resultId:', resultId);

    // === DB検索 ===
    let typeName = '';
    try {
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (url && key && !url.includes('placeholder')) {
        const dbRes = await fetch(`${url}/rest/v1/diagnosis_results?id=eq.${resultId}&select=type_name`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        const dbData = await dbRes.json();
        console.log('[webhook] DB:', JSON.stringify(dbData));
        if (dbData?.[0]?.type_name) typeName = dbData[0].type_name;
      }
    } catch (e) {
      console.error('[webhook] DB error:', e);
    }

    // メッセージからフォールバック
    if (!typeName) {
      const m = text.match(/タイプ[:：]\s*(.+?)(\n|$)/);
      if (m) typeName = m[1].trim();
      console.log('[webhook] typeName from text:', typeName || 'null');
    }

    if (!typeName) {
      console.log('[webhook] no typeName → NOT_FOUND reply');
      await replyLine(replyToken, ERROR_NOT_FOUND);
      continue;
    }

    console.log('[webhook] typeName:', typeName);

    // === テンプレ返信 ===
    const replyBody = getReplyByTypeName(typeName);
    console.log('[webhook] template length:', replyBody.length);
    console.log('[webhook] sending template reply...');
    const ok = await replyLine(replyToken, replyBody);
    console.log('[webhook] reply ok:', ok);

    // users更新
    try {
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const userId = ev.source?.userId;
      if (url && key && userId && !url.includes('placeholder')) {
        await fetch(`${url}/rest/v1/users?id=eq.${resultId}`, {
          method: 'PATCH',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ line_user_id: userId, line_delivery_step: 1 }),
        });
      }
    } catch { /* ignore */ }
  }

  console.log('========== [webhook] done ==========');
  return NextResponse.json({ status: 'ok' });
}
