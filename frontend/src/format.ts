/**
 * Formats a number for display.
 *
 * The backend computes in float64, so `0.1 + 0.2` arrives as
 * 0.30000000000000004. Rounding to 12 significant digits hides that artefact
 * while staying well inside the ~15 digits a double actually carries, so no
 * result this calculator can produce is visibly truncated.
 */
export function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e21) {
    return value.toString()
  }
  return Number(value.toPrecision(12)).toString()
}

/**
 * Parses what the user typed into an operand field, or returns undefined if it
 * is not a usable number.
 *
 * Number() alone is not enough: it turns "" and "   " into 0, which would
 * silently submit a zero the user never entered.
 */
export function parseOperand(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return undefined
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}
