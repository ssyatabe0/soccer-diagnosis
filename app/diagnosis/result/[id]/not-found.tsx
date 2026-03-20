import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">診断結果が見つかりません</h1>
      <p className="text-gray-500 text-sm mb-8">
        この診断結果は存在しないか、期限切れの可能性があります。
      </p>
      <Link
        href="/"
        className="bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-all"
      >
        もう一度診断する
      </Link>
    </div>
  );
}
