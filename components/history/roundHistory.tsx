import type { HistoryRound } from '@/system/supabase'

const voteLabels: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']

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
          const maxVotes = Math.max(...(round.vote_counts ?? [0]), 1)

          return (
            <article key={round.id} className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h5 className="font-semibold text-slate-100">
                  Ronda #{rounds.length - index} · {round.story || 'Sin historia'}
                </h5>
                <span className="text-xs text-slate-400">Votos: {round.total_votes ?? 0}</span>
              </div>
              <p className="text-xs text-slate-400">
                Inicio: {formatDateTime(round.created_at)} · Cierre: {formatDateTime(round.closed_at)}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {voteLabels.map((label, voteIndex) => {
                  const value = round.vote_counts?.[voteIndex] ?? 0
                  const width = `${(value / maxVotes) * 100}%`

                  return (
                    <div key={`${round.id}-${label}`} className="rounded-md border border-slate-700 p-2">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                      <div className="h-1.5 w-full rounded bg-slate-800">
                        <div className="h-full rounded bg-cyan-400" style={{ width }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
