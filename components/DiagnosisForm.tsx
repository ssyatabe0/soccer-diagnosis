'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONS } from '@/lib/constants';
import { PREFECTURES } from '@/lib/prefectures';
import { calculateDiagnosis } from '@/lib/diagnosis-logic';
import { supabase } from '@/lib/supabase';

type UserInfo = {
  name: string;
  email: string;
  prefecture: string;
};

const STORAGE_KEY = 'soccer-diagnosis-user';

function loadUserInfo(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

function saveUserInfo(info: UserInfo) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function DiagnosisForm() {
  const router = useRouter();

  // Phase: 'input' → 'quiz' → 'submitting'
  const [phase, setPhase] = useState<'input' | 'quiz' | 'submitting'>('input');

  // User info
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPrefecture, setUserPrefecture] = useState('');
  const [inputErrors, setInputErrors] = useState<string[]>([]);

  // Quiz
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  // Restore from localStorage
  useEffect(() => {
    const saved = loadUserInfo();
    if (saved) {
      setUserName(saved.name);
      setUserEmail(saved.email);
      setUserPrefecture(saved.prefecture);
    }
  }, []);

  // --- Input Phase ---
  function handleStartDiagnosis() {
    const errors: string[] = [];
    if (!userName.trim()) errors.push('お名前を入力してください');
    if (!userEmail.trim()) {
      errors.push('メールアドレスを入力してください');
    } else if (!isValidEmail(userEmail.trim())) {
      errors.push('メールアドレスの形式が正しくありません');
    }
    if (!userPrefecture) errors.push('都道府県を選択してください');

    if (errors.length > 0) {
      setInputErrors(errors);
      return;
    }

    setInputErrors([]);
    const info: UserInfo = {
      name: userName.trim(),
      email: userEmail.trim(),
      prefecture: userPrefecture,
    };
    saveUserInfo(info);
    setPhase('quiz');
  }

  // --- Quiz Phase ---
  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion) / QUESTIONS.length) * 100;

  async function handleSelect(optionIndex: number) {
    const newAnswers = [...answers, optionIndex];

    if (currentQuestion < QUESTIONS.length - 1) {
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setPhase('submitting');
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
          alert('保存エラー: ' + error.message);
          setPhase('quiz');
          return;
        }

        console.log('INSERT SUCCESS:', data);

        // users insert（name, email, prefecture 含む）
        const { error: userError } = await supabase.from('users').insert({
          id: id,
          diagnosis_result_id: id,
          type_id: result.type.id,
          type_name: result.type.name,
          lane: result.lane,
          tags: result.tags,
          total_score: result.totalScore,
          name: userName.trim(),
          email: userEmail.trim(),
          prefecture: userPrefecture,
          line_delivery_step: 0,
          conversion_status: 'new',
          staff_required: result.lane === 'C',
          selection_priority: result.tags.includes('selection'),
        });

        if (userError) {
          console.error('USERS INSERT ERROR:', userError);
        }

        router.push(`/diagnosis/result/${id}`);
      } catch (e) {
        console.error('FATAL ERROR:', e);
        alert('エラーが発生しました');
        setPhase('quiz');
      }
    }
  }

  function handleBack() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
    }
  }

  // --- Render: Submitting ---
  if (phase === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-600 font-medium">診断結果を分析中...</p>
        <p className="text-gray-400 text-sm mt-2">お子さんの才能の出し方を見つけています</p>
      </div>
    );
  }

  // --- Render: Input Phase ---
  if (phase === 'input') {
    return (
      <div className="w-full max-w-lg mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">
            まずは簡単な情報入力
          </h2>
          <p className="text-green-600 text-sm font-medium">
            30秒で診断できます
          </p>
        </div>

        <div className="space-y-5">
          {/* お名前 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* 都道府県 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              都道府県 <span className="text-red-500">*</span>
            </label>
            <select
              value={userPrefecture}
              onChange={e => setUserPrefecture(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="">選択してください</option>
              {PREFECTURES.map(pref => (
                <option key={pref} value={pref}>{pref}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Errors */}
        {inputErrors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
            {inputErrors.map((err, i) => (
              <p key={i} className="text-red-600 text-sm">{err}</p>
            ))}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStartDiagnosis}
          className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-4 rounded-full shadow-lg shadow-green-200 transition-all active:scale-95"
        >
          無料診断を始める
        </button>

        <p className="text-gray-400 text-xs mt-4 text-center">
          ※ 個人情報は診断結果のご案内にのみ使用します
        </p>
      </div>
    );
  }

  // --- Render: Quiz Phase ---
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
