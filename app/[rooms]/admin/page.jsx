'use client'

import { getAdminPasscodeHash, initialVoteState, updateStory, updateVotes, verifyAdminPasscode } from '@/system/supabase'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function Page() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authError, setAuthError] = useState('')
  const params = useParams()
  const roomSlug = Array.isArray(params.rooms) ? params.rooms[0] : params.rooms

  useEffect(() => {
    if (!roomSlug) {
      return
    }

    async function restoreAdminSession() {
      const stored = localStorage.getItem(`admin:${roomSlug}`)
      if (!stored) {
        return
      }

      try {
        const currentHash = await getAdminPasscodeHash(roomSlug)
        if (!currentHash || stored === currentHash) {
          setIsAuthorized(true)
        }
      } catch {
        setIsAuthorized(false)
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

    const formData = new FormData(e.target)
    const passcode = String(formData.get('passcode') ?? '').trim()

    try {
      const valid = await verifyAdminPasscode(roomSlug, passcode)
      if (!valid) {
        setAuthError('Passcode inválido.')
        return
      }

      const hash = await getAdminPasscodeHash(roomSlug)
      if (hash) {
        localStorage.setItem(`admin:${roomSlug}`, hash)
      }
      setIsAuthorized(true)
    } catch {
      setAuthError('No fue posible validar el passcode.')
    }
  }

  const handleStoryForm = async (e) => {
    e.preventDefault()
    if (!roomSlug) {
      return
    }
    const form = e.target
    const formData = new FormData(form)
    const formJson = Object.fromEntries(formData.entries())
    await updateStory(formJson.story, roomSlug)
    form.reset()
  }

  const handleReset = async () => {
    if (!roomSlug) {
      return
    }
    await updateVotes(initialVoteState, roomSlug)
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
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            {authError ? <p className="text-sm text-rose-300">{authError}</p> : null}
            <button
              type="submit"
              className="w-full rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Entrar
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
            className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Actualizar historia
          </button>
        </form>

        <button
          type="button"
          onClick={handleReset}
          className="mt-6 rounded-xl border border-rose-500/50 px-4 py-2 font-semibold text-rose-300 transition hover:border-rose-400 hover:text-rose-200"
        >
          Reset votacion
        </button>
      </section>
    </main>
  )
}
