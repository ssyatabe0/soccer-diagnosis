'use client';

import { useState } from 'react';
import { DiagnosisResult } from '@/lib/types';
import { generateShareText } from '@/lib/diagnosis-logic';

export default function ShareButtons({ result }: { result: DiagnosisResult }) {
  const [copied, setCopied] = useState(false);
  const shareText = generateShareText(result);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const fullShareText = `${shareText}\n${shareUrl}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullShareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  function handleLineShare() {
    const encoded = encodeURIComponent(fullShareText);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encoded}`, '_blank');
  }

  function handleTwitterShare() {
    const encoded = encodeURIComponent(fullShareText);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-bold text-gray-900 text-sm mb-3 text-center">
        同じチームの子にもシェア
      </h2>
      <p className="text-gray-500 text-xs text-center mb-4">
        同じタイプかも？ 試してみてって送ってみよう
      </p>

      {/* Share Text Preview */}
      <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600 whitespace-pre-wrap">
        {shareText}
      </div>

      <div className="space-y-2">
        {/* LINE Share */}
        <button
          onClick={handleLineShare}
          className="w-full bg-[#06C755] text-white font-bold py-3 rounded-full text-sm transition-all hover:bg-[#05b34d] active:scale-95"
        >
          LINEで送る
        </button>

        {/* Twitter Share */}
        <button
          onClick={handleTwitterShare}
          className="w-full bg-black text-white font-bold py-3 rounded-full text-sm transition-all hover:bg-gray-800 active:scale-95"
        >
          Xでシェアする
        </button>

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-full text-sm transition-all hover:bg-gray-200 active:scale-95"
        >
          {copied ? 'コピーしました！' : 'テキストをコピー'}
        </button>
      </div>
    </div>
  );
}
