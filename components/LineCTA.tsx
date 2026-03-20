'use client';

import { useState } from 'react';
import { DiagnosisResult } from '@/lib/types';

const LINE_FRIEND_URL = 'https://lin.ee/q7xbzrk';

export default function LineCTA({ result }: { result: DiagnosisResult }) {
  const [step, setStep] = useState<'initial' | 'friend' | 'sent'>('initial');

  // 1. まず友だち追加
  function handleFriendAdd() {
    window.open(LINE_FRIEND_URL, '_blank');
    setStep('friend');
  }

  // 2. 友だち追加後に本文自動入力でLINEを開く
  function handleSendMessage() {
    const text = `診断結果をお願いします\nID: ${result.id}\nタイプ: ${result.type.name}`;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    console.log('[LineCTA] msg url:', url);
    window.open(url, '_blank');
    setStep('sent');
  }

  // 送信済み
  if (step === 'sent') {
    return (
      <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
        <div className="text-4xl mb-3">&#10003;</div>
        <h3 className="text-lg font-extrabold mb-2">
          LINEでメッセージを送信してください
        </h3>
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          公式アカウントを選んで送信すると<br />続きの結果が届きます
        </p>
        <button
          onClick={handleSendMessage}
          className="w-full bg-white text-[#06C755] font-bold py-3 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50"
        >
          もう一度メッセージを開く
        </button>
      </div>
    );
  }

  // 友だち追加後 → メッセージ送信へ
  if (step === 'friend') {
    return (
      <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
        <p className="text-white/80 text-xs mb-2">友だち追加はできましたか？</p>
        <h3 className="text-lg font-extrabold mb-4">
          続きの結果を受け取る
        </h3>
        <button
          onClick={handleSendMessage}
          className="w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50 mb-3"
        >
          LINEで診断結果を送信する
        </button>
        <p className="text-white/70 text-xs mb-3">
          送信先で公式アカウントを選んでください
        </p>
        <button
          onClick={handleFriendAdd}
          className="text-white/60 text-xs underline"
        >
          まだの方はこちらで友だち追加
        </button>
      </div>
    );
  }

  // 初期状態
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
        onClick={handleFriendAdd}
        className="inline-block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50"
      >
        この結果をLINEで受け取る
      </button>
      <p className="text-white/60 text-xs mt-3">
        友だち追加 → メッセージ送信で届きます
      </p>
    </div>
  );
}
