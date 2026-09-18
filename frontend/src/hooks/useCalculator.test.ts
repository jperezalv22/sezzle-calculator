import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalculationError, calculate } from '../api/client'
import type { KeyCommand } from './keyboard'
import { useCalculator } from './useCalculator'

// Only calculate is mocked; the hook checks error classes with instanceof.
vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  calculate: vi.fn(),
}))
const calculateMock = vi.mocked(calculate)

beforeEach(() => {
  calculateMock.mockReset()
})

/** "12.5+3" becomes six commands; r is square root. */
function press(result: { current: ReturnType<typeof useCalculator> }, keys: string) {
  const operations: Record<string, KeyCommand> = {
    '+': { type: 'operation', operation: 'add' },
    '-': { type: 'operation', operation: 'subtract' },
    '*': { type: 'operation', operation: 'multiply' },
    '/': { type: 'operation', operation: 'divide' },
    r: { type: 'operation', operation: 'sqrt' },
    '=': { type: 'equals' },
    C: { type: 'clear' },
  }
  for (const key of keys) {
    const command: KeyCommand =
      key === '.'
        ? { type: 'decimal' }
        : (operations[key] ?? { type: 'digit', digit: key as '0' })
    act(() => result.current.run(command))
  }
}

describe('useCalculator', () => {
  it('builds a number from digits', () => {
    const { result } = renderHook(() => useCalculator())

    press(result, '123')

    expect(result.current.display).toBe('123')
  })

  it('replaces a leading zero instead of keeping it', () => {
    const { result } = renderHook(() => useCalculator())

    press(result, '07')

    expect(result.current.display).toBe('7')
  })

  it('ignores a second decimal point in the same number', () => {
    const { result } = renderHook(() => useCalculator())

    press(result, '1.5.2')

    expect(result.current.display).toBe('1.52')
  })

  it('allows a decimal point in each operand', async () => {
    calculateMock.mockResolvedValue(4)
    const { result } = renderHook(() => useCalculator())

    press(result, '1.5+2.5=')

    await waitFor(() => expect(calculateMock).toHaveBeenCalledWith('add', [1.5, 2.5], expect.any(AbortSignal)))
  })

  it('switches operation when a different one is chosen before the second number', async () => {
    calculateMock.mockResolvedValue(27)
    const { result } = renderHook(() => useCalculator())

    press(result, '9+*')
    expect(result.current.operation).toBe('multiply')
    expect(result.current.expression).toBe('9 ×')

    press(result, '3=')

    await waitFor(() => expect(result.current.display).toBe('27'))
    expect(calculateMock).toHaveBeenCalledWith('multiply', [9, 3], expect.any(AbortSignal))
  })

  it('takes a square root with the number typed after it: √ 2.25 =', async () => {
    calculateMock.mockResolvedValue(1.5)
    const { result } = renderHook(() => useCalculator())

    press(result, 'r2.25')
    expect(result.current.expression).toBe('√')
    expect(result.current.display).toBe('2.25')

    press(result, '=')

    await waitFor(() => expect(result.current.display).toBe('1.5'))
    expect(calculateMock).toHaveBeenCalledWith('sqrt', [2.25], expect.any(AbortSignal))
  })

  it('takes a square root with the number typed before it: 9 √ =', async () => {
    calculateMock.mockResolvedValue(3)
    const { result } = renderHook(() => useCalculator())

    press(result, '9r')
    expect(result.current.expression).toBe('√9')

    press(result, '=')

    await waitFor(() => expect(result.current.display).toBe('3'))
    expect(calculateMock).toHaveBeenCalledWith('sqrt', [9], expect.any(AbortSignal))
  })

  it('ignores digits and a decimal point after 9 √, since the number is already taken', async () => {
    calculateMock.mockResolvedValue(3)
    const { result } = renderHook(() => useCalculator())

    press(result, '9r5.')
    expect(result.current.display).toBe('9')

    press(result, '=')

    await waitFor(() => expect(calculateMock).toHaveBeenCalledWith('sqrt', [9], expect.any(AbortSignal)))
  })

  it('takes the square root of the number typed after a finished calculation', async () => {
    calculateMock.mockResolvedValueOnce(5).mockResolvedValueOnce(3)
    const { result } = renderHook(() => useCalculator())

    press(result, '2+3=')
    await waitFor(() => expect(result.current.display).toBe('5'))

    press(result, 'r9')
    expect(result.current.expression).toBe('√')
    expect(result.current.display).toBe('9')

    press(result, '=')

    await waitFor(() => expect(result.current.display).toBe('3'))
    expect(calculateMock).toHaveBeenLastCalledWith('sqrt', [9], expect.any(AbortSignal))
  })

  it('takes the square root of the last result when = follows √ directly', async () => {
    calculateMock.mockResolvedValueOnce(9).mockResolvedValueOnce(3)
    const { result } = renderHook(() => useCalculator())

    press(result, '4+5=')
    await waitFor(() => expect(result.current.display).toBe('9'))

    press(result, 'r=')

    await waitFor(() => expect(result.current.display).toBe('3'))
    expect(calculateMock).toHaveBeenLastCalledWith('sqrt', [9], expect.any(AbortSignal))
  })

  it('does not start a two-number operation with nothing typed', () => {
    const { result } = renderHook(() => useCalculator())

    press(result, '+')

    expect(result.current.operation).toBeNull()
  })

  it('clears the whole entry', () => {
    const { result } = renderHook(() => useCalculator())

    press(result, '12+3C')

    expect(result.current.display).toBe('0')
    expect(result.current.expression).toBe('')
    expect(result.current.operation).toBeNull()
  })

  it('shows the API error message and clears it on the next key', async () => {
    calculateMock.mockRejectedValue(new CalculationError('DIVISION_BY_ZERO', 'Cannot divide by zero.'))
    const { result } = renderHook(() => useCalculator())

    press(result, '8/0=')
    await waitFor(() => expect(result.current.error).toBe('Cannot divide by zero.'))

    press(result, '5')

    expect(result.current.error).toBeNull()
    expect(result.current.display).toBe('5')
  })

  it('does not call the API until the entry is complete', () => {
    const { result } = renderHook(() => useCalculator())

    press(result, '9+=')

    expect(calculateMock).not.toHaveBeenCalled()
    expect(result.current.canCalculate).toBe(false)
  })
})
