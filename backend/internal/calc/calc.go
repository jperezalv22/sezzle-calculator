// Package calc implements the calculator's operations. It knows nothing about
// HTTP or JSON.
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
	// Also catches -0, since -0.0 == 0.0.
	if b == 0 {
		return 0, ErrDivideByZero
	}
	return finite(a / b)
}

// Power returns a raised to the power of b.
func Power(a, b float64) (float64, error) {
	return finite(math.Pow(a, b))
}

// Sqrt returns the square root of a, or ErrNegativeSquareRoot when a < 0.
func Sqrt(a float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return finite(math.Sqrt(a))
}

// Percentage returns b percent of a: Percentage(200, 10) is 20. It does not
// compute "a is what percent of b".
func Percentage(a, b float64) (float64, error) {
	return finite(a * b / 100)
}

// finite turns NaN and ±Inf into an error. Float math doesn't fail on
// overflow, so without this a caller could get Inf back as an answer.
func finite(value float64) (float64, error) {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, ErrNotFinite
	}
	return value, nil
}
