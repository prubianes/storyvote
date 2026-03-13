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
import { useI18n } from '@/components/LanguageContext/languageContextProvider'

const HEARTBEAT_INTERVAL_MS = 60_000
const INACTIVITY_TIMEOUT_MS = 5 * 60_000

interface RoomPageClientProps {
  roomSlug: string
}

export default function RoomPageClient({ roomSlug }: RoomPageClientProps) {
  const { t } = useI18n()
  const [votes, setVotes] = useState<number[]>(initialVoteState)
  const [story, setStory] = useState('')
  const [users, setUsers] = useState<string[]>([])
  const [votedUsers, setVotedUsers] = useState<string[]>([])
  const [roundActive, setRoundActive] = useState(true)
  const [roundStatus, setRoundStatus] = useState<'open' | 'revealed' | 'closed'>('closed')
  const [history, setHistory] = useState<HistoryRound[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [syncState, setSyncState] = useState<'online' | 'syncing' | 'reconnecting' | 'error'>('syncing')
  const { setRoom } = useContext(RoomContext)
  const [displayName] = useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }
    return sessionStorage.getItem('user') || localStorage.getItem('user') || ''
  })
  const lastInteractionRef = useRef<number>(0)
  const isPresenceActiveRef = useRef<boolean>(true)
  const hasCompletedFirstSyncRef = useRef(false)

  useEffect(() => {
    lastInteractionRef.current = Date.now()
  }, [])

  const syncRoomSnapshot = useCallback((data: RoomState) => {
    const latestUsers = data.users ?? []
    const usersWithSelf =
      displayName && !latestUsers.includes(displayName) ? [displayName, ...latestUsers] : latestUsers
    setVotes(data.votes ?? initialVoteState)
    setStory(data.story ?? '')
    setUsers(usersWithSelf)
    setVotedUsers(data.voted_users ?? [])
    setRoundActive(Boolean(data.round_active))
    setRoundStatus(data.round_status ?? 'closed')
  }, [displayName])

  const syncRoomAndHistory = useCallback(async (slug: string, intent: 'normal' | 'reconnect' = 'normal') => {
    if (intent === 'reconnect') {
      setSyncState('reconnecting')
    } else if (hasCompletedFirstSyncRef.current) {
      setSyncState('syncing')
    }

    const [latest, latestHistory] = await Promise.all([getRoomState(slug), getRoomHistory(slug)])
    syncRoomSnapshot(latest)
    setHistory(latestHistory)
    setSyncState('online')
    setIsInitialLoading(false)
    hasCompletedFirstSyncRef.current = true
  }, [syncRoomSnapshot])

  const attemptSync = useCallback(
    async (slug: string, intent: 'normal' | 'reconnect' = 'normal') => {
      try {
        await syncRoomAndHistory(slug, intent)
        return true
      } catch {
        setSyncState('error')
        setIsInitialLoading(false)
        return false
      }
    },
    [syncRoomAndHistory]
  )

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
      setUsers((current) => (current.includes(displayName) ? current : [displayName, ...current]))
      await attemptSync(roomSlug, 'reconnect')
      window.setTimeout(() => {
        void attemptSync(roomSlug, 'normal')
      }, 350)

      channel = subscribeToRoom(roomSlug, async () => {
        if (!mounted) {
          return
        }
        await attemptSync(roomSlug, 'normal')
      })

      pollId = setInterval(async () => {
        if (!mounted) {
          return
        }
        try {
          const ok = await attemptSync(roomSlug, 'reconnect')
          if (!ok) {
            return
          }
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
  }, [attemptSync, displayName, roomSlug])

  const voterKey = displayName ? buildVoterKey(displayName) : ''

  return (
    <main className="page-shell">
      <div className="page-grid">
        <section className="ui-panel stage-panel">
          {syncState === 'error' ? (
            <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
              <p className="error-text" style={{ margin: 0 }}>
                {t('room.syncError')}
              </p>
              <button
                type="button"
                className="ui-btn"
                onClick={() => {
                  void attemptSync(roomSlug, 'reconnect')
                }}
              >
                {t('room.retrySync')}
              </button>
            </div>
          ) : null}

          <div className="story-box">
            <p className="micro-label">{t('room.currentStory')}</p>
            <h3 className="story-heading">
              {story || t('room.undefinedStory')}
            </h3>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <AdminInlinePanel
              roomSlug={roomSlug}
              roundStatus={roundStatus}
              currentStory={story}
              historyRounds={history}
              onRoomUpdated={() => syncRoomAndHistory(roomSlug)}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <Keypad
              votes={votes}
              room={roomSlug}
              roundActive={roundActive}
              roundStatus={roundStatus}
              voterKey={voterKey}
              onVotesChange={setVotes}
            />
          </div>
        </section>

        <aside className="ui-panel sidebar-panel">
          <Aside users={users} votedUsers={votedUsers} votes={votes} />
        </aside>
      </div>

      <div>
        <RoundHistory
          rounds={history}
          isLoading={isInitialLoading}
          isReconnecting={syncState === 'reconnecting'}
          hasSyncError={syncState === 'error'}
          onRetrySync={async () => {
            await attemptSync(roomSlug, 'reconnect')
          }}
        />
      </div>
    </main>
  )
}
