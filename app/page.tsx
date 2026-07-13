'use client'

import { RoomContext } from '@/components/RoomContext/roomContextProvider'
import {
  ensureRoom,
  getOrCreateSessionId,
  roomExists,
  upsertParticipantPresence,
} from '@/system/supabase'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'
import { useTheme } from '@/components/theme/useTheme'
import { useRouter } from 'next/navigation'
import { useContext, useEffect, useState, type SyntheticEvent } from 'react'

export default function Page() {
  const router = useRouter()
  const { t } = useI18n()
  const { setUser, setRoom } = useContext(RoomContext)
  const theme = useTheme()
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
      <div className="ui-panel landing-panel">
        <div className="landing-form-col">
          <span className="landing-badge">{t('home.badge')}</span>
          <h2 className="landing-title">{t('home.welcome')}</h2>
          <p className="landing-desc">{t('home.description')}</p>

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="ui-btn is-accent"
              style={{ padding: '13px', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}
            >
              {isSubmitting ? t('home.entering') : t('home.enter')}
            </button>

            {formError ? <p className="error-text">{formError}</p> : null}
          </form>
        </div>

        <div className="landing-info-col">
          <img
            src={theme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
            alt="StoryVote"
            className="landing-logo"
          />
          <p className="landing-metric-desc">{t('home.metricBody')}</p>

          <div className="landing-features">
            <div className="landing-feature-item">
              <span className="landing-feature-dot" />
              {t('home.featureTitle')}
            </div>
            <div className="landing-feature-item">
              <span className="landing-feature-dot" />
              {t('home.featureBody')}
            </div>
            <div className="landing-feature-item">
              <span className="landing-feature-dot" />
              {t('home.metricBody')}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
