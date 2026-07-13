import type { HistoryRound } from '@/system/supabase'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'

const voteLabels: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']
const fibValues = [1, 2, 3, 5, 8, 13, 20]

function getRoundDecision(voteCounts: number[] = [], tieLabel = 'Tie'): string {
  if (!voteCounts.length) return '-'
  const maxVotes = Math.max(...voteCounts)
  if (maxVotes <= 0) return '-'
  const winnerIndexes = voteCounts
    .map((count, index) => ({ count, index }))
    .filter((entry) => entry.count === maxVotes)
    .map((entry) => entry.index)
  const labels = winnerIndexes.map((idx) => voteLabels[idx]).join(' / ')
  return winnerIndexes.length > 1 ? `${tieLabel} (${labels})` : String(labels)
}

function getStats(voteCounts: number[]) {
  const total = voteCounts.reduce((a, b) => a + b, 0) || 1
  let maxCount = 0
  let modeIdx = 0
  let wsum = 0
  let wn = 0
  let lo: number | null = null
  let hi: number | null = null

  voteCounts.forEach((c, i) => {
    if (c > maxCount) { maxCount = c; modeIdx = i }
    if (c > 0 && i < fibValues.length) {
      wsum += fibValues[i] * c
      wn += c
      lo = lo === null ? fibValues[i] : Math.min(lo, fibValues[i])
      hi = hi === null ? fibValues[i] : Math.max(hi, fibValues[i])
    }
  })

  const avg = wn ? wsum / wn : 0
  const agreement = Math.round((maxCount / total) * 100)
  const consensus = agreement >= 66
  const rangeStr = lo === null ? '-' : lo === hi ? String(lo) : `${lo}–${hi}`

  return { modeIdx, avg, agreement, consensus, rangeStr, maxCount }
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface RoundHistoryProps {
  rounds: HistoryRound[]
  isLoading?: boolean
  isReconnecting?: boolean
  hasSyncError?: boolean
  onRetrySync?: () => void | Promise<void>
}

export default function RoundHistory({
  rounds,
  isLoading = false,
  hasSyncError = false,
  onRetrySync,
}: RoundHistoryProps) {
  const { t } = useI18n()

  const isEmpty = !isLoading && !rounds.length

  return (
    <section className="history-panel">
      {hasSyncError ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
          <p className="error-text" style={{ margin: 0 }}>{t('history.syncError')}</p>
          <button type="button" className="ui-btn" onClick={() => void onRetrySync?.()}>
            {t('history.retry')}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <p style={{ color: 'var(--muted)', fontSize: '13px', padding: '4px 0' }}>{t('history.loading')}</p>
      ) : null}

      {isEmpty ? (
        <p style={{ color: 'var(--muted)', fontSize: '13px', padding: '4px 0' }}>{t('history.empty')}</p>
      ) : null}

      {rounds.map((round, index) => {
        const voteCounts = round.vote_counts ?? []
        const total = voteCounts.reduce((a, b) => a + b, 0)
        const { modeIdx, avg, agreement, consensus, rangeStr, maxCount } = getStats(voteCounts)
        const storyLabel = round.story || t('history.noStory')
        const resultLabel = total > 0 ? String(voteLabels[modeIdx]) : '-'
        const ago = timeAgo(round.closed_at)
        const voterCount = round.total_votes ?? total

        return (
          <article key={round.id} className="history-item">
            <div className="history-result-col">
              <div className="history-result-number">{resultLabel}</div>
              <div className="history-pts-label">pts</div>
            </div>

            <div className="history-body">
              <div className="history-title-row">
                <span className="history-story" title={storyLabel}>{storyLabel}</span>
                <span className={`history-tag ${consensus ? 'is-consensus' : 'is-spread'}`}>
                  {consensus ? 'Consensus' : 'Spread'}
                </span>
              </div>
              <p className="history-meta">
                {t('history.roundLabel', { number: rounds.length - index })} · {voterCount} {t('history.votesWord')}{ago ? ` · ${ago}` : ''}
              </p>
              {total > 0 ? (
                <div className="history-stats-row">
                  <span className="history-stat-pill">
                    <span className="history-stat-key">Avg</span>
                    <span className="history-stat-val">{avg.toFixed(1)}</span>
                  </span>
                  <span className="history-stat-pill">
                    <span className="history-stat-key">Range</span>
                    <span className="history-stat-val">{rangeStr}</span>
                  </span>
                  <span className="history-stat-pill">
                    <span className="history-stat-key">Agree</span>
                    <span className="history-stat-val">{agreement}%</span>
                  </span>
                </div>
              ) : null}
            </div>

            {total > 0 ? (
              <div className="history-bars" aria-hidden="true">
                {voteCounts.map((count, i) => {
                  const height = 4 + (maxCount > 0 ? (count / maxCount) * 34 : 0)
                  const isMode = i === modeIdx && count > 0
                  return (
                    <div key={i} className="history-bar-col">
                      <div
                        className="history-bar"
                        style={{
                          width: '9px',
                          height: `${height}px`,
                          background: count === 0
                            ? 'var(--line)'
                            : isMode
                              ? 'var(--accent)'
                              : 'var(--accent-soft)',
                        }}
                      />
                      <span className={`history-bar-label ${isMode ? 'is-mode' : ''}`}>
                        {voteLabels[i]}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}
