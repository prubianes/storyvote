'use client'

import { RoomContext } from '@/components/RoomContext/roomContextProvider'
import { ensureRoom, getAllUsersFromRoom, updateUsers } from '@/system/supabase'
import { useRouter } from 'next/navigation'
import { useContext, useState, type FormEvent } from 'react'

export default function Page() {
  const router = useRouter()
  const { setUser, setRoom } = useContext(RoomContext)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)

      const username = String(formData.get('user') ?? '').trim()
      const selectedRoom = String(formData.get('room') ?? '').trim()
      const adminPasscode = String(formData.get('adminPasscode') ?? '').trim()

      if (!username || !selectedRoom) {
        return
      }

      setUser(username)
      setRoom(selectedRoom)

      await ensureRoom(selectedRoom, adminPasscode)
      const loggedUsers = await getAllUsersFromRoom(selectedRoom)
      const deduped = [...new Set([...loggedUsers, username])]
      await updateUsers(deduped, selectedRoom)

      localStorage.setItem('user', username)
      router.push(`/${selectedRoom}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-700 bg-slate-900/75 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">Planning Poker</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">Bienvenidos a StoryVote</h2>
        <p className="mt-3 text-slate-400">
          Ingresa tu nombre y una sala para comenzar a votar historias en tiempo real.
        </p>

        <form onSubmit={handleForm} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Nombre</span>
            <input
              type="text"
              id="user"
              name="user"
              placeholder="Tu nombre"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Sala</span>
            <input
              type="text"
              id="room"
              name="room"
              placeholder="ejemplo-equipo-mobile"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Passcode admin (opcional)</span>
            <input
              type="password"
              id="adminPasscode"
              name="adminPasscode"
              placeholder="Solo para quien crea la sala"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
