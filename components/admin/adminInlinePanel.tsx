'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { HistoryRound } from '@/system/supabase'

const voteLabels: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']

function getRoundDecision(voteCounts: number[] = []): string {
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
  return winnerIndexes.length > 1 ? `Empate (${labels})` : String(labels)
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-'
  }
  try {
    return new Date(value).toLocaleString('es-ES')
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
    () => (roundActive ? 'Ronda abierta' : 'Ronda cerrada'),
    [roundActive]
  )

  const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
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
        const payload = (await response.json().catch(() => ({ error: 'Passcode inválido.' }))) as {
          error?: string
        }
        setAuthError(payload.error ?? 'Passcode inválido.')
        return
      }

      setIsAuthorized(true)
      await onRoomUpdated()
    } catch {
      setAuthError('No fue posible validar el passcode.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStoryForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!roundActive) {
      setAuthError('Solo puedes actualizar la historia con la ronda abierta.')
      return
    }

    const story = storyDraft.trim()
    if (!story) {
      setAuthError('La historia no puede estar vacía.')
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
        setAuthError('La sesión de admin expiró. Ingresa nuevamente.')
        return
      }
      if (!response.ok) {
        setAuthError('No fue posible actualizar la historia.')
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
        setAuthError('La sesión de admin expiró. Ingresa nuevamente.')
      } else if (!response.ok) {
        setAuthError('No fue posible resetear la votación.')
      } else {
        await onRoomUpdated()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleRound = async () => {
    if (!roundActive && !storyDraft.trim()) {
      setAuthError('Debes ingresar una historia antes de abrir una nueva ronda.')
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
        setAuthError('La sesión de admin expiró. Ingresa nuevamente.')
      } else if (!response.ok) {
        setAuthError(
          roundActive ? 'No fue posible cerrar la ronda.' : 'No fue posible abrir una nueva ronda.'
        )
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
      const exportedAt = new Date().toLocaleString('es-ES')
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
                    <svg width="${barMaxWidth}" height="10" viewBox="0 0 ${barMaxWidth} 10" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(String(label))} ${count} votos">
                      <rect x="0.5" y="0.5" width="${barMaxWidth - 1}" height="9" fill="white" stroke="#9ca3af" />
                      <rect x="1" y="1" width="${barWidth}" height="8" fill="#0f766e" />
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
              <td>${escapeHtml(round.story || 'Sin historia')}</td>
              <td>${escapeHtml(getRoundDecision(round.vote_counts))}</td>
              <td>${escapeHtml(String(round.total_votes ?? 0))}</td>
              <td>${escapeHtml(formatDateTime(round.created_at))}</td>
              <td>${escapeHtml(formatDateTime(round.closed_at))}</td>
              <td><div class="vote-chart">${distributionChart}</div></td>
            </tr>
          `
        })
        .join('')

      const html = `
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Historial de votaciones - ${escapeHtml(roomSlug)}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #111827; }
              h1 { margin: 0 0 8px; font-size: 20px; }
              p { margin: 0 0 4px; font-size: 12px; color: #374151; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
              th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
              th { background: #f3f4f6; }
              .vote-chart { display: flex; flex-direction: column; gap: 4px; min-width: 220px; }
              .vote-row { display: flex; align-items: center; gap: 6px; }
              .vote-label { font-size: 10px; color: #374151; font-weight: 700; text-align: right; }
              .bar-svg-wrap { display: inline-flex; align-items: center; }
              .vote-meta { font-size: 10px; color: #4b5563; white-space: nowrap; text-align: right; }
              @media print {
                body { margin: 10mm; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <h1>Historial de votaciones</h1>
            <p>Sala: ${escapeHtml(roomSlug)}</p>
            <p>Exportado: ${escapeHtml(exportedAt)}</p>
            <p>Total de rondas: ${historyRounds.length}</p>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Historia</th>
                  <th>Puntaje</th>
                  <th>Total votos</th>
                  <th>Inicio</th>
                  <th>Cierre</th>
                  <th>Distribución</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        setAuthError('No fue posible abrir la ventana de exportación.')
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
          <button
            type="button"
            onClick={() => setShowAuthForm(true)}
            className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-500 hover:text-cyan-300"
          >
            Modo admin
          </button>
        </div>
      )
    }

    return (
      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-sm font-semibold text-slate-100">Modo Admin</p>
        <p className="mt-1 text-xs text-slate-400">Ingresa passcode para habilitar controles.</p>
        <form onSubmit={handleAuth} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="password"
            id="passcode-inline"
            name="passcode"
            placeholder="Passcode"
            className="min-w-[180px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Validando...' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAuthForm(false)
              setAuthError('')
            }}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
          >
            Cancelar
          </button>
        </form>
        {authError ? <p className="mt-2 text-xs text-rose-300">{authError}</p> : null}
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-cyan-700/50 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-cyan-200">Panel Admin</p>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            roundActive
              ? 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
              : 'border border-amber-400/40 bg-amber-400/10 text-amber-300'
          }`}
        >
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
          placeholder="Historia de la ronda"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      </form>

      {authError ? <p className="mt-2 text-xs text-rose-300">{authError}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleToggleRound}
          disabled={isSubmitting}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            roundActive
              ? 'border-amber-500/50 text-amber-300 hover:border-amber-400 hover:text-amber-200'
              : 'border-emerald-500/50 text-emerald-300 hover:border-emerald-400 hover:text-emerald-200'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {roundActive ? 'Cerrar ronda' : 'Abrir ronda'}
        </button>

        <button
          type="submit"
          form="inline-story-form"
          disabled={isSubmitting || !roundActive}
          className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Actualizar historia'}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitting || !roundActive}
          className="rounded-lg border border-rose-500/50 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:border-rose-400 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Resetear votos
        </button>

        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExporting || !historyRounds.length}
          className="rounded-lg border border-indigo-500/50 px-3 py-2 text-sm font-semibold text-indigo-300 transition hover:border-indigo-400 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? 'Exportando...' : 'Exportar historial (PDF)'}
        </button>
      </div>
    </section>
  )
}
