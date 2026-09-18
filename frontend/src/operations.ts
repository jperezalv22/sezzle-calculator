import type { Operation } from './api/client'
import { formatNumber } from './format'

interface OperationInfo {
  /** Also the key's accessible label. */
  label: string
  symbol: string
  /** One per operand; the length is the arity. */
  operandLabels: readonly [string] | readonly [string, string]
  /** E.g. "2 + 3" or "10% of 200". */
  describe: (operands: number[]) => string
}

// A Record so a new Operation doesn't compile until it's described here.
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
    // The backend computes "b percent of a".
    label: 'Percentage',
    symbol: '%',
    operandLabels: ['Of', 'Percent'],
    describe: ([a, b]) => `${formatNumber(b)}% of ${formatNumber(a)}`,
  },
}

export const OPERATION_ORDER: readonly Operation[] = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'power',
  'sqrt',
  'percentage',
]
