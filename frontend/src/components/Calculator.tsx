import { useEffect, useEffectEvent } from 'react'
import { useCalculator } from '../hooks/useCalculator'
import { Display } from './Display'
import { Keypad } from './Keypad'

export function Calculator() {
  const calculator = useCalculator()

  // useEffectEvent gives the listener the latest handler on every key press
  // without the effect re-subscribing each render: the effect runs once, and
  // the event function always sees current state.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => calculator.handleKeyDown(event))

  useEffect(() => {
    // On window, not on this element, so typing works before anything on the
    // page has been clicked or focused.
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <section className="calculator" aria-label="Calculator">
      <Display
        value={calculator.display}
        expression={calculator.expression}
        error={calculator.error}
        pending={calculator.pending}
      />
      <Keypad
        activeOperation={calculator.operation}
        canCalculate={calculator.canCalculate}
        onCommand={calculator.run}
      />
    </section>
  )
}
