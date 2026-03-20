import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Header */}
      <header className="w-full bg-green-700 text-white py-3 px-4 text-center">
        <p className="text-xs tracking-wide">サッカー技術の病院 &times; 無料AI技術診断</p>
      </header>

      {/* Hero */}
      <main className="flex flex-col items-center w-full max-w-lg mx-auto px-4 pt-8 pb-16">
        <div className="text-center mb-8">
          <p className="text-green-700 font-bold text-sm mb-2">無料でタイプをチェック・30秒で完了</p>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-4">
            サッカー才能の
            <br />
            <span className="text-green-600">出し方</span>診断
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            お子さんの才能は「ない」のではなく
            <br />
            「出し方」がまだ見つかっていないだけかもしれません
          </p>
        </div>

        {/* Key Points */}
        <div className="w-full space-y-3 mb-8">
          {[
            { icon: '⚡', text: '30秒・10問で完了' },
            { icon: '🔍', text: '12タイプから才能の出し方を診断' },
            { icon: '📋', text: '具体的な改善ポイントがわかる' },
            { icon: '🏥', text: 'サッカー技術の病院と連動' },
          ].map((item, i) => (
            <div key={i} className="flex items-center bg-white rounded-xl shadow-sm p-4 border border-green-100">
              <span className="text-2xl mr-3">{item.icon}</span>
              <span className="text-gray-800 text-sm font-medium">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Target Messages */}
        <div className="w-full bg-green-50 rounded-xl p-5 mb-8 border border-green-200">
          <p className="text-green-800 font-bold text-sm mb-3">こんなお子さんにおすすめ</p>
          <div className="space-y-2 text-sm text-green-700">
            {[
              'サッカーを始めたばかりで土台を作りたい',
              '低学年のうちから正しい方向で伸ばしたい',
              '周りより遅く始めたけど追いつきたい',
              '練習しているのになかなか上手くならない',
              'セレクション前に見直すポイントを整理したい',
            ].map((text, i) => (
              <div key={i} className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/diagnosis"
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-4 px-8 rounded-full text-center shadow-lg shadow-green-200 transition-all active:scale-95"
        >
          無料でタイプをチェック（30秒）
        </Link>

        <p className="text-gray-400 text-xs mt-4 text-center">
          ※ 登録不要・完全無料で診断できます
        </p>

        {/* Trust Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-xs mb-2">運営</p>
          <p className="text-gray-700 text-sm font-medium">サッカー家庭教師</p>
          <p className="text-gray-400 text-xs mt-1">サッカー技術の病院</p>
        </div>
      </main>
    </div>
  );
}
