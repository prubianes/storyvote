import type { HistoryRound } from '@/system/supabase'

const voteLabels: Array<number | '∞'> = [1, 2, 3, 5, 8, 13, 20, '∞']
const voteBarColors = ['#ff5a3c', '#ff8b5e', '#65d8e6', '#5c7cff', '#6ce0b3', '#9fe6ff', '#f4f0e8', '#8896a4']

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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildHistoryRows(historyRounds: HistoryRound[], locale: string, noStoryLabel: string, tieLabel: string): string {
  return historyRounds
    .map((round, index) => {
      const voteCounts = round.vote_counts ?? []
      const totalVotes = voteCounts.reduce((acc, value) => acc + (value ?? 0), 0)
      const distributionChart = voteLabels
        .map((label, voteIndex) => {
          const count = voteCounts[voteIndex] ?? 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const barMaxWidth = 120
          const barWidth = pct > 0 ? Math.max(2, Math.round((pct / 100) * barMaxWidth)) : 0
          return `
            <div class="vote-row">
              <span class="vote-label">${escapeHtml(String(label))}</span>
              <span class="bar-svg-wrap">
                <svg width="${barMaxWidth}" height="10" viewBox="0 0 ${barMaxWidth} 10" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(String(label))} ${count}">
                  <rect x="0.5" y="0.5" width="${barMaxWidth - 1}" height="9" fill="#f6f6f6" stroke="#111111" />
                  <rect x="1" y="1" width="${barWidth}" height="8" fill="${voteBarColors[voteIndex]}" />
                </svg>
              </span>
              <span class="vote-meta">${count} (${pct}%)</span>
            </div>
          `
        })
        .join('')

      return `
        <tr>
          <td>${historyRounds.length - index}</td>
          <td class="story-cell">${escapeHtml(round.story || noStoryLabel)}</td>
          <td class="score-cell">${escapeHtml(getRoundDecision(round.vote_counts, tieLabel))}</td>
          <td>${escapeHtml(String(round.total_votes ?? 0))}</td>
          <td>${escapeHtml(formatDateTime(round.created_at, locale))}</td>
          <td>${escapeHtml(formatDateTime(round.closed_at, locale))}</td>
          <td><div class="vote-chart">${distributionChart}</div></td>
        </tr>
      `
    })
    .join('')
}

interface HistoryPdfLabels {
  documentTitle: string
  mainTitle: string
  room: string
  exportedAt: string
  totalRounds: string
  colRound: string
  colStory: string
  colScore: string
  colTotalVotes: string
  colStart: string
  colClose: string
  colDistribution: string
  noStory: string
  tie: string
}

