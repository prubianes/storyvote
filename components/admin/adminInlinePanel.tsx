'use client'

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import type { HistoryRound } from '@/system/supabase'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'

const voteLabels: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']
const voteBarColors = ['#ff5a3c', '#ff8b5e', '#65d8e6', '#5c7cff', '#6ce0b3', '#9fe6ff', '#f4f0e8', '#8896a4']

function getRoundDecision(voteCounts: number[] = [], tieLabel = 'Tie'): string {
  if (!voteCounts.length) {
    return '-'
  }

  const maxVotes = Math.max(...voteCounts)
  if (maxVotes <= 0) {
    return '-'
  }

  const winnerIndexes = voteCounts
    .map((count, index) => ({ count, index }))
    .filter((entry) => entry.count === maxVotes)
    .map((entry) => entry.index)

  const labels = winnerIndexes.map((idx) => voteLabels[idx]).join(' / ')
  return winnerIndexes.length > 1 ? `${tieLabel} (${labels})` : String(labels)
}

function formatDateTime(value: string | null, locale: string): string {
  if (!value) {
    return '-'
  }
  try {
    return new Date(value).toLocaleString(locale)
  } catch {
    return value
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

interface AdminInlinePanelProps {
  roomSlug: string
  roundActive: boolean
  currentStory: string
  historyRounds: HistoryRound[]
  onRoomUpdated: () => Promise<void> | void
}

export default function AdminInlinePanel({
  roomSlug,
  roundActive,
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
    () => (roundActive ? t('admin.roundOpen') : t('admin.roundClosed')),
    [roundActive, t]
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

    if (!roundActive) {
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
    if (!roundActive && !storyDraft.trim()) {
      setAuthError(t('admin.storyRequiredToOpen'))
      return
    }

    setIsSubmitting(true)
    setAuthError('')
    try {
      const endpoint = roundActive ? '/api/admin/round/end' : '/api/admin/round/start'
      const body = roundActive
        ? { room: roomSlug }
        : { room: roomSlug, story: storyDraft.trim() || null }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.status === 401) {
        setIsAuthorized(false)
        setAuthError(t('admin.sessionExpired'))
      } else if (!response.ok) {
        setAuthError(roundActive ? t('admin.closeRoundFailed') : t('admin.openRoundFailed'))
      } else {
        if (roundActive) {
          setStoryDraft('')
        }
        await onRoomUpdated()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportPdf = () => {
    if (!historyRounds.length) {
      return
    }

    setIsExporting(true)
    setAuthError('')
    try {
      const exportedAt = new Date().toLocaleString(locale)
      const rows = historyRounds
        .map((round, index) => {
          const voteCounts = round.vote_counts ?? []
          const totalVotes = voteCounts.reduce((acc, value) => acc + (value ?? 0), 0)
          const distributionChart = voteLabels
            .map((label, voteIndex) => {
              const count = voteCounts[voteIndex] ?? 0
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
              const barMaxWidth = 120
              const barWidth = pct > 0 ? Math.max(2, Math.round((pct / 100) * barMaxWidth)) : 0
              return `
                <div class="vote-row">
                  <span class="vote-label">${escapeHtml(String(label))}</span>
                  <span class="bar-svg-wrap">
                    <svg width="${barMaxWidth}" height="10" viewBox="0 0 ${barMaxWidth} 10" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(String(label))} ${count}">
                      <rect x="0.5" y="0.5" width="${barMaxWidth - 1}" height="9" fill="#f6f6f6" stroke="#111111" />
                      <rect x="1" y="1" width="${barWidth}" height="8" fill="${voteBarColors[voteIndex]}" />
                    </svg>
                  </span>
                  <span class="vote-meta">${count} (${pct}%)</span>
                </div>
              `
            })
            .join('')

          return `
            <tr>
              <td>${historyRounds.length - index}</td>
              <td class="story-cell">${escapeHtml(round.story || t('history.noStory'))}</td>
              <td class="score-cell">${escapeHtml(getRoundDecision(round.vote_counts, t('history.tie')))}</td>
              <td>${escapeHtml(String(round.total_votes ?? 0))}</td>
              <td>${escapeHtml(formatDateTime(round.created_at, locale))}</td>
              <td>${escapeHtml(formatDateTime(round.closed_at, locale))}</td>
              <td><div class="vote-chart">${distributionChart}</div></td>
            </tr>
          `
        })
        .join('')

      const html = `
        <!doctype html>
        <html lang="${language}">
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(t('admin.pdfDocumentTitle', { room: roomSlug }))}</title>
            <style>
              :root { --ink:#111111; --paper:#ffffff; --paper2:#f4f4f4; --line:#111111; --red:#ff5a3c; --cyan:#65d8e6; --blue:#5c7cff; }
              * { box-sizing: border-box; }
              body { margin: 0; background: var(--paper2); color: var(--ink); font-family: "Instrument Sans", "Helvetica Neue", Helvetica, sans-serif; }
              .sheet { margin: 16px; border: 2px solid var(--line); background: var(--paper); }
              .head { border-bottom: 2px solid var(--line); padding: 14px; background: linear-gradient(90deg, rgba(255,90,60,.18), rgba(101,216,230,.18)); }
              h1 { margin: 0; font-size: 24px; line-height: .9; font-family: "Arial Black", "Archivo Black", sans-serif; text-transform: uppercase; letter-spacing: -.02em; }
              .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
              .meta span { border: 2px solid var(--line); padding: 5px 8px; font-size: 10px; font-family: "IBM Plex Mono", "Courier New", monospace; text-transform: uppercase; letter-spacing: .08em; background: #fff; }
              table { width: 100%; border-collapse: collapse; font-size: 10px; }
              th, td { border: 2px solid var(--line); padding: 7px 6px; text-align: left; vertical-align: top; }
              th { background: #e9edf0; font-family: "IBM Plex Mono", "Courier New", monospace; text-transform: uppercase; letter-spacing: .08em; font-size: 9px; }
              td { background: #fff; }
              tbody tr:nth-child(even) td { background: #f9f9f9; }
              .story-cell { font-weight: 700; }
              .vote-chart { display: flex; flex-direction: column; gap: 4px; min-width: 220px; }
              .vote-row { display: flex; align-items: center; gap: 6px; }
              .vote-label { font-size: 9px; color: #111111; font-weight: 700; text-align: right; width: 15px; }
              .bar-svg-wrap { display: inline-flex; align-items: center; }
              .vote-meta { font-size: 9px; color: #111111; white-space: nowrap; text-align: right; font-family: "IBM Plex Mono", "Courier New", monospace; }
              .score-cell { font-weight: 700; }
              @media print {
                body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .sheet { margin: 0; border: 0; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <main class="sheet">
              <header class="head">
                <h1>${escapeHtml(t('admin.pdfMainTitle'))}</h1>
                <div class="meta">
                  <span>${escapeHtml(t('admin.pdfRoom', { room: roomSlug }))}</span>
                  <span>${escapeHtml(t('admin.pdfExportedAt', { date: exportedAt }))}</span>
                  <span>${escapeHtml(t('admin.pdfTotalRounds', { count: historyRounds.length }))}</span>
                </div>
              </header>
              <table>
                <thead>
                  <tr>
                    <th>${escapeHtml(t('admin.pdfColRound'))}</th>
                    <th>${escapeHtml(t('admin.pdfColStory'))}</th>
                    <th>${escapeHtml(t('admin.pdfColScore'))}</th>
                    <th>${escapeHtml(t('admin.pdfColTotalVotes'))}</th>
                    <th>${escapeHtml(t('admin.pdfColStart'))}</th>
                    <th>${escapeHtml(t('admin.pdfColClose'))}</th>
                    <th>${escapeHtml(t('admin.pdfColDistribution'))}</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </main>
          </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        setAuthError(t('admin.exportWindowFailed'))
        return
      }

      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()

      let didPrint = false
      const tryPrint = () => {
        if (didPrint) {
          return
        }
        didPrint = true
        printWindow.focus()
        printWindow.print()
      }

      // Wait for the new document to render before opening print dialog.
      printWindow.addEventListener('load', tryPrint, { once: true })
      window.setTimeout(tryPrint, 350)
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
        <div className="flex justify-end">
          <button type="button" onClick={() => setShowAuthForm(true)} className="ui-btn is-red">
            {t('admin.modeButton')}
          </button>
        </div>
      )
    }

    return (
      <section className="story-box">
        <p className="micro-label">{t('admin.modeTitle')}</p>
        <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0' }}>{t('admin.modeDescription')}</p>
        <form onSubmit={handleAuth} className="action-row" style={{ marginTop: '1rem' }}>
          <input
            type="password"
            id="passcode-inline"
            name="passcode"
            placeholder="Passcode"
            className="field-input"
            style={{ flex: '1 1 12rem' }}
          />
          <button type="submit" disabled={isSubmitting} className="ui-btn is-cyan">
            {isSubmitting ? t('admin.entering') : t('admin.enter')}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAuthForm(false)
              setAuthError('')
            }}
            className="ui-btn"
          >
            {t('admin.cancel')}
          </button>
        </form>
        {authError ? <p className="error-text">{authError}</p> : null}
      </section>
    )
  }

  return (
    <section className="story-box">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="micro-label">{t('admin.panelTitle')}</p>
        <span className={`status-chip ${roundActive ? 'is-open' : 'is-closed'}`}>
          {roundStatusLabel}
        </span>
      </div>

      <form id="inline-story-form" onSubmit={handleStoryForm} className="space-y-3">
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

      <div className="action-row">
        <button
          type="button"
          onClick={handleToggleRound}
          disabled={isSubmitting}
          className={`ui-btn ${roundActive ? 'is-blue' : 'is-mint'}`}
        >
          {roundActive ? t('admin.closeRound') : t('admin.openRound')}
        </button>

        <button
          type="submit"
          form="inline-story-form"
          disabled={isSubmitting || !roundActive}
          className="ui-btn is-cyan"
        >
          {isSubmitting ? t('admin.saving') : t('admin.updateStory')}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitting || !roundActive}
          className="ui-btn is-red"
        >
          {t('admin.resetVotes')}
        </button>

        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExporting || !historyRounds.length}
          className="ui-btn is-blue"
        >
          {isExporting ? t('admin.exporting') : t('admin.exportHistoryPdf')}
        </button>
      </div>
    </section>
  )
}
