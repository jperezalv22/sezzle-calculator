package api

import (
	"errors"
	"log"
	"net/http"

	"calculator/internal/calc"
)

// Error codes are stable; messages may be reworded.
const (
	codeInvalidRequest   = "INVALID_REQUEST"
	codeUnknownOperation = "UNKNOWN_OPERATION"
	codeInvalidOperands  = "INVALID_OPERANDS"
	codeDivisionByZero   = "DIVISION_BY_ZERO"
	codeNegativeSqrt     = "NEGATIVE_SQRT"
	codeResultOutOfRange = "RESULT_OUT_OF_RANGE"
	codeMethodNotAllowed = "METHOD_NOT_ALLOWED"
	codeInternal         = "INTERNAL_ERROR"
)

// errorBody is the shape of every error response:
//
//	{"error": {"code": "DIVISION_BY_ZERO", "message": "Cannot divide by zero."}}
type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// calcErrors maps calc errors to client messages. err.Error() isn't sent
// because it's written for logs and may leak internals.
var calcErrors = []struct {
	target  error
	code    string
	message string
}{
	{calc.ErrUnknownOperation, codeUnknownOperation, "The operation is not supported."},
	{calc.ErrOperandCount, codeInvalidOperands, "Wrong number of operands for this operation."},
	{calc.ErrDivideByZero, codeDivisionByZero, "Cannot divide by zero."},
	{calc.ErrNegativeSquareRoot, codeNegativeSqrt, "Cannot take the square root of a negative number."},
	{calc.ErrNotFinite, codeResultOutOfRange, "The result is too large or is undefined."},
}

// writeCalcError sends a 400, since every calc error is the request's fault.
func writeCalcError(w http.ResponseWriter, err error) {
	for _, m := range calcErrors {
		if errors.Is(err, m.target) {
			writeError(w, http.StatusBadRequest, m.code, m.message)
			return
		}
	}

	// Unreachable today. A new calc error gets logged and a generic 500.
	log.Printf("unmapped calc error: %v", err)
	writeError(w, http.StatusInternalServerError, codeInternal, "Something went wrong.")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorBody{Error: errorDetail{Code: code, Message: message}})
}
