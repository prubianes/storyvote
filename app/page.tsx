'use client'

import { RoomContext } from '@/components/RoomContext/roomContextProvider'
import {
  ensureRoom,
  getOrCreateSessionId,
  roomExists,
  upsertParticipantPresence,
} from '@/system/supabase'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'
import { useRouter } from 'next/navigation'
import { useContext, useEffect, useState, type SyntheticEvent } from 'react'

export default function Page() {
  const router = useRouter()
  const { t } = useI18n()
  const { setUser, setRoom } = useContext(RoomContext)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user')
    const storedRoom = sessionStorage.getItem('room') || localStorage.getItem('room')

    if (storedUser && storedRoom) {
      void upsertParticipantPresence(storedRoom, storedUser, false)
      void fetch(`/api/admin/session?room=${encodeURIComponent(storedRoom)}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => undefined)
    }

    sessionStorage.removeItem('user')
    sessionStorage.removeItem('room')
    localStorage.removeItem('user')
    localStorage.removeItem('room')
    setUser('')
    setRoom('')
  }, [setRoom, setUser])

  const handleForm = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError('')

    try {
      const formData = new FormData(e.currentTarget)

      const username = String(formData.get('user') ?? '').trim()
      const selectedRoom = String(formData.get('room') ?? '').trim()
      const adminPasscode = String(formData.get('adminPasscode') ?? '').trim()
      const normalizedRoom = selectedRoom.toLowerCase()

      if (!username || !selectedRoom) {
        return
      }

      if (normalizedRoom === 'guide') {
        setUser('')
        setRoom('')
        setFormError(t('home.reservedRoomName'))
        return
      }

      const exists = await roomExists(selectedRoom)
      if (!exists && !adminPasscode) {
        setUser('')
        setRoom('')
        setFormError(t('home.newRoomNeedsPasscode'))
        return
      }

      if (!exists) {
        await ensureRoom(selectedRoom, adminPasscode)
      }

      setUser(username)
      setRoom(selectedRoom)
      await upsertParticipantPresence(selectedRoom, username, true)

      sessionStorage.setItem('user', username)
      sessionStorage.setItem('room', selectedRoom)
      getOrCreateSessionId()
      router.push(`/${selectedRoom}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="landing-grid">
        <article className="landing-main">
          <section className="ui-panel title-panel">
            <p className="micro-label">{t('home.badge')}</p>
            <h2 className="hero-title">{t('home.welcome')}</h2>
          </section>

          <section className="ui-panel form-panel">
            <p className="hero-copy">{t('home.description')}</p>
            <form onSubmit={handleForm} className="hero-form">
              <label className="field">
                <span className="field-label">{t('home.name')}</span>
                <input
                  type="text"
                  id="user"
                  name="user"
                  placeholder={t('home.namePlaceholder')}
                  required
                  className="field-input"
                />
              </label>

              <label className="field">
                <span className="field-label">{t('home.room')}</span>
                <input
                  type="text"
                  id="room"
                  name="room"
                  placeholder={t('home.roomPlaceholder')}
                  required
                  className="field-input"
                />
              </label>

              <label className="field">
                <span className="field-label">{t('home.adminPasscodeOptional')}</span>
                <input
                  type="password"
                  id="adminPasscode"
                  name="adminPasscode"
                  placeholder={t('home.adminPasscodePlaceholder')}
                  className="field-input"
                />
              </label>

              <button type="submit" disabled={isSubmitting} className="ui-btn is-cyan">
                {isSubmitting ? t('home.entering') : t('home.enter')}
              </button>

              {formError ? <p className="error-text">{formError}</p> : null}
            </form>
          </section>
        </article>

        <aside className="landing-side">
          <section className="ui-panel note-panel">
            <p className="micro-label">{t('room.currentStory')}</p>
            <h3 style={{ marginTop: '0.8rem', fontSize: 'clamp(2.4rem, 4.4vw, 4.8rem)' }}>
              {t('home.featureTitle')}
            </h3>
            <p className="hero-copy" style={{ marginTop: '0.8rem' }}>
              {t('home.featureBody')}
            </p>
          </section>

          <section className="ui-panel metric-panel">
            <p className="micro-label" style={{ color: 'rgba(255, 246, 239, 0.78)' }}>
              {t('aside.votesCast')}
            </p>
            <span className="metric-value">08</span>
            <p style={{ margin: 0, lineHeight: 1.55 }}>{t('home.metricBody')}</p>
          </section>
        </aside>
      </section>
    </main>
  )
}
