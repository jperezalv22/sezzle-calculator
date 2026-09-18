import type { HistoryEntry, Operation } from '../api/client'
import { formatNumber } from '../format'
import { OPERATIONS } from '../operations'

interface HistoryProps {
  entries: HistoryEntry[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onSelect: (entry: HistoryEntry) => void
}

// The fallback covers an operation the backend knows and this build doesn't.
function describe(entry: HistoryEntry): string {
  const info: (typeof OPERATIONS)[Operation] | undefined = OPERATIONS[entry.operation]
  return info ? info.describe(entry.operands) : `${entry.operation}(${entry.operands.join(', ')})`
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

/** Newest first. Selecting an entry puts its result on the display. */
export function History({ entries, loading, error, onRetry, onSelect }: HistoryProps) {
  return (
    <section className="history" aria-labelledby="history-title">
      <div className="history__header">
        <h2 id="history-title" className="history__title">
          History
        </h2>
        {error !== null && (
          <button type="button" className="history__retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>

      {error !== null && <p className="history__message history__message--error">{error}</p>}

      {loading ? (
        <p className="history__message">Loading…</p>
      ) : entries.length === 0 ? (
        error === null && <p className="history__message">Nothing calculated yet.</p>
      ) : (
        <ol className="history__list">
          {entries.map((entry, index) => {
            const expression = describe(entry)
            const result = formatNumber(entry.result)
            return (
              // The list is replaced whole on every load, so the index is a stable key.
              <li key={`${entry.at}-${index}`}>
                <button
                  type="button"
                  className="history__item"
                  aria-label={`Use ${result}, from ${expression}`}
                  onClick={() => onSelect(entry)}
                >
                  <span className="history__expression">{expression} =</span>
                  <span className="history__result">{result}</span>
                  <time className="history__time" dateTime={entry.at}>
                    {timeFormat.format(new Date(entry.at))}
                  </time>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
