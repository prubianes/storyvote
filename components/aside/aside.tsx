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
    <div>
      <p className="micro-label">{t('aside.votesCast')}</p>
      <h3 className="big-number">{String(numberOfVotes).padStart(2, '0')}</h3>

      <h4 className="micro-label">{t('aside.connectedUsers')}</h4>
      <ul className="people-list">
        {(users ?? []).map((user) => (
          <li key={user} className="people-item">
            <span>{user}</span>
            <span className={`people-state ${votedUsers.includes(user) ? 'is-active' : 'is-idle'}`}>
              {votedUsers.includes(user) ? 'READY' : 'WAIT'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
