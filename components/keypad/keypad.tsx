import type { CSSProperties, Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { castVote } from '@/system/supabase'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'

const values: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']
const voteColors = ['#ff5a3c', '#ff8b5e', '#65d8e6', '#5c7cff', '#6ce0b3', '#9fe6ff', '#f4f0e8', '#8896a4']
const voteTextColors = ['#fff6ef', '#111111', '#071316', '#f5f2ff', '#07130e', '#071316', '#111111', '#f4f0e8']

interface KeypadProps {
  votes: number[]
  room: string
  roundActive: boolean
  voterKey: string
  onVotesChange?: Dispatch<SetStateAction<number[]>>
}

export default function Keypad({ votes, room, roundActive, voterKey, onVotesChange }: KeypadProps) {
  const { t } = useI18n()
  const availableVotes = useMemo(() => values, [])
  const [selectedVote, setSelectedVote] = useState<number | '∞' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voteError, setVoteError] = useState('')

  useEffect(() => {
    const totalVotes = votes.reduce((partial, value) => partial + value, 0)
    if (totalVotes === 0) {
      setSelectedVote(null)
    }
  }, [votes])

  const maxVotes = votes.reduce((partial, value) => partial + value, 0) || 1
  const meterStyle = (value: number) =>
    ({ '--w': maxVotes > 0 ? `${Math.max(0, (value / maxVotes) * 100)}%` : '0%' }) as CSSProperties
  const voteStyle = (index: number) =>
    ({ '--vote-hover': voteColors[index], '--vote-hover-ink': voteTextColors[index] }) as CSSProperties

  const handleVote = async (vote: number | '∞') => {
    if (!room || !voterKey || isSubmitting || !roundActive) {
      return
    }

    const indexValue = availableVotes.indexOf(vote)
    if (indexValue < 0) {
      return
    }

    setIsSubmitting(true)
    setVoteError('')
    try {
      const result = await castVote(room, voterKey, indexValue)
      onVotesChange?.(result.votes)
      setSelectedVote(result.selectedVoteIndex === null ? null : availableVotes[result.selectedVoteIndex])
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setVoteError(message.includes('No active round') ? t('keypad.noActiveRound') : t('keypad.voteError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {roundActive ? (
        <p className="status-note is-open">
          {t('keypad.openRoundMessage')}
        </p>
      ) : (
        <p className="status-note is-closed">
          {t('keypad.closedRoundMessage')}
        </p>
      )}
      <section className="vote-deck">
        {availableVotes.map((value) => {
          const isSelected = selectedVote === value
          const voteIndex = availableVotes.indexOf(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleVote(value)}
              disabled={isSubmitting || !roundActive}
              className={`vote-card ${isSelected ? 'is-selected' : ''}`}
              style={voteStyle(voteIndex)}
            >
              {value}
            </button>
          )
        })}
      </section>
      {voteError ? <p className="error-text">{voteError}</p> : null}

      <section className="meter-list">
        {availableVotes.map((value, index) => (
          <div key={`key-${value}`} className="meter-row">
            <p className="meter-label">
              <span>{t('history.voteLabel', { value })}</span>
              <span>{votes[index] ?? 0}</span>
            </p>
            <div className="meter-track">
              <span className="meter-fill" style={meterStyle(votes[index] ?? 0)} />
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
