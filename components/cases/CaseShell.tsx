import Link from 'next/link'
import type { Locale } from '@/data/cases'

const serviceLinks = {
  database: 'https://soccer-kateikyousi.com/cases/',
  causeDiagnosis: '/cause-diagnosis',
  diagnosis: 'https://soccer-kateikyousi.com/diagnosis/check/',
  online: 'https://soccer-kateikyousi.com/オンラインレッスン一覧/',
  lesson: 'https://soccer-kateikyousi.com/谷田部の料金/',
}

export function CaseShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const isJa = locale === 'ja'
  const home = isJa ? '/cases' : '/en/cases'
  const switchHref = isJa ? '/en/cases' : '/cases'

  return (
    <div className="case-site">
      <header className="case-header">
        <Link href={home} className="case-brand" aria-label={isJa ? 'サッカー症例データベース' : 'Soccer Case Database'}>
          <span className="case-brand-mark">Y</span>
          <span>
            <b>{isJa ? 'サッカー症例データベース' : 'Soccer Case Database'}</b>
            <small>THE YATABE METHOD</small>
          </span>
        </Link>
        <nav className="case-nav" aria-label={isJa ? 'メインナビゲーション' : 'Main navigation'}>
          <Link href={`${home}#search`}>{isJa ? '症状検索' : 'Search'}</Link>
          <Link href={`${home}#categories`}>{isJa ? 'カテゴリー' : 'Categories'}</Link>
          <a href={serviceLinks.database}>{isJa ? '公式DB' : 'Official DB'}</a>
          <Link href={serviceLinks.causeDiagnosis}>{isJa ? 'AI原因診断' : 'AI Cause Diagnosis'}</Link>
          <Link href={switchHref} className="case-lang">{isJa ? 'EN' : '日本語'}</Link>
        </nav>
      </header>
      {children}
      <footer className="case-footer">
        <div>
          <p className="case-eyebrow">THE YATABE METHOD</p>
          <h2>{isJa ? 'できないには、理由がある。' : 'There is a reason a skill breaks down.'}</h2>
          <p>
            {isJa
              ? '症例を見る。似た悩みを探す。必要なときだけ、自分の原因を診断する。'
              : 'Read a case. Find a similar problem. Request a personal diagnosis only when you need one.'}
          </p>
        </div>
        <div className="case-footer-links">
          <Link href={serviceLinks.causeDiagnosis}>{isJa ? '動画AI原因診断' : 'AI cause diagnosis'}</Link>
          <a href={serviceLinks.diagnosis}>{isJa ? '改善診断' : 'Soccer diagnosis'}</a>
          <a href={serviceLinks.online}>{isJa ? 'オンライン診断' : 'Online diagnosis'}</a>
          <a href={serviceLinks.lesson}>{isJa ? '対面・個人レッスン' : 'In-person private training'}</a>
          <a href={serviceLinks.database}>{isJa ? '公式症例DB' : 'Official case database'}</a>
        </div>
        <p className="case-subservice">
          {isJa
            ? '保護者向けサービス「帰り道コーチ」は、本データベースを利用する下層サービスとして継続します。'
            : 'Kaerimichi Coach remains a parent-facing service that will use this database.'}
        </p>
      </footer>
    </div>
  )
}

export function DiagnosisPath({ locale }: { locale: Locale }) {
  const isJa = locale === 'ja'
  return (
    <section className="case-next-step">
      <p className="case-eyebrow">{isJa ? 'もっと詳しく診断したい方へ' : 'WHEN YOU NEED A PERSONAL DIAGNOSIS'}</p>
      <h2>{isJa ? '似た症例でも、原因は同じとは限りません。' : 'A similar symptom does not always have the same cause.'}</h2>
      <p>
        {isJa
          ? '症例を比較したうえで、必要な入口だけを選べます。料金や内容は既存サービスの掲載情報をご確認ください。'
          : 'Compare cases first, then choose only the level of support you need. Current services and fees remain on the main website.'}
      </p>
      <div className="case-next-grid">
        <Link href={serviceLinks.causeDiagnosis}>
          <small>01</small>
          <b>{isJa ? '動画AI原因診断' : 'AI cause diagnosis'}</b>
          <span>{isJa ? '観察事実と原因候補を出す' : 'Generate observations and cause hypotheses'}</span>
        </Link>
        <a href={serviceLinks.online}>
          <small>02</small>
          <b>{isJa ? '動画・オンライン診断' : 'Video diagnosis'}</b>
          <span>{isJa ? '谷田部が原因を確認' : 'Have Yatabe review the cause'}</span>
        </a>
        <a href={serviceLinks.lesson}>
          <small>03</small>
          <b>{isJa ? '個人レッスン' : 'Private training'}</b>
          <span>{isJa ? '診断後の改善を深める' : 'Build on the diagnosis through individual training'}</span>
        </a>
      </div>
    </section>
  )
}
