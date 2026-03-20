'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONS } from '@/lib/constants';
import { calculateDiagnosis } from '@/lib/diagnosis-logic';
import { supabase } from '@/lib/supabase';

export default function DiagnosisForm() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion) / QUESTIONS.length) * 100;

  async function handleSelect(optionIndex: number) {
    const newAnswers = [...answers, optionIndex];

    if (currentQuestion < QUESTIONS.length - 1) {
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsSubmitting(true);
      try {
        const id = crypto.randomUUID();
        const result = calculateDiagnosis(id, newAnswers);

        // diagnosis_results insert
        const { data, error } = await supabase
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

        if (error) {
          console.error('INSERT ERROR:', error);
          // DB保存失敗でも結果ページへ遷移（ローカル計算で表示可能）
        } else {
          console.log('INSERT SUCCESS:', data);
        }

        // users insert（失敗しても遷移はブロックしない）
        try {
          const { error: userError } = await supabase.from('users').insert({
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
          if (userError) {
            console.error('USERS INSERT ERROR:', userError);
          }
        } catch (ue) {
          console.error('USERS INSERT CATCH:', ue);
        }

        // 診断結果をlocalStorageに保存（DB失敗時のフォールバック）
        try {
          localStorage.setItem(`diagnosis-result-${id}`, JSON.stringify({
            id,
            typeId: result.type.id,
            typeName: result.type.name,
            lane: result.lane,
            tags: result.tags,
            totalScore: result.totalScore,
            answers: result.answers,
            createdAt: result.createdAt,
          }));
        } catch { /* ignore */ }

        router.push(`/diagnosis/result/${id}`);
      } catch (e) {
        console.error('FATAL ERROR:', e);
        alert('エラーが発生しました');
        setIsSubmitting(false);
      }
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
