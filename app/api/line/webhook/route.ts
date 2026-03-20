import { NextRequest, NextResponse } from 'next/server';
import { buildLineResultMessage } from '@/lib/line-result-templates';
import crypto from 'crypto';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET || LINE_CHANNEL_SECRET === 'placeholder') return true;
  const hash = crypto.createHmac('SHA256', LINE_CHANNEL_SECRET).update(body).digest('base64');
  return hash === signature;
}

async function replyMessage(replyToken: string, text: string): Promise<boolean> {
  try {
    // LINE reply は最大5通、1通あたり5000文字
    // 長文は分割
    const chunks: string[] = [];
    if (text.length <= 5000) {
      chunks.push(text);
    } else {
      const lines = text.split('\n');
      let current = '';
      for (const line of lines) {
        if ((current + '\n' + line).length > 4800) {
          chunks.push(current);
          current = line;
        } else {
          current = current ? current + '\n' + line : line;
        }
      }
      if (current) chunks.push(current);
    }

    const messages = chunks.slice(0, 5).map(c => ({ type: 'text', text: c }));

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
  } catch (e) {
    console.error('LINE reply error:', e);
    return false;
  }
}

async function pushMessage(userId: string, text: string): Promise<void> {
  try {
    const messages = [{ type: 'text', text: text.slice(0, 5000) }];
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
  } catch (e) {
    console.error('LINE push error:', e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // 署名検証
    const signature = request.headers.get('x-line-signature') || '';
    if (!verifySignature(rawBody, signature)) {
      console.error('LINE webhook: invalid signature');
      return NextResponse.json({ status: 'ok' });
    }

    const body = JSON.parse(rawBody);
    const events = body.events || [];

    console.log('[webhook] received:', JSON.stringify({ eventCount: events.length }));

    for (const event of events) {
      if (event.type !== 'message' || event.message?.type !== 'text') continue;

      const text = event.message.text || '';
      const replyToken = event.replyToken;
      const userId = event.source?.userId;

      console.log('[webhook] message text:', text);

      // resultId を抽出
      const match = text.match(/resultId=([a-f0-9-]+)/i);
      if (!match) {
        console.log('[webhook] no resultId found in message, skipping');
        continue;
      }

      const resultId = match[1];
      console.log('[webhook] resultId:', resultId);

      // typeName を本文から抽出（第一優先）
      let typeName = '';
      const typeMatch = text.match(/type=(.+?)(\n|$)/);
      if (typeMatch) {
        typeName = typeMatch[1].trim();
      }

      // Supabase から補完（typeName が空の場合）
      if (!typeName) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseKey) {
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
            if (data?.[0]?.type_name) {
              typeName = data[0].type_name;
            }
          }
        } catch (e) {
          console.error('Supabase fetch error:', e);
        }
      }

      if (!typeName) {
        typeName = '不明なタイプ';
      }

      console.log('[webhook] typeName:', typeName);

      // テンプレートからメッセージ生成
      const messageText = buildLineResultMessage(typeName);

      // reply を試行、失敗なら push
      const replied = await replyMessage(replyToken, messageText);
      if (replied) {
        console.log('[webhook] reply success:', resultId, typeName);
      } else {
        console.log('[webhook] reply failed, trying push to:', userId);
        if (userId) {
          await pushMessage(userId, messageText);
          console.log('[webhook] push sent:', resultId, userId);
        }
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

      console.log('[webhook] done:', resultId, typeName, userId);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    console.error('webhook error:', e);
    return NextResponse.json({ status: 'ok' });
  }
}
