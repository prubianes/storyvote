'use client'

import { useI18n } from '@/components/LanguageContext/languageContextProvider'

export default function GuidePage() {
  const { t } = useI18n()

  return (
    <main className="page-shell guide-shell">
      <section className="ui-panel guide-panel">
        <p className="micro-label">{t('header.guide')}</p>
        <h2 className="hero-title" style={{ fontSize: 'clamp(2.2rem, 5vw, 4.6rem)', marginTop: '0.8rem' }}>
          {t('guide.title')}
        </h2>
        <p className="hero-copy" style={{ marginTop: '0.9rem' }}>
          {t('guide.subtitle')}
        </p>
      </section>

      <section className="guide-grid">
        <article className="ui-panel guide-block">
          <p className="micro-label">{t('guide.quickTitle')}</p>
          <ol className="guide-list">
            <li>{t('guide.quick1')}</li>
            <li>{t('guide.quick2')}</li>
            <li>{t('guide.quick3')}</li>
            <li>{t('guide.quick4')}</li>
            <li>{t('guide.quick5')}</li>
          </ol>
        </article>

        <article className="ui-panel guide-block">
          <p className="micro-label">{t('guide.rolesTitle')}</p>
          <div className="guide-pairs">
            <div>
              <h3>{t('guide.roleTeamTitle')}</h3>
              <p>{t('guide.roleTeamDesc')}</p>
            </div>
            <div>
              <h3>{t('guide.roleAdminTitle')}</h3>
              <p>{t('guide.roleAdminDesc')}</p>
            </div>
          </div>
        </article>

        <article className="ui-panel guide-block">
          <p className="micro-label">{t('guide.roundTitle')}</p>
          <ul className="guide-list is-bulleted">
            <li>{t('guide.roundOpen')}</li>
            <li>{t('guide.roundRevealed')}</li>
            <li>{t('guide.roundClosed')}</li>
          </ul>
        </article>

        <article className="ui-panel guide-block">
          <p className="micro-label">{t('guide.tipsTitle')}</p>
          <ul className="guide-list is-bulleted">
            <li>{t('guide.tip1')}</li>
            <li>{t('guide.tip2')}</li>
            <li>{t('guide.tip3')}</li>
            <li>{t('guide.tip4')}</li>
          </ul>
        </article>
      </section>
    </main>
  )
}
