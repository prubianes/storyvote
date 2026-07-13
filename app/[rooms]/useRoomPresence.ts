import { useEffect, useRef } from 'react'
import {
  buildVoterKey,
  markParticipantLeft,
  subscribeToRoom,
  unsubscribeFromRoom,
  upsertParticipantPresence,
} from '@/system/supabase'

const HEARTBEAT_INTERVAL_MS = 60_000
const INACTIVITY_TIMEOUT_MS = 5 * 60_000

interface UseRoomPresenceParams {
  roomSlug: string
  displayName: string
  attemptSync: (slug: string, intent?: 'normal' | 'reconnect') => Promise<boolean>
  onJoin: (displayName: string) => void
}

export function useRoomPresence({ roomSlug, displayName, attemptSync, onJoin }: UseRoomPresenceParams) {
  const lastInteractionRef = useRef<number>(0)
  const isPresenceActiveRef = useRef<boolean>(true)

  useEffect(() => {
    lastInteractionRef.current = Date.now()
  }, [])

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
      onJoin(displayName)
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
  }, [attemptSync, displayName, roomSlug, onJoin])
}
