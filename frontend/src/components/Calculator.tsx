import { useEffect, useEffectEvent } from 'react'
import { useCalculator } from '../hooks/useCalculator'
import { useHistory } from '../hooks/useHistory'
import { Display } from './Display'
import { History } from './History'
import { Keypad } from './Keypad'

export function Calculator() {
  const history = useHistory()
  const calculator = useCalculator({ onCalculated: history.refresh })

  // Sees current state without re-subscribing the listener on every render.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => calculator.handleKeyDown(event))

  useEffect(() => {
    // On window so typing works before anything has focus.
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="workspace">
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
      <History
        entries={history.entries}
        loading={history.loading}
        error={history.error}
        onRetry={history.refresh}
        onSelect={(entry) => calculator.recall(entry.result)}
      />
    </div>
  )
}
