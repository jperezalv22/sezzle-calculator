import { useEffect, useReducer, useRef } from 'react'
import { CalculationError, NetworkError, calculate } from '../api/client'
import { formatNumber } from '../format'
import { OPERATIONS } from '../operations'
import { calculatorReducer, initialState, pendingCalculation } from './calculatorReducer'
import { commandForKey, type KeyCommand } from './keyboard'

/**
 * Keypad state for the calculator: type a number, choose an operation, type
 * the second number, press =. Square root takes its number on either side:
 * "√ 9 =" or "9 √ =".
 *
 * Only = talks to the API. Every other key is a local state change.
 */
export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)

  // The request in flight, if any. It is a ref, not state, because it is not
  // something to render; it exists so the request can be cancelled.
  const inFlight = useRef<AbortController | null>(null)

  // Cancel on unmount so a late answer is not dispatched into a dead component.
  useEffect(() => () => inFlight.current?.abort(), [])

  const calculation = pendingCalculation(state)

  async function equals() {
    // Checked against the ref rather than state.pending: two presses within one
    // render both see the state from before either press, and would both send.
    if (inFlight.current !== null || calculation === null) {
      return
    }

    const controller = new AbortController()
    inFlight.current = controller
    dispatch({ type: 'request' })

    try {
      const result = await calculate(calculation.operation, calculation.operands, controller.signal)
      if (!controller.signal.aborted) {
        dispatch({ type: 'success', result })
      }
    } catch (error) {
      // Aborted means clear was pressed or the component went away, and either
      // way this answer is no longer wanted.
      if (!controller.signal.aborted) {
        dispatch({ type: 'failure', message: messageFor(error) })
      }
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null
      }
    }
  }

  function clear() {
    // Clear also cancels a calculation in progress, instead of letting its
    // answer land on the freshly cleared display.
    inFlight.current?.abort()
    inFlight.current = null
    dispatch({ type: 'clear' })
  }

  /** Carries out one command, whether it came from a click or a key press. */
  function run(command: KeyCommand) {
    switch (command.type) {
      case 'equals':
        void equals()
        return
      case 'clear':
        clear()
        return
      default:
        dispatch(command)
    }
  }

  /** A window keydown listener: digits, operators, Enter, Escape, Backspace. */
  function handleKeyDown(event: KeyboardEvent) {
    // Leave browser and OS shortcuts alone: Ctrl+R must still reload.
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return
    }
    // Enter on a focused button already presses that button. Treating it as =
    // as well would press two keys at once, and taking Enter away from buttons
    // would break keyboard navigation of the keypad.
    if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) {
      return
    }

    const command = commandForKey(event.key)
    if (command === null) {
      return
    }
    // Keeps the browser's own meaning of the key from firing too: "/" opens
    // quick find in Firefox, for one.
    event.preventDefault()
    run(command)
  }

  const { operation, firstOperand } = state

  return {
    /** The number to show: what is being typed, else the pending operand, else the last result. */
    display: state.input !== '' ? state.input : formatNumber(firstOperand ?? state.result ?? 0),
    /** The calculation so far, above the number: "12 +", "√9", or "√" while its number is typed. */
    expression:
      operation === null
        ? ''
        : firstOperand === null
          ? OPERATIONS[operation].symbol
          : OPERATIONS[operation].operandLabels.length === 1
            ? `${OPERATIONS[operation].symbol}${formatNumber(firstOperand)}`
            : `${formatNumber(firstOperand)} ${OPERATIONS[operation].symbol}`,
    operation,
    error: state.error,
    pending: state.pending,
    /** False while a request runs or the entry is incomplete; drives the = key. */
    canCalculate: !state.pending && calculation !== null,
    run,
    handleKeyDown,
  }
}

function messageFor(error: unknown): string {
  // Both carry a message written for people; anything else would be a bug here.
  if (error instanceof CalculationError || error instanceof NetworkError) {
    return error.message
  }
  return 'Something went wrong.'
}
