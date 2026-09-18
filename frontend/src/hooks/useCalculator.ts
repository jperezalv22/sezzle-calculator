import { useEffect, useReducer, useRef } from 'react'
import { CalculationError, NetworkError, calculate } from '../api/client'
import { formatNumber } from '../format'
import { OPERATIONS } from '../operations'
import { calculatorReducer, initialState, pendingCalculation } from './calculatorReducer'
import { commandForKey, type KeyCommand } from './keyboard'

/** Only = calls the API. Square root works both ways: "√ 9 =" and "9 √ =". */
export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)

  // A ref, not state: it is only kept so the request can be cancelled.
  const inFlight = useRef<AbortController | null>(null)

  // Cancel on unmount so a late answer is not dispatched.
  useEffect(() => () => inFlight.current?.abort(), [])

  const calculation = pendingCalculation(state)

  async function equals() {
    // The ref, not state.pending: two presses in one render would both send.
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
      // Aborted by clear or unmount, so the answer is no longer wanted.
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
    // Cancel any request so its answer does not land on the cleared display.
    inFlight.current?.abort()
    inFlight.current = null
    dispatch({ type: 'clear' })
  }

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

  function handleKeyDown(event: KeyboardEvent) {
    // Leave shortcuts like Ctrl+R alone.
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return
    }
    // Enter on a focused button already presses it; treating it as = too would press two keys.
    if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) {
      return
    }

    const command = commandForKey(event.key)
    if (command === null) {
      return
    }
    // "/" would otherwise open quick find in Firefox.
    event.preventDefault()
    run(command)
  }

  const { operation, firstOperand } = state

  return {
    display: state.input !== '' ? state.input : formatNumber(firstOperand ?? state.result ?? 0),
    /** "12 +", "√9", or "√" while its number is typed. */
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
    canCalculate: !state.pending && calculation !== null,
    run,
    handleKeyDown,
  }
}

function messageFor(error: unknown): string {
  // Anything else would be a bug.
  if (error instanceof CalculationError || error instanceof NetworkError) {
    return error.message
  }
  return 'Something went wrong.'
}
