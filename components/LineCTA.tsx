'use client';

import { useState, useCallback } from 'react';
import liff from '@line/liff';
import { DiagnosisResult } from '@/lib/types';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '';
const FALLBACK_LINE_URL = 'https://lin.ee/qzc2ot7';

type Status = 'idle' | 'loading' | 'need-friend' | 'sent' | 'error';

export default function LineCTA({ result }: { result: DiagnosisResult }) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = useCallback(async () => {
    // LIFF未設定ならフォールバック（外部リンク）
    if (!LIFF_ID) {
      window.open(FALLBACK_LINE_URL, '_blank');
      return;
    }

    setStatus('loading');

    try {
      // LIFF初期化
      await liff.init({ liffId: LIFF_ID });

      // 未ログインならログイン
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }

      // プロフィール取得
      const profile = await liff.getProfile();
      const lineUserId = profile.userId;
      const displayName = profile.displayName;

      // 友だち追加状態を確認
      const friendship = await liff.getFriendship();

      if (!friendship.friendFlag) {
        setStatus('need-friend');
        return;
      }

      // 友だち追加済み → API呼び出して結果をLINEに送信
      const res = await fetch('/api/line/send-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          displayName,
          resultId: result.id,
          typeId: result.type.id,
          typeName: result.type.name,
          lane: result.lane,
          tags: result.tags,
          totalScore: result.totalScore,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('send-result error:', data);
        setErrorMsg('送信に失敗しました。もう一度お試しください。');
        setStatus('error');
        return;
      }

      setStatus('sent');
    } catch (e) {
      console.error('LIFF error:', e);
      // LIFFエラー時はフォールバックリンクへ
      window.open(FALLBACK_LINE_URL, '_blank');
      setStatus('idle');
    }
  }, [result]);

  // 送信完了
  if (status === 'sent') {
    return (
      <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
        <div className="text-4xl mb-3">&#10003;</div>
        <h3 className="text-lg font-extrabold mb-2">
          LINEに続きの結果をお送りしました
        </h3>
        <p className="text-white/80 text-sm leading-relaxed">
          LINEアプリを開いてご確認ください
        </p>
      </div>
    );
  }

  // 友だち追加が必要
  if (status === 'need-friend') {
    return (
      <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
        <h3 className="text-lg font-extrabold mb-2">
          まず公式アカウントを<br />友だち追加してください
        </h3>
        <p className="text-white/80 text-xs mb-4 leading-relaxed">
          友だち追加後に続きの結果を自動でお届けします
        </p>
        <a
          href={FALLBACK_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50 mb-3"
        >
          友だち追加する
        </a>
        <button
          onClick={() => { setStatus('idle'); handleClick(); }}
          className="text-white/70 text-xs underline"
        >
          追加したのでもう一度試す
        </button>
      </div>
    );
  }

  // エラー
  if (status === 'error') {
    return (
      <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
        <p className="text-white/80 text-sm mb-3">{errorMsg}</p>
        <button
          onClick={() => { setStatus('idle'); handleClick(); }}
          className="inline-block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95"
        >
          もう一度試す
        </button>
      </div>
    );
  }

  // 通常 / ローディング
  return (
    <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
      <p className="text-white/80 text-xs mb-2">ここまでが無料で見られる結果です</p>
      <h3 className="text-lg font-extrabold mb-2">
        詳しい伸ばし方を<br />LINEで受け取る
      </h3>
      <p className="text-white/80 text-xs mb-4 leading-relaxed">
        お子さんのタイプに合う伸ばし方を<br />LINEでご案内します
      </p>
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="inline-block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50 disabled:opacity-60"
      >
        {status === 'loading' ? '接続中...' : '続きの結果をLINEで受け取る'}
      </button>
      <p className="text-white/60 text-xs mt-3">
        無料・1タップで登録できます
      </p>
    </div>
  );
}
