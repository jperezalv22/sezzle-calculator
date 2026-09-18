package calc

import "fmt"

// Operation names a calculation.
type Operation string

// Supported operations. The Op prefix avoids clashing with the functions.
const (
	OpAdd        Operation = "add"
	OpSubtract   Operation = "subtract"
	OpMultiply   Operation = "multiply"
	OpDivide     Operation = "divide"
	OpPower      Operation = "power"
	OpSqrt       Operation = "sqrt"
	OpPercentage Operation = "percentage"
)

// Adding an operation is one entry in the table that matches its arity.
var (
	unaryOps = map[Operation]func(a float64) (float64, error){
		OpSqrt: Sqrt,
	}

	binaryOps = map[Operation]func(a, b float64) (float64, error){
		OpAdd:        Add,
		OpSubtract:   Subtract,
		OpMultiply:   Multiply,
		OpDivide:     Divide,
		OpPower:      Power,
		OpPercentage: Percentage,
	}
)

// Apply runs op over operands. Sqrt takes one operand, the rest take two.
// Errors wrap ErrOperandCount or ErrUnknownOperation.
func Apply(op Operation, operands ...float64) (float64, error) {
	if fn, ok := unaryOps[op]; ok {
		if len(operands) != 1 {
			return 0, operandCountError(op, 1, len(operands))
		}
		return fn(operands[0])
	}

	if fn, ok := binaryOps[op]; ok {
		if len(operands) != 2 {
			return 0, operandCountError(op, 2, len(operands))
		}
		return fn(operands[0], operands[1])
	}

	return 0, fmt.Errorf("%w: %q", ErrUnknownOperation, op)
}

func operandCountError(op Operation, want, got int) error {
	return fmt.Errorf("%w: %s takes %d, got %d", ErrOperandCount, op, want, got)
}
