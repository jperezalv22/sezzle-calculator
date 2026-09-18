interface DisplayProps {
  /** The main number. */
  value: string
  /** The calculation so far, shown small above the number. */
  expression: string
  /** Replaces the number while set. */
  error: string | null
  pending: boolean
}

export function Display({ value, expression, error, pending }: DisplayProps) {
  return (
    <div className="display" aria-busy={pending}>
      <div className="display__expression">{expression}</div>
      {/* aria-live so a screen reader announces each new result or error.
          aria-atomic reads the whole number, not just the characters that
          changed. */}
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
