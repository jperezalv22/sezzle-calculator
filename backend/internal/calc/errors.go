package calc

import "errors"

// The errors this package returns. They are package-level variables rather than
// strings so callers can identify a failure with errors.Is:
//
//	if errors.Is(err, calc.ErrDivideByZero) { ... }
//
// Some are returned wrapped with extra detail (which operation, how many
// operands). Wrapping is done with %w, which is what keeps errors.Is working
// through the added context.
var (
	// ErrDivideByZero is returned when a division has a zero divisor.
	ErrDivideByZero = errors.New("division by zero")

	// ErrNegativeSquareRoot is returned by Sqrt for a negative operand. The
	// result would be imaginary, which float64 has no way to represent.
	ErrNegativeSquareRoot = errors.New("square root of a negative number")

	// ErrOperandCount is returned by Apply when an operation is given the wrong
	// number of operands.
	ErrOperandCount = errors.New("wrong number of operands")

	// ErrUnknownOperation is returned by Apply for an operation it does not
	// implement.
	ErrUnknownOperation = errors.New("unknown operation")

	// ErrNotFinite is returned when a calculation produces NaN or ±Inf: an
	// overflow, or something undefined like the square root taken of a negative
	// via a fractional power.
	ErrNotFinite = errors.New("result is not a finite number")
)
