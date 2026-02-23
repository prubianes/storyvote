'use client'

import Keypad from '@/components/keypad/keypad'
import Aside from '@/components/aside/aside'
import RoundHistory from '@/components/history/roundHistory'
import {
  buildVoterKey,
  ensureRoom,
  getRoomHistory,
  getRoomState,
  initialVoteState,
  markParticipantLeft,
  subscribeToRoom,
  unsubscribeFromRoom,
  upsertParticipantPresence,
  type HistoryRound,
  type RoomState,
} from '@/system/supabase'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useContext, useEffect, useRef, useState } from 'react'
import { RoomContext } from '@/components/RoomContext/roomContextProvider'

const HEARTBEAT_INTERVAL_MS = 60_000
const INACTIVITY_TIMEOUT_MS = 5 * 60_000

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
  const [displayName, setDisplayName] = useState('')
  const lastInteractionRef = useRef<number>(Date.now())
  const isPresenceActiveRef = useRef<boolean>(true)

  useEffect(() => {
    setDisplayName(localStorage.getItem('user') || '')
  }, [])

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
    if (!roomSlug || !displayName) {
      return
    }

    let mounted = true
    let channel: ReturnType<typeof subscribeToRoom> | undefined
    let pollId: ReturnType<typeof setInterval> | undefined
    let heartbeatId: ReturnType<typeof setInterval> | undefined

    const recordInteraction = () => {
      lastInteractionRef.current = Date.now()
      if (!isPresenceActiveRef.current) {
        isPresenceActiveRef.current = true
        void upsertParticipantPresence(roomSlug, displayName, true)
      }
    }

    const interactionEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
    ]

    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordInteraction, { passive: true })
    )

    async function syncRoomAndHistory() {
      const [latest, latestHistory] = await Promise.all([
        getRoomState(roomSlug),
        getRoomHistory(roomSlug),
      ])
      syncRoomSnapshot(latest)
      setHistory(latestHistory)
    }

    async function loadRoom() {
      await ensureRoom(roomSlug)
      await upsertParticipantPresence(roomSlug, displayName, true)
      isPresenceActiveRef.current = true
      await syncRoomAndHistory()

      channel = subscribeToRoom(roomSlug, async () => {
        if (!mounted) {
          return
        }
        await syncRoomAndHistory()
      })

      pollId = setInterval(async () => {
        if (!mounted) {
          return
        }
        try {
          await syncRoomAndHistory()
        } catch {
          // Ignore transient fetch errors and keep polling.
        }
      }, 2000)

      heartbeatId = setInterval(async () => {
        if (!mounted) {
          return
        }
        try {
          const now = Date.now()
          const isInactive = now - lastInteractionRef.current >= INACTIVITY_TIMEOUT_MS

          if (isInactive) {
            if (isPresenceActiveRef.current) {
              await upsertParticipantPresence(roomSlug, displayName, false)
              isPresenceActiveRef.current = false
            }
            return
          }

          await upsertParticipantPresence(roomSlug, displayName, true)
          isPresenceActiveRef.current = true
        } catch {
          // Ignore transient heartbeat errors.
        }
      }, HEARTBEAT_INTERVAL_MS)
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
      if (heartbeatId) {
        clearInterval(heartbeatId)
      }
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, recordInteraction))

      // Best effort presence mark on route leave/unmount.
      void markParticipantLeft(roomSlug, displayName)
    }
  }, [displayName, roomSlug])

  const voterKey = displayName ? buildVoterKey(displayName) : ''

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
            voterKey={voterKey}
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
