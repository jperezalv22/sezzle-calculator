import type { Operation } from '../api/client'
import type { KeyCommand } from '../hooks/keyboard'
import { OPERATIONS } from '../operations'

interface KeypadProps {
  /** The chosen operation, shown as a pressed key. */
  activeOperation: Operation | null
  canCalculate: boolean
  onCommand: (command: KeyCommand) => void
}

// The keys in reading order. The grid is four columns wide; = spans a full row.
const KEYS: readonly KeyCommand[] = [
  { type: 'clear' },
  { type: 'backspace' },
  { type: 'operation', operation: 'sqrt' },
  { type: 'operation', operation: 'divide' },
  { type: 'digit', digit: '7' },
  { type: 'digit', digit: '8' },
  { type: 'digit', digit: '9' },
  { type: 'operation', operation: 'multiply' },
  { type: 'digit', digit: '4' },
  { type: 'digit', digit: '5' },
  { type: 'digit', digit: '6' },
  { type: 'operation', operation: 'subtract' },
  { type: 'digit', digit: '1' },
  { type: 'digit', digit: '2' },
  { type: 'digit', digit: '3' },
  { type: 'operation', operation: 'add' },
  { type: 'operation', operation: 'percentage' },
  { type: 'digit', digit: '0' },
  { type: 'decimal' },
  { type: 'operation', operation: 'power' },
  { type: 'equals' },
]

/** What a key shows, and what a screen reader says for it when that differs. */
function describeKey(key: KeyCommand): { text: string; label?: string } {
  switch (key.type) {
    case 'digit':
      return { text: key.digit }
    case 'decimal':
      return { text: '.', label: 'Decimal point' }
    case 'operation':
      return { text: OPERATIONS[key.operation].symbol, label: OPERATIONS[key.operation].label }
    case 'equals':
      return { text: '=', label: 'Equals' }
    case 'backspace':
      return { text: '⌫', label: 'Backspace' }
    case 'clear':
      return { text: 'C', label: 'Clear' }
  }
}

export function Keypad({ activeOperation, canCalculate, onCommand }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Keypad">
      {KEYS.map((key, index) => {
        const { text, label } = describeKey(key)
        return (
          <button
            key={index}
            type="button"
            className={`key key--${key.type}`}
            aria-label={label}
            // aria-pressed marks the chosen operation as a toggle that is on,
            // which a screen reader announces and the CSS highlights.
            aria-pressed={key.type === 'operation' ? key.operation === activeOperation : undefined}
            disabled={key.type === 'equals' && !canCalculate}
            onClick={() => onCommand(key)}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}
