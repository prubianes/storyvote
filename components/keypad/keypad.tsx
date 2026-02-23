import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { castVote } from '@/system/supabase'

const values: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']

interface KeypadProps {
  votes: number[]
  room: string
  roundActive: boolean
  voterKey: string
  onVotesChange?: Dispatch<SetStateAction<number[]>>
}

export default function Keypad({ votes, room, roundActive, voterKey, onVotesChange }: KeypadProps) {
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
      setVoteError(message.includes('No active round') ? 'No hay ronda activa.' : 'Error al votar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {roundActive ? (
        <p className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-200">
          Votación abierta. Selecciona tu carta.
        </p>
      ) : (
        <p className="mb-4 rounded-lg border border-amber-400/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
          La ronda está cerrada. Un admin debe iniciar una nueva ronda.
        </p>
      )}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {availableVotes.map((value) => {
          const isSelected = selectedVote === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleVote(value)}
              disabled={isSubmitting || !roundActive}
              className={`rounded-xl border px-4 py-4 text-lg font-semibold transition ${
                isSelected
                  ? 'border-cyan-300 bg-cyan-500 text-slate-950'
                  : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-600 hover:bg-slate-800'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {value}
            </button>
          )
        })}
      </section>
      {voteError ? <p className="mb-3 text-sm text-rose-300">{voteError}</p> : null}

      <section className="space-y-3">
        {availableVotes.map((value, index) => (
          <div key={`key-${value}`}>
            <p className="mb-1 text-sm text-slate-300">{value}</p>
            <progress className="h-3 w-full" value={votes[index]} max={maxVotes} />
          </div>
        ))}
      </section>
    </>
  )
}
