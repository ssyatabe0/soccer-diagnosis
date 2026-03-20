'use client';

import { useState } from 'react';
import { DiagnosisResult } from '@/lib/types';

// 友だち追加URL（確実に開く）
const LINE_FRIEND_URL = 'https://lin.ee/q7xbzrk';

export default function LineCTA({ result }: { result: DiagnosisResult }) {
  const [opened, setOpened] = useState(false);

  function handleClick() {
    console.log('[LineCTA] resultId:', result.id);
    console.log('[LineCTA] typeName:', result.type.name);
    console.log('[LineCTA] opening:', LINE_FRIEND_URL);

    // まず友だち追加画面を開く
    window.open(LINE_FRIEND_URL, '_blank');
    setOpened(true);

    // resultIdをlocalStorageに保存（友だち追加後にLINEから送る用）
    try {
      localStorage.setItem('line-pending-result', JSON.stringify({
        resultId: result.id,
        typeName: result.type.name,
        lane: result.lane,
        tags: result.tags,
      }));
    } catch { /* ignore */ }
  }

  function handleCopyMessage() {
    const text = `診断結果を見ました\nresultId=${result.id}\ntype=${result.type.name}\nlane=${result.lane}\ntags=${result.tags.join(',')}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('メッセージをコピーしました。LINEのトーク画面に貼り付けて送信してください。');
    }).catch(() => {
      // フォールバック: テキスト選択
      prompt('以下をコピーしてLINEで送信してください:', text);
    });
  }

  if (opened) {
    return (
      <div className="bg-gradient-to-br from-[#06C755] to-[#05a347] rounded-2xl p-6 mb-4 text-white text-center shadow-lg">
        <div className="text-4xl mb-3">&#10003;</div>
        <h3 className="text-lg font-extrabold mb-2">
          LINEが開きました
        </h3>
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          友だち追加後、以下のメッセージを送ると<br />続きの結果が届きます
        </p>
        <button
          onClick={handleCopyMessage}
          className="w-full bg-white text-[#06C755] font-bold py-3 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50 mb-3"
        >
          結果送信用メッセージをコピー
        </button>
        <button
          onClick={handleClick}
          className="text-white/70 text-xs underline"
        >
          もう一度LINEを開く
        </button>
      </div>
    );
  }

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
        className="inline-block w-full bg-white text-[#06C755] font-bold py-4 px-6 rounded-full shadow-md transition-all active:scale-95 hover:bg-green-50"
      >
        この結果をLINEで受け取る
      </button>
      <p className="text-white/60 text-xs mt-3">
        友だち追加後に続きの結果が届きます
      </p>
    </div>
  );
}
