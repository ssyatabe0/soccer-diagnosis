import { NextRequest, NextResponse } from 'next/server';
import { DIAGNOSIS_TYPES } from '@/lib/constants';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineUserId, displayName, resultId, typeId, typeName, lane, tags, totalScore } = body;

    if (!lineUserId || !resultId || !typeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // タイプ情報を取得
    const type = DIAGNOSIS_TYPES.find(t => t.id === typeId) || DIAGNOSIS_TYPES[0];

    // LINE push message 本文を組み立て
    const messages = [
      {
        type: 'text',
        text: `${displayName || ''}さん、診断ありがとうございます！\n\nお子さんのタイプ：\n【${typeName}】\n\nの続きの結果をお届けします。`,
      },
      {
        type: 'text',
        text: `🔍 原因の再定義\n\n${type.causeRedefinition}`,
      },
      {
        type: 'text',
        text: `🌱 伸びるポイント\n\n${type.growthPoints.map((p, i) => `${i + 1}. ${p}`).join('\n\n')}`,
      },
      {
        type: 'text',
        text: `🎯 次の一手\n\n今のフェーズの優先テーマは「${type.priorityTheme}」です。\n\nまずはここから取り組むと、変化が見えやすくなります。\n\n▼ オンライン診断（動画で診てもらう）\nhttps://soccer-kateikyousi.com/%e3%82%aa%e3%83%b3%e3%83%a9%e3%82%a4%e3%83%b3%e8%a8%ba%e6%96%ad/\n\n▼ 対面で直接見てもらう\nhttps://soccer-kateikyousi.com/%E5%88%9D%E3%82%81%E3%81%A6%E3%81%94%E6%9D%A5%E9%99%A2%E3%81%AE%E6%96%B9%E3%81%B8/`,
      },
    ];

    // LINE Messaging API push
    if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'placeholder') {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return NextResponse.json({ error: 'LINE未設定' }, { status: 500 });
    }

    const pushRes = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages,
      }),
    });

    if (!pushRes.ok) {
      const errText = await pushRes.text();
      console.error('LINE push failed:', pushRes.status, errText);
      return NextResponse.json({ error: 'LINE送信失敗' }, { status: 500 });
    }

    console.log('LINE push success:', resultId, lineUserId);

    // Supabase に line_user_id を紐付け（失敗しても返却はOK）
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        // users テーブルを更新
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
