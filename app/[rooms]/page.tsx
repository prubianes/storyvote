'use client'

import Keypad from '@/components/keypad/keypad'
import Aside from '@/components/aside/aside'
import RoundHistory from '@/components/history/roundHistory'
import {
  ensureRoom,
  getRoomHistory,
  getRoomState,
  initialVoteState,
  subscribeToRoom,
  unsubscribeFromRoom,
  type HistoryRound,
  type RoomState,
} from '@/system/supabase'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'
import { RoomContext } from '@/components/RoomContext/roomContextProvider'

export default function Page() {
  const [votes, setVotes] = useState<number[]>(initialVoteState)
  const [story, setStory] = useState('')
  const [users, setUsers] = useState<string[]>([])
  const [roundActive, setRoundActive] = useState(true)
  const [history, setHistory] = useState<HistoryRound[]>([])
  const { setRoom } = useContext(RoomContext)
  const params = useParams<{ rooms: string | string[] }>()
  const roomSlug = Array.isArray(params.rooms) ? params.rooms[0] : params.rooms
  const router = useRouter()
  const pathname = usePathname()

  const syncRoomSnapshot = (data: RoomState) => {
    setVotes(data.votes ?? initialVoteState)
    setStory(data.story ?? '')
    setUsers(data.users ?? [])
    setRoundActive(Boolean(data.round_active))
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
    let channel: ReturnType<typeof subscribeToRoom> | undefined
    let pollId: ReturnType<typeof setInterval> | undefined

    async function loadRoom() {
      await ensureRoom(roomSlug)
      const [data, roundHistory] = await Promise.all([getRoomState(roomSlug), getRoomHistory(roomSlug)])

      if (mounted) {
        syncRoomSnapshot(data)
        setHistory(roundHistory)
      }

      channel = subscribeToRoom(roomSlug, async () => {
        const [latest, latestHistory] = await Promise.all([
          getRoomState(roomSlug),
          getRoomHistory(roomSlug),
        ])
        syncRoomSnapshot(latest)
        setHistory(latestHistory)
      })

      pollId = setInterval(async () => {
        if (!mounted) {
          return
        }
        try {
          const [latest, latestHistory] = await Promise.all([
            getRoomState(roomSlug),
            getRoomHistory(roomSlug),
          ])
          syncRoomSnapshot(latest)
          setHistory(latestHistory)
        } catch {
          // Ignore transient fetch errors and keep polling.
        }
      }, 2000)
    }

    void loadRoom()

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

          <Keypad
            votes={votes}
            room={roomSlug ?? ''}
            roundActive={roundActive}
            onVotesChange={setVotes}
          />
        </section>

        <Aside users={users} votes={votes} />
      </div>

      <div className="mt-6">
        <RoundHistory rounds={history} />
      </div>
    </main>
  )
}
