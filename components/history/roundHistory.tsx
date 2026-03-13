import type { HistoryRound } from '@/system/supabase'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'

const voteLabels: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']
const voteColors = ['#ff5a3c', '#ff8b5e', '#65d8e6', '#5c7cff', '#6ce0b3', '#9fe6ff', '#f4f0e8', '#8896a4']
const voteTextColors = ['#fff6ef', '#111111', '#071316', '#f5f2ff', '#07130e', '#071316', '#111111', '#f4f0e8']

function getRoundDecision(voteCounts: number[] = [], tieLabel = 'Tie'): string {
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
  return winnerIndexes.length > 1 ? `${tieLabel} (${labels})` : String(labels)
}

function formatDateTime(value: string | null, locale: string): string {
  if (!value) {
    return '-'
  }
  try {
    return new Date(value).toLocaleString(locale)
  } catch {
    return value
  }
}

interface RoundHistoryProps {
  rounds: HistoryRound[]
}

export default function RoundHistory({ rounds }: RoundHistoryProps) {
  const { t, locale } = useI18n()

  if (!rounds.length) {
    return (
      <section className="ui-panel history-panel">
        <p className="micro-label">{t('history.title')}</p>
        <h4 style={{ marginTop: '0.8rem', fontSize: 'clamp(2rem, 4vw, 3.8rem)' }}>{t('history.title')}</h4>
        <p style={{ marginTop: '0.9rem', color: 'var(--muted)' }}>{t('history.empty')}</p>
      </section>
    )
  }

  return (
    <section className="ui-panel history-panel">
      <p className="micro-label">{t('history.title')}</p>
      <h4 style={{ marginTop: '0.8rem', fontSize: 'clamp(2rem, 4vw, 3.8rem)' }}>{t('history.title')}</h4>
      <div className="history-list">
        {rounds.map((round, index) => {
          const voteCounts = round.vote_counts ?? []
          const totalVotes = voteCounts.reduce((acc, value) => acc + value, 0)
          const storyLabel = round.story || t('history.noStory')

          return (
            <article key={round.id} className="history-item">
              <div className="history-col-main">
                <strong>{t('history.roundLabel', { number: rounds.length - index })}</strong>
                <div className="micro-label" style={{ marginTop: '0.35rem' }}>
                  {t('history.votes', { count: round.total_votes ?? 0 })}
                </div>
              </div>

              <div className="history-col-story">
                <h5 className="history-story" title={storyLabel}>
                  {t('history.roundTitle', {
                    story: storyLabel,
                  })}
                </h5>
                <p className="micro-label history-time">
                  {t('history.start')}: {formatDateTime(round.created_at, locale)} · {t('history.close')}:{' '}
                  {formatDateTime(round.closed_at, locale)}
                </p>

                <div className="history-meter">
                  {voteLabels.map((label, voteIndex) => {
                    const value = voteCounts[voteIndex] ?? 0
                    const pct = totalVotes > 0 ? (value / totalVotes) * 100 : 0
                    const width = `${pct}%`
                    const showInlineLabel = pct >= 20
                    if (value <= 0) {
                      return null
                    }

                    return (
                      <div
                        key={`${round.id}-${label}-strip`}
                        className="history-meter-segment"
                        style={{
                          width,
                          background: voteColors[voteIndex],
                          color: voteTextColors[voteIndex],
                        }}
                        title={`(${label}): ${value} ${t('history.votesWord')}`}
                      >
                        {showInlineLabel ? (
                          <span className="history-meter-segment-label">
                            ({label}): {value} {t('history.votesWord')}
                          </span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="history-col-result">
                <strong className="history-result">
                  {t('history.roundScore', {
                    decision: getRoundDecision(round.vote_counts, t('history.tie')),
                  })}
                </strong>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
