import { NextRequest, NextResponse } from 'next/server';
import { getReplyByTypeName, ERROR_NO_ID, ERROR_NOT_FOUND } from '@/lib/line-result-templates';
import crypto from 'crypto';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET || LINE_CHANNEL_SECRET === 'placeholder') {
    console.log('[webhook] SKIP signature verify (secret not set)');
    return true;
  }
  const hash = crypto.createHmac('SHA256', LINE_CHANNEL_SECRET).update(body).digest('base64');
  const valid = hash === signature;
  console.log('[webhook] signature valid:', valid);
  return valid;
}

async function reply(replyToken: string, text: string): Promise<boolean> {
  console.log('[webhook] calling reply API, token:', replyToken?.slice(0, 20) + '...');
  console.log('[webhook] reply text length:', text.length);

  const messages: { type: string; text: string }[] = [];
  if (text.length <= 5000) {
    messages.push({ type: 'text', text });
  } else {
    messages.push({ type: 'text', text: text.slice(0, 4900) + '\n\n（続き）' });
    messages.push({ type: 'text', text: text.slice(4900) });
  }

  try {
    const res = await fetch(LINE_REPLY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });

    const resText = await res.text();
    console.log('[webhook] reply API status:', res.status);
    console.log('[webhook] reply API response:', resText);

    return res.ok;
  } catch (e) {
    console.error('[webhook] reply API fetch error:', e);
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('[webhook] === POST received ===');
  console.log('[webhook] LINE_CHANNEL_ACCESS_TOKEN set:', !!LINE_CHANNEL_ACCESS_TOKEN && LINE_CHANNEL_ACCESS_TOKEN !== 'placeholder');
  console.log('[webhook] LINE_CHANNEL_SECRET set:', !!LINE_CHANNEL_SECRET && LINE_CHANNEL_SECRET !== 'placeholder');

  try {
    const rawBody = await request.text();
    console.log('[webhook] raw body:', rawBody.slice(0, 500));

    // 署名検証
    const signature = request.headers.get('x-line-signature') || '';
    if (!verifySignature(rawBody, signature)) {
      console.error('[webhook] REJECTED: invalid signature');
      return NextResponse.json({ status: 'ok' });
    }

    const body = JSON.parse(rawBody);
    const events = body.events || [];
    console.log('[webhook] event count:', events.length);

    if (events.length === 0) {
      console.log('[webhook] no events (verification request?)');
      return NextResponse.json({ status: 'ok' });
    }

    for (const event of events) {
      console.log('[webhook] event type:', event.type);
      console.log('[webhook] source:', JSON.stringify(event.source));

      // テキストメッセージのみ
      if (event.type !== 'message' || event.message?.type !== 'text') {
        console.log('[webhook] skip non-text event');
        continue;
      }

      const text = event.message.text || '';
      const replyToken = event.replyToken;
      const userId = event.source?.userId;

      console.log('[webhook] message text:', text);
      console.log('[webhook] replyToken:', replyToken);
      console.log('[webhook] userId:', userId);

      // === 簡易テスト: どんなメッセージでもまず返信を試みる ===
      // resultId抽出
      const idMatch = text.match(/(?:診断結果)?ID[:：]\s*([a-f0-9-]+)/i);
      console.log('[webhook] idMatch:', idMatch ? idMatch[1] : 'NULL');

      if (!idMatch) {
        // IDが無いメッセージでもテスト返信
        console.log('[webhook] no ID found, sending test reply');
        const testReply = await reply(replyToken, 'Webhookは受信できています。\n\n診断結果の続きを受け取るには、サイトに表示された「コピー用テキスト」をそのまま貼り付けて送信してください。');
        console.log('[webhook] test reply result:', testReply);
        continue;
      }

      const resultId = idMatch[1];
      console.log('[webhook] resultId:', resultId);

      // Supabase 検索
      let typeName = '';
      try {
        const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        console.log('[webhook] supabase url:', supabaseUrl?.slice(0, 30));

        if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
          const dbRes = await fetch(
            `${supabaseUrl}/rest/v1/diagnosis_results?id=eq.${resultId}&select=type_name`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
          );
          const dbData = await dbRes.json();
          console.log('[webhook] DB status:', dbRes.status);
          console.log('[webhook] DB data:', JSON.stringify(dbData));

          if (dbData?.[0]?.type_name) {
            typeName = dbData[0].type_name;
          }
        } else {
          console.log('[webhook] supabase not configured');
        }
      } catch (e) {
        console.error('[webhook] DB error:', e);
      }

      // メッセージ本文からフォールバック
      if (!typeName) {
        const typeMatch = text.match(/タイプ[:：]\s*(.+?)(\n|$)/);
        if (typeMatch) {
          typeName = typeMatch[1].trim();
          console.log('[webhook] typeName from message:', typeName);
        }
      }

      if (!typeName) {
        console.log('[webhook] no typeName, sending NOT_FOUND');
        await reply(replyToken, ERROR_NOT_FOUND);
        continue;
      }

      console.log('[webhook] final typeName:', typeName);

      // テンプレート返信
      const replyBody = getReplyByTypeName(typeName);
      console.log('[webhook] template found, length:', replyBody.length);
      const success = await reply(replyToken, replyBody);
      console.log('[webhook] reply sent:', success);

      // users 紐付け
      try {
        const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        if (supabaseUrl && supabaseKey && userId && !supabaseUrl.includes('placeholder')) {
          await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${resultId}`, {
            method: 'PATCH',
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ line_user_id: userId, line_delivery_step: 1 }),
          });
          console.log('[webhook] user updated');
        }
      } catch (e) {
        console.error('[webhook] user update error:', e);
      }
    }

    console.log('[webhook] === done ===');
    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    console.error('[webhook] FATAL:', e);
    return NextResponse.json({ status: 'ok' });
  }
}
