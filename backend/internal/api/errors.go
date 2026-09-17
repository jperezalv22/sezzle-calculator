package api

import (
	"errors"
	"log"
	"net/http"

	"calculator/internal/calc"
)

// Error codes the API returns. They are the stable, machine-readable part of an
// error; messages are for people and may be reworded.
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

// calcErrors maps each calc sentinel to what the client sees. The messages are
// written here rather than taken from err.Error(): a Go error string is written
// for whoever reads the logs, can change with any refactor, and may carry
// internal detail. This way the client's text is a deliberate part of the API.
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

// writeCalcError translates an error from calc into a response. Every calc
// error describes a problem with the request, so all of them are 400s.
func writeCalcError(w http.ResponseWriter, err error) {
	for _, m := range calcErrors {
		if errors.Is(err, m.target) {
			writeError(w, http.StatusBadRequest, m.code, m.message)
			return
		}
	}

	// calc returns nothing else today. If that changes, the new error is logged
	// with its full text and the client gets a generic 500: never the raw error,
	// and never a success.
	log.Printf("unmapped calc error: %v", err)
	writeError(w, http.StatusInternalServerError, codeInternal, "Something went wrong.")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorBody{Error: errorDetail{Code: code, Message: message}})
}
