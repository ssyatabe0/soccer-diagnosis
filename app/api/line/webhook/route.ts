import { NextRequest, NextResponse } from 'next/server';
import { getReplyByTypeName, ERROR_NO_ID, ERROR_NOT_FOUND, ERROR_UNEXPECTED } from '@/lib/line-result-templates';
import crypto from 'crypto';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET || LINE_CHANNEL_SECRET === 'placeholder') return true;
  const hash = crypto.createHmac('SHA256', LINE_CHANNEL_SECRET).update(body).digest('base64');
  return hash === signature;
}

async function replyText(replyToken: string, text: string): Promise<boolean> {
  // 5000文字制限対応: 長文は2通に分割
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
    if (!res.ok) {
      const errText = await res.text();
      console.error('[webhook] reply failed:', res.status, errText);
      return false;
    }
    console.log('[webhook] reply success');
    return true;
  } catch (e) {
    console.error('[webhook] reply error:', e);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // 署名検証
    const signature = request.headers.get('x-line-signature') || '';
    if (!verifySignature(rawBody, signature)) {
      console.error('[webhook] invalid signature');
      return NextResponse.json({ status: 'ok' });
    }

    const body = JSON.parse(rawBody);
    const events = body.events || [];
    console.log('[webhook] received events:', events.length);

    for (const event of events) {
      // テキストメッセージのみ処理
      if (event.type !== 'message' || event.message?.type !== 'text') continue;

      const text = event.message.text || '';
      const replyToken = event.replyToken;
      const userId = event.source?.userId;

      console.log('[webhook] message:', text);
      console.log('[webhook] userId:', userId);

      // resultId を抽出（ID: xxx または 診断結果ID: xxx）
      const idMatch = text.match(/(?:診断結果)?ID[:：]\s*([a-f0-9-]+)/i);
      if (!idMatch) {
        console.log('[webhook] no resultId found');
        await replyText(replyToken, ERROR_NO_ID);
        continue;
      }

      const resultId = idMatch[1];
      console.log('[webhook] resultId:', resultId);

      // Supabase から diagnosis_results を検索
      let typeName = '';
      try {
        const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        if (supabaseUrl && supabaseKey) {
          console.log('[webhook] querying DB for:', resultId);
          const res = await fetch(
            `${supabaseUrl}/rest/v1/diagnosis_results?id=eq.${resultId}&select=type_name`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
          const data = await res.json();
          console.log('[webhook] DB result:', JSON.stringify(data));

          if (data?.[0]?.type_name) {
            typeName = data[0].type_name;
          }
        }
      } catch (e) {
        console.error('[webhook] DB error:', e);
      }

      // DBから取れなかった場合、メッセージ本文の「タイプ:」から取得
      if (!typeName) {
        const typeMatch = text.match(/タイプ[:：]\s*(.+?)(\n|$)/);
        if (typeMatch) {
          typeName = typeMatch[1].trim();
          console.log('[webhook] typeName from message:', typeName);
        }
      }

      // typeName が取れない場合
      if (!typeName) {
        console.log('[webhook] typeName not found, sending NOT_FOUND');
        await replyText(replyToken, ERROR_NOT_FOUND);
        continue;
      }

      console.log('[webhook] final typeName:', typeName);

      // テンプレートから返信文を取得して返信
      const replyBody = getReplyByTypeName(typeName);
      const replied = await replyText(replyToken, replyBody);

      if (!replied) {
        console.error('[webhook] reply failed for:', resultId, typeName);
      }

      // Supabase に line_user_id を紐付け
      try {
        const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
          console.log('[webhook] user updated:', resultId, userId);
        }
      } catch (e) {
        console.error('[webhook] user update error:', e);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    console.error('[webhook] fatal error:', e);
    return NextResponse.json({ status: 'ok' });
  }
}
