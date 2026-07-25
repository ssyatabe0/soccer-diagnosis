import Link from 'next/link'
import type { Locale } from '@/data/cases'

const serviceLinks = {
  diagnosis: 'https://soccer-kateikyousi.com/soccer-diagnosis/',
  online: 'https://soccer-kateikyousi.com/オンラインレッスン一覧/',
  lesson: 'https://soccer-kateikyousi.com/谷田部の料金/',
  main: 'https://soccer-kateikyousi.com/',
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
            <small>{isJa ? 'THE YATABE METHOD / BETA' : 'THE YATABE METHOD / BETA'}</small>
          </span>
        </Link>
        <nav className="case-nav" aria-label={isJa ? 'メインナビゲーション' : 'Main navigation'}>
          <Link href={`${home}#search`}>{isJa ? '症状検索' : 'Search'}</Link>
          <Link href={`${home}#categories`}>{isJa ? 'カテゴリー' : 'Categories'}</Link>
          <a href={serviceLinks.diagnosis}>{isJa ? '診断' : 'Diagnosis'}</a>
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
          <a href={serviceLinks.diagnosis}>{isJa ? '改善診断' : 'Soccer diagnosis'}</a>
          <a href={serviceLinks.online}>{isJa ? 'オンライン診断' : 'Online diagnosis'}</a>
          <a href={serviceLinks.lesson}>{isJa ? '対面・個人レッスン' : 'In-person private training'}</a>
          <a href={serviceLinks.main}>{isJa ? '既存サイト' : 'Main website'}</a>
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
        <a href={serviceLinks.online}>
          <small>01</small>
          <b>{isJa ? 'オンライン診断' : 'Online diagnosis'}</b>
          <span>{isJa ? '動画から現在地を確認' : 'Review the current problem from video'}</span>
        </a>
        <a href={serviceLinks.diagnosis}>
          <small>02</small>
          <b>{isJa ? '対面診断' : 'In-person diagnosis'}</b>
          <span>{isJa ? 'その場で原因と変化を確認' : 'Identify the cause and test a change in person'}</span>
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
