interface DisplayProps {
  value: string
  expression: string
  /** Replaces the number while set. */
  error: string | null
  pending: boolean
}

export function Display({ value, expression, error, pending }: DisplayProps) {
  return (
    <div className="display" aria-busy={pending}>
      <div className="display__expression">{expression}</div>
      {/* aria-atomic reads the whole number, not just the digits that changed. */}
      <output
        className={error === null ? 'display__value' : 'display__value display__value--error'}
        aria-live="polite"
        aria-atomic="true"
      >
        {error ?? value}
      </output>
    </div>
  )
}
