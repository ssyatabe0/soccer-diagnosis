import DiagnosisForm from '@/components/DiagnosisForm';

export const metadata = {
  title: '診断開始 | サッカー才能の出し方診断',
};

export default function DiagnosisPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-3 px-4">
        <p className="text-center text-green-700 font-bold text-sm">
          サッカー才能の出し方診断
        </p>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col justify-center py-8">
        <DiagnosisForm />
      </main>
    </div>
  );
}
