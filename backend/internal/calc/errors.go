package calc

import "errors"

// Errors returned by this package. Some come wrapped with detail; check them
// with errors.Is.
var (
	// ErrDivideByZero is returned when dividing by zero.
	ErrDivideByZero = errors.New("division by zero")

	// ErrNegativeSquareRoot is returned by Sqrt for a negative operand.
	ErrNegativeSquareRoot = errors.New("square root of a negative number")

	// ErrOperandCount is returned by Apply for the wrong number of operands.
	ErrOperandCount = errors.New("wrong number of operands")

	// ErrUnknownOperation is returned by Apply for an unsupported operation.
	ErrUnknownOperation = errors.New("unknown operation")

	// ErrNotFinite is returned when a result is NaN or ±Inf, e.g. an overflow
	// or a negative number raised to a fractional power.
	ErrNotFinite = errors.New("result is not a finite number")
)
