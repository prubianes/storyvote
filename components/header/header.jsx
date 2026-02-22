'use client'

import { useContext, useEffect } from 'react'
import { RoomContext } from '../RoomContext/roomContextProvider'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getAllUsersFromRoom, updateUsers } from '@/system/supabase'

export default function Header() {
  const { user, setUser, room, setRoom } = useContext(RoomContext)
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(savedUser)
    }
  }, [setUser])

  const resetAll = async () => {
    if (!room || !user) {
      return
    }

    const loggedUsers = await getAllUsersFromRoom(room)
    const newUsers = loggedUsers.filter((logged) => logged !== user)
    await updateUsers(newUsers, room)

    localStorage.removeItem('user')
    setUser('')
    setRoom('')
    router.push('/')
  }

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
      <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
        <Image src="/logo.svg" width={42} height={42} alt="StoryVote Logo" priority />
        <span>{room ? `StoryVote @ ${room}` : 'StoryVote'}</span>
      </h1>

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
    </header>
  )
}
