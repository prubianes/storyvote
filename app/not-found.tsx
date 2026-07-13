'use client'

import Link from 'next/link'

import { useI18n } from '@/components/LanguageContext/languageContextProvider'

export default function NotFound() {
  const { t } = useI18n()

  return (
    <main className="page-shell not-found-shell">
      <section className="ui-panel not-found-panel">
        <span className="landing-badge">{t('notFound.badge')}</span>
        <h2 className="landing-title" style={{ marginTop: '14px' }}>
          {t('notFound.title')}
        </h2>
        <p className="landing-desc not-found-desc">{t('notFound.description')}</p>

        <Link href="/" className="ui-btn is-accent">
          {t('notFound.cta')}
        </Link>
      </section>
    </main>
  )
}
