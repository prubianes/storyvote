'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'

import { RoomContext } from '../RoomContext/roomContextProvider'
import { markParticipantLeft } from '@/system/supabase'

export default function Header() {
  const { user, setUser, room, setRoom } = useContext(RoomContext)
  const router = useRouter()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(savedUser)
    }
  }, [setUser])

  useEffect(() => {
    setTheme('dark')
    document.documentElement.classList.remove('theme-light')
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.classList.toggle('theme-light', nextTheme === 'light')
  }

  const resetAll = async () => {
    if (!room || !user) {
      return
    }

    await markParticipantLeft(room, user)
    await fetch(`/api/admin/session?room=${encodeURIComponent(room)}`, {
      method: 'DELETE',
    }).catch(() => undefined)

    localStorage.removeItem('user')
    setUser('')
    setRoom('')
    router.push('/')
  }

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
      <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
        <Image src="/logo.svg" width={42} height={42} alt="StoryVote Logo" priority className="theme-logo" />
        <span>{room ? `StoryVote @ ${room}` : 'StoryVote'}</span>
      </h1>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="text-right">
            <p className="text-sm text-slate-400">Hola {user}</p>
            <button
              type="button"
              onClick={resetAll}
              className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Salir
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-slate-600 p-2 text-cyan-300 transition hover:border-cyan-500 hover:text-cyan-200"
          aria-label={`Activar modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <circle cx="12" cy="12" r="5" className="fill-current opacity-90" />
              <path
                className="fill-current opacity-45"
                d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 17a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm10-8a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2ZM4 11a1 1 0 1 1 0 2H2a1 1 0 1 1 0-2h2Zm13.66-5.24a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 1 1-1.42 1.42l-1.41-1.42a1 1 0 0 1 0-1.41Zm-12.73 0a1 1 0 0 1 1.41 1.41L4.93 8.59A1 1 0 1 1 3.5 7.17l1.43-1.41Zm14.15 12.73a1 1 0 0 1 1.41 1.41l-1.42 1.42a1 1 0 1 1-1.41-1.42l1.42-1.41ZM4.93 17.08a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 1 1-1.42 1.42L4.93 18.5a1 1 0 0 1 0-1.42Z"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                className="fill-current opacity-90"
                d="M18.5 14.5a7 7 0 0 1-8.97-8.98A8 8 0 1 0 18.5 14.5Z"
              />
              <circle cx="16.5" cy="7.5" r="1.5" className="fill-current opacity-45" />
              <circle cx="18.8" cy="10.2" r="1" className="fill-current opacity-45" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