function buildHistoryPdfHtml(
  historyRounds: HistoryRound[],
  language: string,
  locale: string,
  labels: HistoryPdfLabels
): string {
  const rows = buildHistoryRows(historyRounds, locale, labels.noStory, labels.tie)

  return `
    <!doctype html>
    <html lang="${language}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(labels.documentTitle)}</title>
        <style>
          :root { --ink:#111111; --paper:#ffffff; --paper2:#f4f4f4; --line:#111111; --red:#ff5a3c; --cyan:#65d8e6; --blue:#5c7cff; }
          * { box-sizing: border-box; }
          body { margin: 0; background: var(--paper2); color: var(--ink); font-family: "Instrument Sans", "Helvetica Neue", Helvetica, sans-serif; }
          .sheet { margin: 16px; border: 2px solid var(--line); background: var(--paper); }
          .head { border-bottom: 2px solid var(--line); padding: 14px; background: linear-gradient(90deg, rgba(255,90,60,.18), rgba(101,216,230,.18)); }
          h1 { margin: 0; font-size: 24px; line-height: .9; font-family: "Arial Black", "Archivo Black", sans-serif; text-transform: uppercase; letter-spacing: -.02em; }
          .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
          .meta span { border: 2px solid var(--line); padding: 5px 8px; font-size: 10px; font-family: "IBM Plex Mono", "Courier New", monospace; text-transform: uppercase; letter-spacing: .08em; background: #fff; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 2px solid var(--line); padding: 7px 6px; text-align: left; vertical-align: top; }
          th { background: #e9edf0; font-family: "IBM Plex Mono", "Courier New", monospace; text-transform: uppercase; letter-spacing: .08em; font-size: 9px; }
          td { background: #fff; }
          tbody tr:nth-child(even) td { background: #f9f9f9; }
          .story-cell { font-weight: 700; }
          .vote-chart { display: flex; flex-direction: column; gap: 4px; min-width: 220px; }
          .vote-row { display: flex; align-items: center; gap: 6px; }
          .vote-label { font-size: 9px; color: #111111; font-weight: 700; text-align: right; width: 15px; }
          .bar-svg-wrap { display: inline-flex; align-items: center; }
          .vote-meta { font-size: 9px; color: #111111; white-space: nowrap; text-align: right; font-family: "IBM Plex Mono", "Courier New", monospace; }
          .score-cell { font-weight: 700; }
          @media print {
            body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .sheet { margin: 0; border: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header class="head">
            <h1>${escapeHtml(labels.mainTitle)}</h1>
            <div class="meta">
              <span>${escapeHtml(labels.room)}</span>
              <span>${escapeHtml(labels.exportedAt)}</span>
              <span>${escapeHtml(labels.totalRounds)}</span>
            </div>
          </header>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(labels.colRound)}</th>
                <th>${escapeHtml(labels.colStory)}</th>
                <th>${escapeHtml(labels.colScore)}</th>
                <th>${escapeHtml(labels.colTotalVotes)}</th>
                <th>${escapeHtml(labels.colStart)}</th>
                <th>${escapeHtml(labels.colClose)}</th>
                <th>${escapeHtml(labels.colDistribution)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </main>
      </body>
    </html>
  `
}

type PdfLabelKey =
  | 'admin.pdfDocumentTitle'
  | 'admin.pdfMainTitle'
  | 'admin.pdfRoom'
  | 'admin.pdfExportedAt'
  | 'admin.pdfTotalRounds'
  | 'admin.pdfColRound'
  | 'admin.pdfColStory'
  | 'admin.pdfColScore'
  | 'admin.pdfColTotalVotes'
  | 'admin.pdfColStart'
  | 'admin.pdfColClose'
  | 'admin.pdfColDistribution'
  | 'history.noStory'
  | 'history.tie'

interface ExportHistoryPdfParams {
  historyRounds: HistoryRound[]
  roomSlug: string
  language: string
  locale: string
  t: (key: PdfLabelKey, vars?: Record<string, string | number>) => string
}

export function exportHistoryPdf({ historyRounds, roomSlug, language, locale, t }: ExportHistoryPdfParams): boolean {
  const exportedAt = new Date().toLocaleString(locale)
  const html = buildHistoryPdfHtml(historyRounds, language, locale, {
    documentTitle: t('admin.pdfDocumentTitle', { room: roomSlug }),
    mainTitle: t('admin.pdfMainTitle'),
    room: t('admin.pdfRoom', { room: roomSlug }),
    exportedAt: t('admin.pdfExportedAt', { date: exportedAt }),
    totalRounds: t('admin.pdfTotalRounds', { count: historyRounds.length }),
    colRound: t('admin.pdfColRound'),
    colStory: t('admin.pdfColStory'),
    colScore: t('admin.pdfColScore'),
    colTotalVotes: t('admin.pdfColTotalVotes'),
    colStart: t('admin.pdfColStart'),
    colClose: t('admin.pdfColClose'),
    colDistribution: t('admin.pdfColDistribution'),
    noStory: t('history.noStory'),
    tie: t('history.tie'),
  })

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    return false
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  let didPrint = false
  const tryPrint = () => {
    if (didPrint) {
      return
    }
    didPrint = true
    printWindow.focus()
    printWindow.print()
  }

  printWindow.addEventListener('load', tryPrint, { once: true })
  window.setTimeout(tryPrint, 350)

  return true
}
