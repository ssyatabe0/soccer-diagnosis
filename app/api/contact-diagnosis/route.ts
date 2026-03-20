import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const MAIL_TO = process.env.MAIL_TO || 'ssyatabe0@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      message,
      resultId,
      typeName,
      lane,
      tags,
      totalScore,
      answers,
      createdAt,
      resultUrl,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'お名前とメールアドレスは必須です' }, { status: 400 });
    }

    const subject = `【サッカー診断問い合わせ】${typeName} / ${resultId}`;

    const text = `
━━━━━━━━━━━━━━━━━━━━━━
サッカー才能の出し方診断 お問い合わせ
━━━━━━━━━━━━━━━━━━━━━━

■ 問い合わせ者情報
お名前: ${name}
メールアドレス: ${email}

■ ご相談内容
${message || '（記入なし）'}

■ 診断結果情報
結果ID: ${resultId}
診断タイプ: ${typeName}
レーン: ${lane}
タグ: ${Array.isArray(tags) ? tags.join(', ') : tags || 'なし'}
合計スコア: ${totalScore}点
回答: ${Array.isArray(answers) ? answers.join(', ') : answers}
診断日時: ${createdAt}

■ 結果ページURL
${resultUrl}

━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    const { data, error } = await resend.emails.send({
      from: 'サッカー才能診断 <onboarding@resend.dev>',
      to: [MAIL_TO],
      replyTo: email,
      subject,
      text,
    });

    if (error) {
      console.error('RESEND ERROR:', error);
      return NextResponse.json({ error: 'メール送信に失敗しました: ' + error.message }, { status: 500 });
    }

    console.log('RESEND SUCCESS:', data);
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('CONTACT FATAL ERROR:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
