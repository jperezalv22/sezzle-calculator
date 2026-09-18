import type { Operation } from '../api/client'
import { OPERATIONS } from '../operations'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export interface CalculatorState {
  /** The number being typed, kept as text so "0." and "2.50" survive. Empty when none. */
  input: string
  /** The left operand, fixed when an operation is chosen. */
  firstOperand: number | null
  operation: Operation | null
  /** The last answer, shown until something new is typed. */
  result: number | null
  /** The API's message from the last failed calculation. */
  error: string | null
  /** True while = is waiting on the API. */
  pending: boolean
}

export type CalculatorAction =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'operation'; operation: Operation }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'request' }
  | { type: 'success'; result: number }
  | { type: 'failure'; message: string }

export const initialState: CalculatorState = {
  input: '',
  firstOperand: null,
  operation: null,
  result: null,
  error: null,
  pending: false,
}

function isUnary(operation: Operation): boolean {
  return OPERATIONS[operation].operandLabels.length === 1
}

/**
 * True after "9 √": the operation's only operand is already taken, so there is
 * nowhere for typed input to go. After "√" alone it is still to be typed.
 */
function operandsComplete(state: CalculatorState): boolean {
  return state.operation !== null && isUnary(state.operation) && state.firstOperand !== null
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'request':
      return { ...state, pending: true, error: null }
    case 'success':
      return { ...initialState, result: action.result }
    case 'failure':
      // The entry is dropped along with the failure, so the next key starts clean.
      return { ...initialState, error: action.message }
    case 'clear':
      return initialState
  }

  // Everything below is a keypress. None act while a request is in flight: the
  // answer is about to replace the display and would wipe out what was typed.
  if (state.pending) {
    return state
  }

  // Any key dismisses an error, then does its normal job.
  const s = state.error === null ? state : { ...state, error: null }

  switch (action.type) {
    case 'digit':
      if (operandsComplete(s)) {
        return s
      }
      return { ...s, input: s.input === '0' ? action.digit : s.input + action.digit, result: null }

    case 'decimal':
      if (operandsComplete(s) || s.input.includes('.')) {
        return s
      }
      return { ...s, input: s.input === '' ? '0.' : s.input + '.', result: null }

    case 'operation': {
      if (s.operation !== null) {
        // "√ 9" has no first number that another operation could take over.
        if (s.firstOperand === null) {
          return s
        }
        // Before the second number is typed, a new operation replaces the old
        // one. After it, = has to finish the calculation first, because only =
        // calls the API.
        return s.input === '' ? { ...s, operation: action.operation } : s
      }
      // The number typed, or else the last result, so "= then +" chains.
      const value = s.input !== '' ? Number(s.input) : s.result
      if (value === null) {
        // Nothing to act on yet. A one-operand operation can still come first
        // and take the number typed after it ("√ 9 ="); a two-operand one can't.
        return isUnary(action.operation) ? { ...s, operation: action.operation } : s
      }
      return { ...s, firstOperand: value, operation: action.operation, input: '', result: null }
    }

    case 'backspace':
      if (s.input !== '') {
        return { ...s, input: s.input.slice(0, -1) }
      }
      if (s.operation !== null) {
        // Undo the operation, leaving its number on screen as if just computed.
        return { ...s, operation: null, firstOperand: null, result: s.firstOperand }
      }
      return s
  }
}

/** What = would send, or null while the entry is incomplete. */
export function pendingCalculation(
  state: CalculatorState,
): { operation: Operation; operands: number[] } | null {
  const { operation, firstOperand, input } = state
  if (operation === null) {
    return null
  }
  if (isUnary(operation)) {
    // "9 √" already holds its number; "√ 9" has it in the input.
    if (firstOperand !== null) {
      return { operation, operands: [firstOperand] }
    }
    return input === '' ? null : { operation, operands: [Number(input)] }
  }
  if (firstOperand === null || input === '') {
    return null
  }
  return { operation, operands: [firstOperand, Number(input)] }
}
