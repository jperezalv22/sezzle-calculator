import type { Operation } from './api/client'
import { formatNumber } from './format'

interface OperationInfo {
  /** The operation's name, used as the accessible label of its key. */
  label: string
  /** How the operation is drawn on its key and in the display. */
  symbol: string
  /** What each operand means, one label per input. Its length is the arity. */
  operandLabels: readonly [string] | readonly [string, string]
  /** How a finished calculation reads, e.g. "2 + 3" or "10% of 200". */
  describe: (operands: number[]) => string
}

/**
 * Everything the UI needs to know about each operation, in one place.
 *
 * Typed as Record<Operation, …> so that adding an operation to the union in
 * api.ts is a compile error until it is described here too.
 */
export const OPERATIONS: Record<Operation, OperationInfo> = {
  add: {
    label: 'Add',
    symbol: '+',
    operandLabels: ['First number', 'Second number'],
    describe: ([a, b]) => `${formatNumber(a)} + ${formatNumber(b)}`,
  },
  subtract: {
    label: 'Subtract',
    symbol: '−',
    operandLabels: ['From', 'Subtract'],
    describe: ([a, b]) => `${formatNumber(a)} − ${formatNumber(b)}`,
  },
  multiply: {
    label: 'Multiply',
    symbol: '×',
    operandLabels: ['First number', 'Second number'],
    describe: ([a, b]) => `${formatNumber(a)} × ${formatNumber(b)}`,
  },
  divide: {
    label: 'Divide',
    symbol: '÷',
    operandLabels: ['Dividend', 'Divisor'],
    describe: ([a, b]) => `${formatNumber(a)} ÷ ${formatNumber(b)}`,
  },
  power: {
    label: 'Power',
    symbol: '^',
    operandLabels: ['Base', 'Exponent'],
    describe: ([a, b]) => `${formatNumber(a)} ^ ${formatNumber(b)}`,
  },
  sqrt: {
    label: 'Square root',
    symbol: '√',
    operandLabels: ['Number'],
    describe: ([a]) => `√${formatNumber(a)}`,
  },
  percentage: {
    // The backend computes "b percent of a"; the labels say so, so nobody has
    // to guess which of the two common readings this is.
    label: 'Percentage',
    symbol: '%',
    operandLabels: ['Of', 'Percent'],
    describe: ([a, b]) => `${formatNumber(b)}% of ${formatNumber(a)}`,
  },
}

/** The order operations appear in the picker. */
export const OPERATION_ORDER: readonly Operation[] = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'power',
  'sqrt',
  'percentage',
]
