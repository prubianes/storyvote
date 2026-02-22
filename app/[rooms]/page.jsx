'use client'

import Keypad from '@/components/keypad/keypad'
import Aside from '@/components/aside/aside'
import { ensureRoom, getRoom, initialVoteState, subscribeToRoom, unsubscribeFromRoom } from '@/system/supabase'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'
import { RoomContext } from '@/components/RoomContext/roomContextProvider'

export default function Page() {
  const [votes, setVotes] = useState(initialVoteState)
  const [story, setStory] = useState('')
  const [users, setUsers] = useState([])
  const { setRoom } = useContext(RoomContext)
  const params = useParams()
  const roomSlug = Array.isArray(params.rooms) ? params.rooms[0] : params.rooms
  const router = useRouter()
  const pathname = usePathname()

  const syncRoomSnapshot = (data) => {
    setVotes(data.votes ?? initialVoteState)
    setStory(data.story ?? '')
    setUsers(data.users ?? [])
  }

  useEffect(() => {
    if (!roomSlug) {
      return
    }
    setRoom(roomSlug)
  }, [roomSlug, setRoom])

  useEffect(() => {
    if (!roomSlug) {
      return
    }

    let mounted = true
    let channel
    let pollId

    async function loadRoom() {
      await ensureRoom(roomSlug)
      const data = await getRoom(roomSlug)

      if (mounted) {
        syncRoomSnapshot(data)
      }

      channel = subscribeToRoom(roomSlug, (latest) => {
        syncRoomSnapshot(latest)
      })

      // Fallback while realtime is unavailable/misconfigured on Supabase.
      pollId = setInterval(async () => {
        if (!mounted) {
          return
        }
        try {
          const latest = await getRoom(roomSlug)
          syncRoomSnapshot(latest)
        } catch {
          // Ignore transient fetch errors and keep polling.
        }
      }, 2000)
    }

    loadRoom()

    return () => {
      mounted = false
      if (channel) {
        unsubscribeFromRoom(channel)
      }
      if (pollId) {
        clearInterval(pollId)
      }
    }
  }, [roomSlug])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-cyan-300">Historia actual</p>
              <h3 className="text-xl font-semibold text-slate-100">{story || 'Sin historia definida'}</h3>
            </div>
            <button
              type="button"
              onClick={() => router.push(`${pathname}/admin`)}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
            >
              Admin
            </button>
          </div>

          <Keypad votes={votes} room={roomSlug ?? ''} onVotesChange={setVotes} />
        </section>

        <Aside users={users} votes={votes} />
      </div>
    </main>
  )
}
