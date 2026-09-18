import type { Operation } from '../api/client'
import type { Digit } from './calculatorReducer'

/**
 * Everything a user can ask the calculator to do. Keypad clicks and physical
 * key presses both become one of these, so there is a single path into the
 * logic whichever way the input arrives.
 */
export type KeyCommand =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'operation'; operation: Operation }
  | { type: 'equals' }
  | { type: 'backspace' }
  | { type: 'clear' }

// A Map rather than an object literal, so a lookup can never hit something
// inherited from Object.prototype.
const OPERATION_KEYS = new Map<string, Operation>([
  ['+', 'add'],
  ['-', 'subtract'],
  ['*', 'multiply'],
  ['/', 'divide'],
  ['^', 'power'],
  ['%', 'percentage'],
])

/**
 * Maps a KeyboardEvent.key value to a command, or null for keys the calculator
 * does not use. Numpad keys report the same values as the main keyboard.
 *
 * Square root has no key of its own; it is reachable by tabbing to its button.
 */
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
    case ',': // The numpad decimal key sends "," in locales that write 2,5.
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
