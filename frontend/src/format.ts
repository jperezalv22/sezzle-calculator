/**
 * Rounds to 12 significant digits so 0.1 + 0.2 shows as 0.3 instead of
 * 0.30000000000000004. A double carries about 15, so nothing real is lost.
 */
export function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e21) {
    return value.toString()
  }
  return Number(value.toPrecision(12)).toString()
}

/** Returns undefined for blank input, which Number() would turn into 0. */
export function parseOperand(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return undefined
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}
