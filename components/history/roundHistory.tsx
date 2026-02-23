import type { HistoryRound } from '@/system/supabase'

const voteLabels: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']
const voteColors = [
  'bg-cyan-400',
  'bg-sky-400',
  'bg-blue-400',
  'bg-indigo-400',
  'bg-violet-400',
  'bg-fuchsia-400',
  'bg-pink-400',
  'bg-rose-400',
]

function getRoundDecision(voteCounts: number[] = []): string {
  if (!voteCounts.length) {
    return '-'
  }

  const maxVotes = Math.max(...voteCounts)
  if (maxVotes <= 0) {
    return '-'
  }

  const winnerIndexes = voteCounts
    .map((count, index) => ({ count, index }))
    .filter((entry) => entry.count === maxVotes)
    .map((entry) => entry.index)

  const labels = winnerIndexes.map((idx) => voteLabels[idx]).join(' / ')
  return winnerIndexes.length > 1 ? `Empate (${labels})` : String(labels)
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-'
  }
  try {
    return new Date(value).toLocaleString('es-ES')
  } catch {
    return value
  }
}

interface RoundHistoryProps {
  rounds: HistoryRound[]
}

export default function RoundHistory({ rounds }: RoundHistoryProps) {
  if (!rounds.length) {
    return (
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
        <h4 className="text-lg font-semibold text-slate-100">Historial de rondas</h4>
        <p className="mt-2 text-sm text-slate-400">Aún no hay rondas cerradas.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
      <h4 className="text-lg font-semibold text-slate-100">Historial de rondas</h4>
      <div className="mt-4 space-y-4">
        {rounds.map((round, index) => {
          const voteCounts = round.vote_counts ?? []
          const totalVotes = voteCounts.reduce((acc, value) => acc + value, 0)
          const ranked = voteCounts
            .map((count, voteIndex) => ({ count, voteIndex }))
            .filter((entry) => entry.count > 0)
            .sort((a, b) => b.count - a.count)

          return (
            <article key={round.id} className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h5 className="font-semibold text-slate-100">
                  Ronda #{rounds.length - index} · {round.story || 'Sin historia'}
                </h5>
                <span className="text-xs text-slate-400">Votos: {round.total_votes ?? 0}</span>
              </div>
              <p className="mb-1 text-sm font-semibold text-cyan-300">
                Valor de ronda: {getRoundDecision(round.vote_counts)}
              </p>
              <p className="text-xs text-slate-400">
                Inicio: {formatDateTime(round.created_at)} · Cierre: {formatDateTime(round.closed_at)}
              </p>

              <div className="mt-4">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  {voteLabels.map((label, voteIndex) => {
                    const value = voteCounts[voteIndex] ?? 0
                    const width = totalVotes > 0 ? `${(value / totalVotes) * 100}%` : '0%'
                    if (value <= 0) {
                      return null
                    }

                    return (
                      <div
                        key={`${round.id}-${label}-strip`}
                        className={voteColors[voteIndex]}
                        style={{ width }}
                        title={`${label}: ${value}`}
                      />
                    )
                  })}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ranked.length === 0 ? (
                    <p className="text-xs text-slate-500">Sin votos registrados.</p>
                  ) : (
                    ranked.map(({ voteIndex, count }) => (
                      <div
                        key={`${round.id}-${voteIndex}-rank`}
                        className="flex items-center justify-between rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${voteColors[voteIndex]}`} />
                          <span>Valor {voteLabels[voteIndex]}</span>
                        </div>
                        <span>
                          {count} ({Math.round((count / totalVotes) * 100)}%)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
