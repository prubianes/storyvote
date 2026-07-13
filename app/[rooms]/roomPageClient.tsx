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
  type HistoryRound,
  type RoomState,
} from '@/system/supabase'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { RoomContext } from '@/components/RoomContext/roomContextProvider'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'
import { useRoomPresence } from './useRoomPresence'

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
  const hasCompletedFirstSyncRef = useRef(false)

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

  const onJoin = useCallback((joinedName: string) => {
    setUsers((current) => (current.includes(joinedName) ? current : [joinedName, ...current]))
  }, [])

  useRoomPresence({ roomSlug, displayName, attemptSync, onJoin })

  const voterKey = displayName ? buildVoterKey(displayName) : ''

  return (
    <main className="page-shell">
      <p className="micro-label" style={{ marginBottom: '14px' }}>Voting room · {roomSlug}</p>

      {syncState === 'error' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
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

      <div className="page-grid">
        <section className="stage-panel">
          <div className="story-box">
            <div className="story-header-row">
              <span className="micro-label">{t('room.currentStory')}</span>
              <span
                className={`status-chip ${
                  roundStatus === 'open' ? 'is-open' : roundStatus === 'revealed' ? 'is-revealed' : 'is-closed'
                }`}
              >
                {roundStatus === 'open'
                  ? t('admin.roundOpen')
                  : roundStatus === 'revealed'
                    ? t('admin.roundRevealed')
                    : t('admin.roundClosed')}
              </span>
            </div>
            <h2 className="story-heading">
              {story || t('room.undefinedStory')}
            </h2>
          </div>

          <div style={{ marginTop: '22px' }}>
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

        <div className="sidebar-column">
          <aside className="sidebar-panel">
            <Aside users={users} votedUsers={votedUsers} votes={votes} />
          </aside>
          <div className="facilitator-panel">
            <AdminInlinePanel
              roomSlug={roomSlug}
              roundStatus={roundStatus}
              currentStory={story}
              historyRounds={history}
              onRoomUpdated={() => syncRoomAndHistory(roomSlug)}
            />
          </div>
        </div>
      </div>

      <div className="history-section">
        <p className="micro-label" style={{ marginBottom: '14px' }}>{t('history.title')}</p>
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
