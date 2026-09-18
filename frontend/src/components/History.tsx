import type { HistoryEntry, Operation } from '../api/client'
import { formatNumber } from '../format'
import { OPERATIONS } from '../operations'

interface HistoryProps {
  entries: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
}

/**
 * How an entry reads. The fallback covers an operation the backend knows and
 * this build of the frontend does not, which the types alone cannot rule out:
 * they describe what the code expects, not what the server actually sends.
 */
function describe(entry: HistoryEntry): string {
  const info: (typeof OPERATIONS)[Operation] | undefined = OPERATIONS[entry.operation]
  return info ? info.describe(entry.operands) : `${entry.operation}(${entry.operands.join(', ')})`
}

/** The recent calculations, newest first. Selecting one loads it back into the form. */
export function History({ entries, onSelect }: HistoryProps) {
  if (entries.length === 0) {
    return <p className="history__empty">Nothing calculated yet.</p>
  }

  return (
    <ul className="history">
      {entries.map((entry) => (
        // Go timestamps carry nanosecond precision, so `at` is unique per entry
        // and makes a stable key even when the same calculation repeats.
        <li key={entry.at}>
          <button
            type="button"
            className="history__item"
            onClick={() => onSelect(entry)}
            title={`Reuse this calculation · ${new Date(entry.at).toLocaleTimeString()}`}
          >
            <span className="history__expression">{describe(entry)}</span>
            <span className="history__result">{formatNumber(entry.result)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
