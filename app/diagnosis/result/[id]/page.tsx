import ResultCard from '@/components/ResultCard';
import ResultFallback from '@/components/ResultFallback';
import { DIAGNOSIS_TYPES, SUB_LABELS } from '@/lib/constants';
import type { DiagnosisResult, Lane, TargetTag } from '@/lib/types';

async function getResult(id: string): Promise<DiagnosisResult | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[result] Supabase not configured');
    return null;
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const res = await fetch(
      `${cleanUrl}/rest/v1/diagnosis_results?id=eq.${id}&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.error('[result] Supabase fetch failed:', res.status);
      return null;
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      console.error('[result] No result found for id:', id);
      return null;
    }

    const row = data[0];
    const type = DIAGNOSIS_TYPES.find(t => t.id === row.type_id) || DIAGNOSIS_TYPES[0];
    const tags: TargetTag[] = row.tags || [];
    return {
      id: row.id,
      type,
      lane: row.lane as Lane,
      tags,
      subLabels: tags.map(t => SUB_LABELS[t]),
      totalScore: row.total_score,
      answers: row.answers,
      createdAt: row.created_at,
    };
  } catch (err) {
    console.error('[result] Error:', err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getResult(id);
  if (!result) return { title: '診断結果 | サッカー才能の出し方診断' };

  return {
    title: `${result.type.name} | サッカー才能の出し方診断`,
    description: result.type.oneWord,
    openGraph: {
      title: `サッカー才能の出し方診断：${result.type.name}`,
      description: result.type.oneWord,
      images: [`/api/og?typeId=${result.type.id}&tags=${result.tags.join(',')}`],
    },
  };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getResult(id);

  // DB取得成功 → サーバーで描画
  if (result) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-100 py-3 px-4">
          <p className="text-center text-green-700 font-bold text-sm">
            サッカー才能の出し方診断 - 結果
          </p>
        </header>
        <main className="flex-1 py-8">
          <ResultCard result={result} />
        </main>
      </div>
    );
  }

  // DB取得失敗 → クライアントでlocalStorageから復元
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 py-3 px-4">
        <p className="text-center text-green-700 font-bold text-sm">
          サッカー才能の出し方診断 - 結果
        </p>
      </header>
      <main className="flex-1 py-8">
        <ResultFallback id={id} />
      </main>
    </div>
  );
}
