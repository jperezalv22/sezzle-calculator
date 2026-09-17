package calc

import (
	"errors"
	"math"
	"testing"
)

// closeEnough compares float64 results with a tolerance rather than ==,
// because binary floating point rarely lands on the exact decimal you expect.
func closeEnough(got, want float64) bool {
	return math.Abs(got-want) < 1e-9
}

func TestOperations(t *testing.T) {
	tests := []struct {
		name string
		got  func() (float64, error)
		want float64
	}{
		{"add", func() (float64, error) { return Add(2, 3) }, 5},
		{"add negative", func() (float64, error) { return Add(2, -5) }, -3},
		{"subtract", func() (float64, error) { return Subtract(10, 4) }, 6},
		{"subtract into negative", func() (float64, error) { return Subtract(4, 10) }, -6},
		{"multiply", func() (float64, error) { return Multiply(6, 7) }, 42},
		{"multiply by zero", func() (float64, error) { return Multiply(6, 0) }, 0},
		{"divide", func() (float64, error) { return Divide(9, 2) }, 4.5},
		{"divide negative", func() (float64, error) { return Divide(-9, 2) }, -4.5},
		{"power", func() (float64, error) { return Power(2, 10) }, 1024},
		{"power of zero exponent", func() (float64, error) { return Power(7, 0) }, 1},
		{"power fractional exponent", func() (float64, error) { return Power(9, 0.5) }, 3},
		{"power negative exponent", func() (float64, error) { return Power(2, -2) }, 0.25},
		{"sqrt", func() (float64, error) { return Sqrt(9) }, 3},
		{"sqrt of zero", func() (float64, error) { return Sqrt(0) }, 0},
		{"sqrt non-square", func() (float64, error) { return Sqrt(2) }, 1.4142135624},
		{"percentage", func() (float64, error) { return Percentage(200, 10) }, 20},
		{"percentage over 100", func() (float64, error) { return Percentage(50, 150) }, 75},
		{"percentage of zero", func() (float64, error) { return Percentage(0, 10) }, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.got()
			if err != nil {
				t.Fatalf("returned error: %v", err)
			}
			if !closeEnough(got, tt.want) {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

// TestPercentageIsBPercentOfA pins down the reading of percentage, since the
// operation has two plausible meanings and the other one is a silent wrong
// answer rather than a failure.
func TestPercentageIsBPercentOfA(t *testing.T) {
	got, err := Percentage(200, 10)
	if err != nil {
		t.Fatalf("returned error: %v", err)
	}
	if !closeEnough(got, 20) {
		t.Errorf("Percentage(200, 10) = %v, want 20 (10 percent of 200); "+
			"got 5 would mean it computes a as a percent of b", got)
	}
}

func TestDivideByZero(t *testing.T) {
	// -0.0 is a distinct float64 value that compares equal to 0, so it must be
	// rejected as a divisor too.
	for _, divisor := range []float64{0, math.Copysign(0, -1)} {
		if _, err := Divide(1, divisor); !errors.Is(err, ErrDivideByZero) {
			t.Errorf("Divide(1, %v) returned %v, want ErrDivideByZero", divisor, err)
		}
	}
}

func TestSqrtOfNegative(t *testing.T) {
	for _, operand := range []float64{-1, -0.5, -1e9} {
		if _, err := Sqrt(operand); !errors.Is(err, ErrNegativeSquareRoot) {
			t.Errorf("Sqrt(%v) returned %v, want ErrNegativeSquareRoot", operand, err)
		}
	}
}

func TestNonFiniteResults(t *testing.T) {
	tests := []struct {
		name string
		got  func() (float64, error)
	}{
		{"addition overflows", func() (float64, error) { return Add(math.MaxFloat64, math.MaxFloat64) }},
		{"multiplication overflows", func() (float64, error) { return Multiply(math.MaxFloat64, 10) }},
		{"zero to a negative power is infinite", func() (float64, error) { return Power(0, -1) }},
		{"power overflows", func() (float64, error) { return Power(10, 400) }},
		{"fractional power of a negative is undefined", func() (float64, error) { return Power(-8, 1.0/3.0) }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.got()
			if !errors.Is(err, ErrNotFinite) {
				t.Fatalf("got (%v, %v), want ErrNotFinite", got, err)
			}
			if got != 0 {
				t.Errorf("returned %v alongside the error, want the zero value", got)
			}
		})
	}
}

func TestApplyDispatchesToEachOperation(t *testing.T) {
	tests := []struct {
		op       Operation
		operands []float64
		want     float64
	}{
		{OpAdd, []float64{2, 3}, 5},
		{OpSubtract, []float64{10, 4}, 6},
		{OpMultiply, []float64{6, 7}, 42},
		{OpDivide, []float64{9, 2}, 4.5},
		{OpPower, []float64{2, 10}, 1024},
		{OpSqrt, []float64{9}, 3},
		{OpPercentage, []float64{200, 10}, 20},
	}

	for _, tt := range tests {
		t.Run(string(tt.op), func(t *testing.T) {
			got, err := Apply(tt.op, tt.operands...)
			if err != nil {
				t.Fatalf("Apply(%q, %v) returned error: %v", tt.op, tt.operands, err)
			}
			if !closeEnough(got, tt.want) {
				t.Errorf("Apply(%q, %v) = %v, want %v", tt.op, tt.operands, got, tt.want)
			}
		})
	}
}

func TestApplyOperandCount(t *testing.T) {
	tests := []struct {
		name     string
		op       Operation
		operands []float64
	}{
		{"binary with none", OpAdd, nil},
		{"binary with one", OpAdd, []float64{1}},
		{"binary with three", OpMultiply, []float64{1, 2, 3}},
		{"unary with none", OpSqrt, nil},
		{"unary with two", OpSqrt, []float64{4, 9}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Apply(tt.op, tt.operands...)
			if !errors.Is(err, ErrOperandCount) {
				t.Fatalf("Apply(%q, %v) returned %v, want ErrOperandCount", tt.op, tt.operands, err)
			}
		})
	}
}

func TestApplyUnknownOperation(t *testing.T) {
	for _, op := range []Operation{"", "modulo", "Add", "ADD"} {
		if _, err := Apply(op, 1, 2); !errors.Is(err, ErrUnknownOperation) {
			t.Errorf("Apply(%q, 1, 2) returned %v, want ErrUnknownOperation", op, err)
		}
	}
}

// TestApplyPropagatesOperationErrors checks that Apply hands back the error the
// operation itself produced rather than flattening it into something generic.
func TestApplyPropagatesOperationErrors(t *testing.T) {
	if _, err := Apply(OpDivide, 1, 0); !errors.Is(err, ErrDivideByZero) {
		t.Errorf("Apply(divide, 1, 0) returned %v, want ErrDivideByZero", err)
	}
	if _, err := Apply(OpSqrt, -1); !errors.Is(err, ErrNegativeSquareRoot) {
		t.Errorf("Apply(sqrt, -1) returned %v, want ErrNegativeSquareRoot", err)
	}
}

// TestWrappedErrorsCarryDetail confirms the %w wrapping keeps both properties:
// errors.Is still matches, and the message still says what went wrong.
func TestWrappedErrorsCarryDetail(t *testing.T) {
	_, err := Apply(OpSqrt, 1, 2)
	if !errors.Is(err, ErrOperandCount) {
		t.Fatalf("got %v, want it to wrap ErrOperandCount", err)
	}
	if got := err.Error(); got == ErrOperandCount.Error() {
		t.Errorf("message is %q, want the wrapped detail about sqrt and the count", got)
	}
}
