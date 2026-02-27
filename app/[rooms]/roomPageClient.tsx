'use client'

import Keypad from '@/components/keypad/keypad'
import Aside from '@/components/aside/aside'
import AdminInlinePanel from '@/components/admin/adminInlinePanel'
import RoundHistory from '@/components/history/roundHistory'
import {
  buildVoterKey,
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
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { RoomContext } from '@/components/RoomContext/roomContextProvider'

const HEARTBEAT_INTERVAL_MS = 60_000
const INACTIVITY_TIMEOUT_MS = 5 * 60_000

interface RoomPageClientProps {
  roomSlug: string
}

export default function RoomPageClient({ roomSlug }: RoomPageClientProps) {
  const [votes, setVotes] = useState<number[]>(initialVoteState)
  const [story, setStory] = useState('')
  const [users, setUsers] = useState<string[]>([])
  const [votedUsers, setVotedUsers] = useState<string[]>([])
  const [roundActive, setRoundActive] = useState(true)
  const [history, setHistory] = useState<HistoryRound[]>([])
  const { setRoom } = useContext(RoomContext)
  const [displayName, setDisplayName] = useState('')
  const lastInteractionRef = useRef<number>(Date.now())
  const isPresenceActiveRef = useRef<boolean>(true)

  useEffect(() => {
    setDisplayName(sessionStorage.getItem('user') || localStorage.getItem('user') || '')
  }, [])

  const syncRoomSnapshot = (data: RoomState) => {
    setVotes(data.votes ?? initialVoteState)
    setStory(data.story ?? '')
    setUsers(data.users ?? [])
    setVotedUsers(data.voted_users ?? [])
    setRoundActive(Boolean(data.round_active))
  }

  const syncRoomAndHistory = useCallback(async (slug: string) => {
    const [latest, latestHistory] = await Promise.all([getRoomState(slug), getRoomHistory(slug)])
    syncRoomSnapshot(latest)
    setHistory(latestHistory)
  }, [])

  useEffect(() => {
    if (!roomSlug) {
      return
    }
    setRoom(roomSlug)
    sessionStorage.setItem('room', roomSlug)
    localStorage.setItem('room', roomSlug)
  }, [roomSlug, setRoom])

  useEffect(() => {
    if (!roomSlug || !displayName) {
      return
    }

    let mounted = true
    let channel: ReturnType<typeof subscribeToRoom> | undefined
    let pollId: ReturnType<typeof setInterval> | undefined
    let heartbeatId: ReturnType<typeof setInterval> | undefined
    const voterKey = buildVoterKey(displayName)

    const postPresence = async (isActive: boolean, keepalive = false) => {
      const response = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          room: roomSlug,
          voterKey,
          displayName,
          isActive,
        }),
        keepalive,
      })

      if (!response.ok) {
        throw new Error(`Presence API failed: ${response.status}`)
      }
    }

    const clearAdminSession = async (keepalive = false) => {
      await fetch(`/api/admin/session?room=${encodeURIComponent(roomSlug)}`, {
        method: 'DELETE',
        keepalive,
      })
    }

    const recordInteraction = () => {
      lastInteractionRef.current = Date.now()
      if (!isPresenceActiveRef.current) {
        isPresenceActiveRef.current = true
        void postPresence(true).catch(() => upsertParticipantPresence(roomSlug, displayName, true))
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isPresenceActiveRef.current) {
          isPresenceActiveRef.current = false
          void postPresence(false, true).catch(() => undefined)
        }
        return
      }

      recordInteraction()
    }

    const handlePageHide = () => {
      if (!isPresenceActiveRef.current) {
        return
      }
      isPresenceActiveRef.current = false
      void postPresence(false, true).catch(() => undefined)
      void clearAdminSession(true).catch(() => undefined)
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
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    async function loadRoom() {
      await postPresence(true).catch(() => upsertParticipantPresence(roomSlug, displayName, true))
      isPresenceActiveRef.current = true
      await syncRoomAndHistory(roomSlug)

      channel = subscribeToRoom(roomSlug, async () => {
        if (!mounted) {
          return
        }
        await syncRoomAndHistory(roomSlug)
      })

      pollId = setInterval(async () => {
        if (!mounted) {
          return
        }
        try {
          await syncRoomAndHistory(roomSlug)
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
              await postPresence(false).catch(() =>
                upsertParticipantPresence(roomSlug, displayName, false)
              )
              isPresenceActiveRef.current = false
            }
            return
          }

          await postPresence(true).catch(() => upsertParticipantPresence(roomSlug, displayName, true))
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
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)

      // Best effort presence mark on route leave/unmount.
      void postPresence(false, true).catch(() => markParticipantLeft(roomSlug, displayName))
      void clearAdminSession(true).catch(() => undefined)
    }
  }, [displayName, roomSlug, syncRoomAndHistory])

  const voterKey = displayName ? buildVoterKey(displayName) : ''

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-cyan-300">Historia actual</p>
            <h3 className="text-xl font-semibold text-slate-100">{story || 'Sin historia definida'}</h3>
          </div>

          <div className="mb-5">
            <AdminInlinePanel
              roomSlug={roomSlug}
              roundActive={roundActive}
              currentStory={story}
              onRoomUpdated={() => syncRoomAndHistory(roomSlug)}
            />
          </div>

          <Keypad
            votes={votes}
            room={roomSlug}
            roundActive={roundActive}
            voterKey={voterKey}
            onVotesChange={setVotes}
          />
        </section>

        <Aside users={users} votedUsers={votedUsers} votes={votes} />
      </div>

      <div className="mt-6">
        <RoundHistory rounds={history} />
      </div>
    </main>
  )
}
