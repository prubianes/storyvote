import { useI18n } from '@/components/LanguageContext/languageContextProvider'

interface AsideProps {
  users: string[]
  votedUsers?: string[]
  votes: number[]
}

export default function Aside({ users, votedUsers = [], votes }: AsideProps) {
  const { t } = useI18n()
  const numberOfVotes = votes.reduce((partial, value) => partial + value, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <p className="micro-label">{t('aside.votesCast')}</p>
      <h3 className="big-number" aria-live="polite" aria-atomic="true">
        {String(numberOfVotes).padStart(2, '0')}
      </h3>
      <p className="sidebar-votes-label">
        {votedUsers.length} of {users.length} estimated
      </p>

      <div className="sidebar-divider" />

      <div className="sidebar-in-room-row">
        <span className="micro-label">{t('aside.connectedUsers')}</span>
        <span className="sidebar-count">{users.length}</span>
      </div>

      <ul className="people-list">
        {(users ?? []).map((user) => {
          const initial = user.charAt(0).toUpperCase()
          const hasVoted = votedUsers.includes(user)
          return (
            <li key={user} className="people-item">
              <span className="people-avatar" aria-hidden="true">{initial}</span>
              <span className="people-name">{user}</span>
              <span className={`people-state ${hasVoted ? 'is-active' : 'is-idle'}`}>
                {hasVoted ? t('aside.ready') : t('aside.wait')}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
