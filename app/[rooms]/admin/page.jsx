'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function Page() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const params = useParams()
  const roomSlug = Array.isArray(params.rooms) ? params.rooms[0] : params.rooms

  useEffect(() => {
    if (!roomSlug) {
      return
    }

    async function restoreAdminSession() {
      try {
        const response = await fetch(`/api/admin/session?room=${encodeURIComponent(roomSlug)}`)
        const payload = await response.json()
        setIsAuthorized(Boolean(payload.authorized))
      } catch {
        setIsAuthorized(false)
      } finally {
        setIsCheckingSession(false)
      }
    }

    restoreAdminSession()
  }, [roomSlug])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (!roomSlug) {
      return
    }

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
        const payload = await response.json().catch(() => ({ error: 'Passcode inválido.' }))
        setAuthError(payload.error ?? 'Passcode inválido.')
        return
      }

      setIsAuthorized(true)
    } catch {
      setAuthError('No fue posible validar el passcode.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStoryForm = async (e) => {
    e.preventDefault()
    if (!roomSlug) {
      return
    }
    const form = e.currentTarget
    const formData = new FormData(form)
    const story = String(formData.get('story') ?? '').trim()
    if (!story) {
      return
    }

    setIsSubmitting(true)
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
      form.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    if (!roomSlug) {
      return
    }
    setIsSubmitting(true)
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
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingSession) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pb-12 sm:px-6">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
          <p className="text-sm text-slate-300">Verificando sesión admin...</p>
        </section>
      </main>
    )
  }

  if (!isAuthorized) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pb-12 sm:px-6">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
          <h3 className="text-xl font-semibold text-slate-100">Acceso Admin · {roomSlug}</h3>
          <p className="mt-2 text-sm text-slate-400">
            Ingresa el passcode admin de la sala para habilitar cambios.
          </p>
          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            <input
              type="password"
              id="passcode"
              name="passcode"
              placeholder="Passcode"
              required={false}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            {authError ? <p className="text-sm text-rose-300">{authError}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              {isSubmitting ? 'Validando...' : 'Entrar'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-12 sm:px-6">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
        <h3 className="text-2xl font-semibold text-slate-100">Administracion de {roomSlug}</h3>

        <form onSubmit={handleStoryForm} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Historia</span>
            <input
              type="text"
              id="story"
              name="story"
              placeholder="Historia"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            {isSubmitting ? 'Guardando...' : 'Actualizar historia'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitting}
          className="mt-6 rounded-xl border border-rose-500/50 px-4 py-2 font-semibold text-rose-300 transition hover:border-rose-400 hover:text-rose-200"
        >
          Reset votacion
        </button>
      </section>
    </main>
  )
}
