// Package calc implements the arithmetic operations the calculator offers.
//
// It deliberately knows nothing about HTTP, JSON or transport of any kind: it
// takes float64 values and returns float64 values or an error, so it can be
// tested and reused without a server involved.
package calc

import "math"

// Add returns a + b.
func Add(a, b float64) (float64, error) {
	return finite(a + b)
}

// Subtract returns a - b.
func Subtract(a, b float64) (float64, error) {
	return finite(a - b)
}

// Multiply returns a * b.
func Multiply(a, b float64) (float64, error) {
	return finite(a * b)
}

// Divide returns a / b, or ErrDivideByZero when b is zero.
func Divide(a, b float64) (float64, error) {
	// This catches negative zero too: in IEEE-754, -0.0 == 0.0 is true.
	if b == 0 {
		return 0, ErrDivideByZero
	}
	return finite(a / b)
}

// Power returns a raised to the power of b.
func Power(a, b float64) (float64, error) {
	return finite(math.Pow(a, b))
}

// Sqrt returns the square root of a, or ErrNegativeSquareRoot when a is
// negative.
func Sqrt(a float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return finite(math.Sqrt(a))
}

// Percentage returns b percent of a.
//
// That is the reading chosen for this operation: Percentage(200, 10) is 20,
// because 10 percent of 200 is 20. The other common reading — "a is what
// percent of b" — would be a/b*100 and is not what this does.
func Percentage(a, b float64) (float64, error) {
	return finite(a * b / 100)
}

// finite guards every result this package returns.
//
// IEEE-754 arithmetic does not fail: overflow becomes ±Inf and undefined
// results become NaN, and both then propagate silently through every later
// calculation. Turning them into an error here means a caller never receives
// one of those values believing it to be an answer.
func finite(value float64) (float64, error) {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, ErrNotFinite
	}
	return value, nil
}
