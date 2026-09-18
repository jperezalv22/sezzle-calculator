import type { HistoryEntry, Operation } from '../api/client'
import { formatNumber } from '../format'
import { OPERATIONS } from '../operations'

interface HistoryProps {
  entries: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
}

// The fallback covers an operation the backend knows and this build doesn't.
function describe(entry: HistoryEntry): string {
  const info: (typeof OPERATIONS)[Operation] | undefined = OPERATIONS[entry.operation]
  return info ? info.describe(entry.operands) : `${entry.operation}(${entry.operands.join(', ')})`
}

/** Newest first. Selecting an entry loads it back into the form. */
export function History({ entries, onSelect }: HistoryProps) {
  if (entries.length === 0) {
    return <p className="history__empty">Nothing calculated yet.</p>
  }

  return (
    <ul className="history">
      {entries.map((entry) => (
        // Go timestamps have nanosecond precision, so `at` is unique even for repeats.
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
