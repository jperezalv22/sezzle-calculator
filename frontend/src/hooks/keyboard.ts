import type { Operation } from '../api/client'
import type { Digit } from './calculatorReducer'

/** Clicks and key presses both become one of these. */
export type KeyCommand =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'operation'; operation: Operation }
  | { type: 'equals' }
  | { type: 'backspace' }
  | { type: 'clear' }

// A Map so a lookup can't hit something inherited from Object.prototype.
const OPERATION_KEYS = new Map<string, Operation>([
  ['+', 'add'],
  ['-', 'subtract'],
  ['*', 'multiply'],
  ['/', 'divide'],
  ['^', 'power'],
  ['%', 'percentage'],
])

/** Null for unused keys. Square root has no key; tab to its button. */
export function commandForKey(key: string): KeyCommand | null {
  if (key.length === 1 && key >= '0' && key <= '9') {
    return { type: 'digit', digit: key as Digit }
  }

  const operation = OPERATION_KEYS.get(key)
  if (operation !== undefined) {
    return { type: 'operation', operation }
  }

  switch (key) {
    case '.':
    case ',': // Numpad decimal key in locales that write 2,5.
      return { type: 'decimal' }
    case 'Enter':
    case '=':
      return { type: 'equals' }
    case 'Backspace':
      return { type: 'backspace' }
    case 'Escape':
      return { type: 'clear' }
    default:
      return null
  }
}
