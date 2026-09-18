import type { Operation } from '../api/client'
import { OPERATIONS } from '../operations'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export interface CalculatorState {
  /** Kept as text so "0." and "2.50" survive typing. */
  input: string
  firstOperand: number | null
  operation: Operation | null
  result: number | null
  error: string | null
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

/** True after "9 √": the only operand is taken, so typed digits are ignored. */
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
      return { ...initialState, error: action.message }
    case 'clear':
      return initialState
  }

  // Ignore keys while waiting: the answer would overwrite what was typed.
  if (state.pending) {
    return state
  }

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
        // "√ 9" has no first number for another operation to take.
        if (s.firstOperand === null) {
          return s
        }
        // Swap the operation until the second number is typed; after that, only =.
        return s.input === '' ? { ...s, operation: action.operation } : s
      }
      if (s.input === '' && isUnary(action.operation)) {
        // √ with nothing typed waits for the next number. If = comes first,
        // pendingCalculation uses the result on screen.
        return { ...s, operation: action.operation }
      }
      // Falls back to the last result so "= then +" chains.
      const value = s.input !== '' ? Number(s.input) : s.result
      if (value === null) {
        return s
      }
      return { ...s, firstOperand: value, operation: action.operation, input: '', result: null }
    }

    case 'backspace':
      if (s.input !== '') {
        return { ...s, input: s.input.slice(0, -1) }
      }
      if (s.operation !== null) {
        // Put the operand back on screen as if it were a result.
        return { ...s, operation: null, firstOperand: null, result: s.firstOperand ?? s.result }
      }
      return s
  }
}

/** What = would send, or null if the entry is incomplete. */
export function pendingCalculation(
  state: CalculatorState,
): { operation: Operation; operands: number[] } | null {
  const { operation, firstOperand, input } = state
  if (operation === null) {
    return null
  }
  if (isUnary(operation)) {
    // "9 √" holds its number, "√ 9" has it in input, "= √" uses the result.
    if (firstOperand !== null) {
      return { operation, operands: [firstOperand] }
    }
    if (input !== '') {
      return { operation, operands: [Number(input)] }
    }
    return state.result === null ? null : { operation, operands: [state.result] }
  }
  if (firstOperand === null || input === '') {
    return null
  }
  return { operation, operands: [firstOperand, Number(input)] }
}
