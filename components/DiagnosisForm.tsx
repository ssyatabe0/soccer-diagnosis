'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONS } from '@/lib/constants';
import { calculateDiagnosis } from '@/lib/diagnosis-logic';
import { createClient } from '@supabase/supabase-js';

// クライアント側で明示的にSupabase初期化（環境変数をランタイムで取得）
function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  console.log('[supabase] init url:', url ? url.substring(0, 30) + '...' : 'EMPTY');
  console.log('[supabase] init key:', key ? key.substring(0, 15) + '...' : 'EMPTY');
  if (!url || !key || url.includes('placeholder')) {
    return null;
  }
  return createClient(url.replace(/\/+$/, ''), key);
}

export default function DiagnosisForm() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion) / QUESTIONS.length) * 100;

  async function handleSelect(optionIndex: number) {
    const newAnswers = [...answers, optionIndex];

    if (currentQuestion < QUESTIONS.length - 1) {
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsSubmitting(true);
      setSaveError('');

      const id = crypto.randomUUID();
      const result = calculateDiagnosis(id, newAnswers);

      console.log('[save] resultId:', id);
      console.log('[save] type:', result.type.name, 'lane:', result.lane);

      // localStorage保存（フォールバック）
      try {
        localStorage.setItem(`diagnosis-result-${id}`, JSON.stringify({
          id, typeId: result.type.id, typeName: result.type.name,
          lane: result.lane, tags: result.tags, totalScore: result.totalScore,
          answers: result.answers, createdAt: result.createdAt,
        }));
      } catch { /* ignore */ }

      // Supabase insert
      const supabase = getClient();

      if (!supabase) {
        console.error('[save] Supabase client is null (env vars missing)');
        setSaveError('Supabase接続設定がありません。管理者に連絡してください。');
        setIsSubmitting(false);
        return;
      }

      // diagnosis_results insert
      console.log('[save] inserting diagnosis_results...');
      const { data: drData, error: drError } = await supabase
        .from('diagnosis_results')
        .insert({
          id: id,
          type_id: result.type.id,
          type_name: result.type.name,
          lane: result.lane,
          tags: result.tags,
          total_score: result.totalScore,
          answers: result.answers,
          created_at: result.createdAt,
        })
        .select();

      if (drError) {
        console.error('[save] diagnosis_results ERROR:', drError.message, drError.code, drError.details, drError.hint);
        setSaveError(`保存エラー: ${drError.message} (${drError.code || ''})`);
        setIsSubmitting(false);
        return;
      }

      console.log('[save] diagnosis_results OK:', drData);

      // users insert（失敗しても遷移はする）
      console.log('[save] inserting users...');
      const { error: uError } = await supabase.from('users').insert({
        id: id,
        diagnosis_result_id: id,
        type_id: result.type.id,
        type_name: result.type.name,
        lane: result.lane,
        tags: result.tags,
        total_score: result.totalScore,
        line_delivery_step: 0,
        conversion_status: 'new',
        staff_required: result.lane === 'C',
        selection_priority: result.tags.includes('selection'),
      });

      if (uError) {
        console.error('[save] users ERROR:', uError.message, uError.code);
      } else {
        console.log('[save] users OK');
      }

      // DB成功フラグ
      try {
        localStorage.setItem(`diagnosis-db-${id}`, 'ok');
      } catch { /* ignore */ }

      // メール通知（非同期）
      fetch('/api/notify-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId: id, typeId: result.type.id, typeName: result.type.name,
          lane: result.lane, tags: result.tags, totalScore: result.totalScore,
          answers: result.answers, createdAt: result.createdAt,
        }),
      }).catch(e => console.log('[notify] error', e));

      // 保存成功 → 結果ページへ
      console.log('[save] success, navigating to /diagnosis/result/' + id);
      router.push(`/diagnosis/result/${id}`);
    }
  }

  function handleBack() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
    }
  }

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-600 font-medium">診断結果を分析中...</p>
        <p className="text-gray-400 text-sm mt-2">お子さんの才能の出し方を見つけています</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Save Error */}
      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm font-medium">エラーが発生しました</p>
          <p className="text-red-600 text-xs mt-1">{saveError}</p>
          <button
            onClick={() => { setSaveError(''); setIsSubmitting(false); }}
            className="mt-3 bg-red-600 text-white text-sm font-bold py-2 px-6 rounded-full"
          >
            もう一度やり直す
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Q{currentQuestion + 1} / {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {question.text}
        </h2>
        {question.description && (
          <p className="text-sm text-gray-500">{question.description}</p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            className="w-full text-left bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-4 transition-all active:scale-[0.98] text-sm font-medium text-gray-800"
          >
            {option.text}
          </button>
        ))}
      </div>

      {/* Back Button */}
      {currentQuestion > 0 && (
        <button
          onClick={handleBack}
          className="mt-4 text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          ← 前の質問に戻る
        </button>
      )}
    </div>
  );
}
