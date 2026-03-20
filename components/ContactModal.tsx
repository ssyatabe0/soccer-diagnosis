'use client';

import { useState, useEffect } from 'react';
import { DiagnosisResult } from '@/lib/types';

type Props = {
  result: DiagnosisResult;
  onClose: () => void;
};

export default function ContactModal({ result, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // localStorage から事前登録情報を自動入力
  useEffect(() => {
    try {
      const raw = localStorage.getItem('soccer-diagnosis-user');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.name) setName(saved.name);
        if (saved.email) setEmail(saved.email);
      }
    } catch { /* ignore */ }
  }, []);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          resultId: result.id,
          typeName: result.type.name,
          lane: result.lane,
          tags: result.tags,
          totalScore: result.totalScore,
          answers: result.answers,
          createdAt: result.createdAt,
          resultUrl: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('CONTACT API ERROR:', data);
        setErrorMsg(data.error || '送信に失敗しました');
        setStatus('error');
        return;
      }

      console.log('CONTACT SUCCESS:', data);
      setStatus('sent');
    } catch (err) {
      console.error('CONTACT FATAL ERROR:', err);
      setErrorMsg('通信エラーが発生しました');
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {status === 'sent' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">&#10003;</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">送信が完了しました</h3>
            <p className="text-sm text-gray-600 mb-6">
              内容を確認のうえご連絡いたします。
            </p>
            <button
              onClick={onClose}
              className="bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-all"
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">お問い合わせ</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                &times;
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-green-700">
                <span className="font-bold">診断タイプ:</span> {result.type.name}
              </p>
              <p className="text-xs text-green-600 mt-1">
                診断結果をもとに、最適なご案内をいたします。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">お名前 *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="山田 太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ご相談内容</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="お子さんの状況やご質問など自由にご記入ください"
                />
              </div>

              {status === 'error' && (
                <p className="text-red-600 text-sm">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-full transition-all active:scale-95"
              >
                {status === 'sending' ? '送信中...' : '送信する'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
