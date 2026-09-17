package calc

import "fmt"

// Operation names a calculation. It is a defined string type rather than a
// plain string so that a caller cannot pass an arbitrary value without it being
// visible at the call site.
type Operation string

// The supported operations. These are prefixed with Op because the bare names
// belong to the functions above: Add is the function, OpAdd selects it.
const (
	OpAdd        Operation = "add"
	OpSubtract   Operation = "subtract"
	OpMultiply   Operation = "multiply"
	OpDivide     Operation = "divide"
	OpPower      Operation = "power"
	OpSqrt       Operation = "sqrt"
	OpPercentage Operation = "percentage"
)

// unaryOps and binaryOps record which operations exist and how many operands
// each takes. Keeping them in these two tables means adding an operation is one
// entry rather than a new branch in Apply, and it keeps the arity in one place
// instead of spread across a switch.
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

// Apply runs op over operands.
//
// Every operation takes two operands except sqrt, which takes one. Supplying
// the wrong number returns ErrOperandCount, and an operation that does not
// exist returns ErrUnknownOperation; both are wrapped with detail about what
// was actually asked for.
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
	// %w wraps the sentinel so errors.Is(err, ErrOperandCount) still matches,
	// while the message carries the detail a caller wants to show a user.
	return fmt.Errorf("%w: %s takes %d, got %d", ErrOperandCount, op, want, got)
}
