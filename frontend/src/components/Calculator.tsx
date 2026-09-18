import { useEffect, useEffectEvent } from 'react'
import { useCalculator } from '../hooks/useCalculator'
import { Display } from './Display'
import { Keypad } from './Keypad'

export function Calculator() {
  const calculator = useCalculator()

  // Sees current state without re-subscribing the listener on every render.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => calculator.handleKeyDown(event))

  useEffect(() => {
    // On window so typing works before anything has focus.
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
