import { describe, expect, it } from 'vitest'
import { formatNumber } from './format'

describe('formatNumber', () => {
  it('hides float noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
  })

  it('shows integers in full', () => {
    expect(formatNumber(999999999999)).toBe('999999999999')
  })

  it('keeps the exponent instead of inventing zeros', () => {
    expect(formatNumber(1800900425460392.8)).toBe('1.80090042546e+15')
    expect(formatNumber(0.000000123)).toBe('1.23e-7')
  })
})
