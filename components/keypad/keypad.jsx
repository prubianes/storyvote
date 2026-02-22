import { useEffect, useMemo, useState } from 'react'
import { applyVoteDelta } from '@/system/supabase'

export default function Keypad({ votes, room, onVotesChange }) {
  const values = useMemo(() => [1, 2, 3, 5, 8, 13, 20, '∞'], [])
  const [selectedVote, setSelectedVote] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mutateVoteCount = (sourceVotes, index, delta) =>
    sourceVotes.map((total, currentIndex) => {
      if (currentIndex !== index) {
        return total
      }
      return Math.max(0, total + delta)
    })

  useEffect(() => {
    const totalVotes = votes.reduce((partial, value) => partial + value, 0)
    if (totalVotes === 0) {
      setSelectedVote(null)
    }
  }, [votes])

  const maxVotes = votes.reduce((partial, value) => partial + value, 0) || 1

  const handleVote = async (vote) => {
    if (!room || isSubmitting) {
      return
    }

    const indexValue = values.indexOf(vote)
    if (indexValue < 0) {
      return
    }

    if (selectedVote === null) {
      setIsSubmitting(true)
      setSelectedVote(vote)
      onVotesChange?.((currentVotes) => mutateVoteCount(currentVotes, indexValue, 1))

      try {
        await applyVoteDelta(room, indexValue, 1)
      } catch {
        setSelectedVote(null)
        onVotesChange?.((currentVotes) => mutateVoteCount(currentVotes, indexValue, -1))
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (selectedVote === vote) {
      setIsSubmitting(true)
      setSelectedVote(null)
      onVotesChange?.((currentVotes) => mutateVoteCount(currentVotes, indexValue, -1))

      try {
        await applyVoteDelta(room, indexValue, -1)
      } catch {
        setSelectedVote(vote)
        onVotesChange?.((currentVotes) => mutateVoteCount(currentVotes, indexValue, 1))
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <>
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {values.map((value) => {
          const isSelected = selectedVote === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleVote(value)}
              disabled={isSubmitting}
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

      <section className="space-y-3">
        {values.map((value, index) => (
          <div key={`key-${value}`}>
            <p className="mb-1 text-sm text-slate-300">{value}</p>
            <progress className="h-3 w-full" value={votes[index]} max={maxVotes} />
          </div>
        ))}
      </section>
    </>
  )
}
