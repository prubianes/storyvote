'use client'

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import type { HistoryRound } from '@/system/supabase'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'
import { exportHistoryPdf } from '@/components/admin/exportHistoryPdf'

interface AdminInlinePanelProps {
  roomSlug: string
  roundStatus: 'open' | 'revealed' | 'closed'
  currentStory: string
  historyRounds: HistoryRound[]
  onRoomUpdated: () => Promise<void> | void
}

export default function AdminInlinePanel({
  roomSlug,
  roundStatus,
  currentStory,
  historyRounds,
  onRoomUpdated,
}: AdminInlinePanelProps) {
  const { language, locale, t } = useI18n()
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [storyDraft, setStoryDraft] = useState('')

  useEffect(() => {
    setStoryDraft((current) => (current.trim() ? current : currentStory ?? ''))
  }, [currentStory])

  useEffect(() => {
    if (!roomSlug) {
      return
    }

    async function restoreAdminSession() {
      try {
        const response = await fetch(`/api/admin/session?room=${encodeURIComponent(roomSlug)}`)
        const payload = (await response.json()) as { authorized?: boolean }
        setIsAuthorized(Boolean(payload.authorized))
      } catch {
        setIsAuthorized(false)
      } finally {
        setIsCheckingSession(false)
      }
    }

    void restoreAdminSession()
  }, [roomSlug])

  const roundStatusLabel = useMemo(
    () =>
      roundStatus === 'open'
        ? t('admin.roundOpen')
        : roundStatus === 'revealed'
          ? t('admin.roundRevealed')
          : t('admin.roundClosed'),
    [roundStatus, t]
  )

  const handleAuth = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')

    const formData = new FormData(e.currentTarget)
    const passcode = String(formData.get('passcode') ?? '').trim()

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: roomSlug, passcode }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ error: t('admin.invalidPasscode') }))) as {
          error?: string
        }
        setAuthError(payload.error ?? t('admin.invalidPasscode'))
        return
      }

      setIsAuthorized(true)
      await onRoomUpdated()
    } catch {
      setAuthError(t('admin.passcodeValidationError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStoryForm = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (roundStatus !== 'open') {
      setAuthError(t('admin.storyOnlyWhenOpen'))
      return
    }

    const story = storyDraft.trim()
    if (!story) {
      setAuthError(t('admin.storyEmpty'))
      return
    }

    setIsSubmitting(true)
    setAuthError('')
    try {
      const response = await fetch('/api/admin/story', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: roomSlug, story }),
      })

      if (response.status === 401) {
        setIsAuthorized(false)
        setAuthError(t('admin.sessionExpired'))
        return
      }
      if (!response.ok) {
        setAuthError(t('admin.storyUpdateFailed'))
        return
      }

      await onRoomUpdated()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    setIsSubmitting(true)
    setAuthError('')
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: roomSlug }),
      })

      if (response.status === 401) {
        setIsAuthorized(false)
        setAuthError(t('admin.sessionExpired'))
      } else if (!response.ok) {
        setAuthError(t('admin.resetFailed'))
      } else {
        await onRoomUpdated()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleRound = async () => {
    if (roundStatus === 'closed' && !storyDraft.trim()) {
      setAuthError(t('admin.storyRequiredToOpen'))
      return
    }

    setIsSubmitting(true)
    setAuthError('')
    try {
      const endpoint = roundStatus === 'closed' ? '/api/admin/round/start' : '/api/admin/round/end'
      const body = roundStatus === 'closed'
        ? { room: roomSlug, story: storyDraft.trim() || null }
        : { room: roomSlug }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.status === 401) {
        setIsAuthorized(false)
        setAuthError(t('admin.sessionExpired'))
      } else if (!response.ok) {
        setAuthError(roundStatus !== 'closed' ? t('admin.closeRoundFailed') : t('admin.openRoundFailed'))
      } else {
        if (roundStatus !== 'closed') {
          setStoryDraft('')
        }
        await onRoomUpdated()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevealRound = async () => {
    if (roundStatus !== 'open') {
      return
    }
    setIsSubmitting(true)
    setAuthError('')
    try {
      const response = await fetch('/api/admin/round/reveal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: roomSlug }),
      })

      if (response.status === 401) {
        setIsAuthorized(false)
        setAuthError(t('admin.sessionExpired'))
      } else if (!response.ok) {
        setAuthError(t('admin.revealRoundFailed'))
      } else {
        await onRoomUpdated()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReopenRound = async () => {
    if (roundStatus !== 'revealed') {
      return
    }
    setIsSubmitting(true)
    setAuthError('')
    try {
      const response = await fetch('/api/admin/round/reopen', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ room: roomSlug }),
      })

      if (response.status === 401) {
        setIsAuthorized(false)
        setAuthError(t('admin.sessionExpired'))
      } else if (!response.ok) {
        setAuthError(t('admin.reopenRoundFailed'))
      } else {
        await onRoomUpdated()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const roundControlLabel =
    roundStatus === 'closed' ? t('admin.openRound') : t('admin.closeRound')

  const roundControlTone = roundStatus === 'closed' ? 'is-mint' : 'is-blue'

  const canRevealRound = roundStatus === 'open'
  const canReopenRound = roundStatus === 'revealed'

  const handleExportPdf = () => {
    if (!historyRounds.length) {
      return
    }

    setIsExporting(true)
    setAuthError('')
    try {
      const opened = exportHistoryPdf({ historyRounds, roomSlug, language, locale, t })
      if (!opened) {
        setAuthError(t('admin.exportWindowFailed'))
      }
    } finally {
      setIsExporting(false)
    }
  }

  if (isCheckingSession) {
    return null
  }

  if (!isAuthorized) {
    if (!showAuthForm) {
      return (
        <div>
          <button type="button" onClick={() => setShowAuthForm(true)} className="ui-btn is-accent" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
            {t('admin.modeButton')}
          </button>
        </div>
      )
    }

    return (
      <div>
        <p className="micro-label" style={{ marginBottom: '8px' }}>{t('admin.modeTitle')}</p>
        <p style={{ color: 'var(--muted)', margin: '0 0 14px', fontSize: '13px', lineHeight: 1.5 }}>{t('admin.modeDescription')}</p>
        <form key="auth-form" onSubmit={handleAuth} style={{ display: 'grid', gap: '8px' }}>
          <input
            type="password"
            id="passcode-inline"
            name="passcode"
            placeholder="Passcode"
            className="field-input"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button type="submit" disabled={isSubmitting} className="ui-btn is-accent" style={{ justifyContent: 'center', padding: '11px' }}>
              {isSubmitting ? t('admin.entering') : t('admin.enter')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAuthForm(false)
                setAuthError('')
              }}
              className="ui-btn"
              style={{ justifyContent: 'center', padding: '11px' }}
            >
              {t('admin.cancel')}
            </button>
          </div>
        </form>
        {authError ? <p className="error-text">{authError}</p> : null}
      </div>
    )
  }

  return (
    <div>
      <div className="facilitator-header">
        <span className="facilitator-title">{t('admin.panelTitle')}</span>
        <span
          className={`status-chip ${
            roundStatus === 'open' ? 'is-open' : roundStatus === 'revealed' ? 'is-revealed' : 'is-closed'
          }`}
        >
          {roundStatusLabel}
        </span>
      </div>

      <label className="micro-label" style={{ display: 'block', marginBottom: '7px' }}>
        {t('admin.storyPlaceholder')}
      </label>
      <form key="story-form" id="inline-story-form" onSubmit={handleStoryForm}>
        <input
          type="text"
          id="inline-story"
          name="story"
          value={storyDraft}
          onChange={(e) => setStoryDraft(e.target.value)}
          placeholder={t('admin.storyPlaceholder')}
          className="field-input"
        />
      </form>

      {authError ? <p className="error-text">{authError}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
        <button
          type="button"
          onClick={handleToggleRound}
          disabled={isSubmitting}
          className={`ui-btn ${roundControlTone}`}
          style={{ justifyContent: 'center', padding: '11px' }}
        >
          {roundControlLabel}
        </button>

        <button
          type="button"
          onClick={handleRevealRound}
          disabled={isSubmitting || !canRevealRound}
          className="ui-btn is-blue"
          style={{ justifyContent: 'center', padding: '11px' }}
        >
          {t('admin.revealRound')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
        <button
          type="button"
          onClick={handleReopenRound}
          disabled={isSubmitting || !canReopenRound}
          className="ui-btn is-cyan"
          style={{ justifyContent: 'center', padding: '11px' }}
        >
          {t('admin.reopenRound')}
        </button>

        <button
          type="submit"
          form="inline-story-form"
          disabled={isSubmitting || roundStatus !== 'open'}
          className="ui-btn"
          style={{ justifyContent: 'center', padding: '11px' }}
        >
          {isSubmitting ? t('admin.saving') : t('admin.updateStory')}
        </button>
      </div>

      <button
        type="button"
        onClick={handleReset}
        disabled={isSubmitting || roundStatus !== 'open'}
        className="ui-btn"
        style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: '8px' }}
      >
        {t('admin.resetVotes')}
      </button>

      <div style={{ height: '1px', background: 'var(--line)', margin: '16px 0' }} />

      <button
        type="button"
        onClick={handleExportPdf}
        disabled={isExporting || !historyRounds.length}
        className="ui-btn"
        style={{ width: '100%', justifyContent: 'center', padding: '9px 12px', fontSize: '12px' }}
      >
        {isExporting ? t('admin.exporting') : t('admin.exportHistoryPdf')}
      </button>
    </div>
  )
}
