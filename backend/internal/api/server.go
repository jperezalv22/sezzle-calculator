// Package api exposes the calculator over HTTP. It does no arithmetic itself:
// it decodes requests, calls calc, and translates calc's errors into codes.
package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"calculator/internal/calc"
	"calculator/internal/history"
)

// maxBodyBytes caps how much a calculate request may send. The body is a short
// JSON object, so this is generous.
const maxBodyBytes = 8 << 10 // 8 KiB

// Server wires the calculator and the history store to HTTP handlers.
type Server struct {
	history *history.Store
}

// NewServer returns a handler serving the calculator API. allowedOrigin is the
// one browser origin permitted to call it cross-origin; empty disables CORS.
//
// It returns http.Handler rather than *Server so callers depend on the
// behaviour (serving HTTP) instead of the type.
func NewServer(store *history.Store, allowedOrigin string) http.Handler {
	s := &Server{history: store}

	mux := http.NewServeMux()

	// Each route is registered twice. The method-qualified pattern is the real
	// handler; the bare one catches every other method. Since Go 1.22 the mux
	// picks the more specific pattern, and "POST /x" is more specific than "/x",
	// so the fallback only sees methods the route does not support. Left alone,
	// the mux answers those with a plain-text 405; this gives them the same JSON
	// error shape as everything else.
	mux.HandleFunc("POST /api/v1/calculate", s.handleCalculate)
	mux.HandleFunc("/api/v1/calculate", methodNotAllowed("POST"))

	mux.HandleFunc("GET /api/v1/history", s.handleHistory)
	mux.HandleFunc("/api/v1/history", methodNotAllowed("GET, HEAD"))

	// A GET pattern also matches HEAD, which is what many health checkers send.
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.HandleFunc("/healthz", methodNotAllowed("GET, HEAD"))

	return withCORS(allowedOrigin, mux)
}

type calculateRequest struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

func (s *Server) handleCalculate(w http.ResponseWriter, r *http.Request) {
	req, problem := decodeCalculateRequest(w, r)
	if problem != nil {
		writeError(w, http.StatusBadRequest, problem.Code, problem.Message)
		return
	}

	result, err := calc.Apply(calc.Operation(req.Operation), req.Operands...)
	if err != nil {
		writeCalcError(w, err)
		return
	}

	s.history.Add(req.Operation, req.Operands, result)
	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

// decodeCalculateRequest reads and validates the request body. It returns a
// client-facing problem rather than an error, because nothing the decoder says
// is fit to send to a client as-is.
func decodeCalculateRequest(w http.ResponseWriter, r *http.Request) (calculateRequest, *errorDetail) {
	// MaxBytesReader caps the read itself, so an oversized body is rejected
	// without being buffered into memory first.
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	decoder.DisallowUnknownFields()

	var req calculateRequest
	if err := decoder.Decode(&req); err != nil {
		return req, decodeProblem(err)
	}

	// Decode stops after the first JSON value, so a body with trailing garbage
	// would pass without this. A second Decode must hit the end of the body.
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return req, &errorDetail{codeInvalidRequest, "Request body must contain a single JSON object."}
	}

	return req, nil
}

// decodeProblem turns a JSON decoding failure into something safe to show.
func decodeProblem(err error) *errorDetail {
	var tooLarge *http.MaxBytesError
	var typeErr *json.UnmarshalTypeError

	switch {
	case errors.As(err, &tooLarge):
		return &errorDetail{codeInvalidRequest,
			fmt.Sprintf("Request body must not exceed %d bytes.", tooLarge.Limit)}

	case errors.As(err, &typeErr) && strings.HasPrefix(typeErr.Field, "operands"):
		// Well-formed JSON with the wrong type in operands (strings, or a number
		// too large for float64) is an operand problem, not a malformed request.
		return &errorDetail{codeInvalidOperands, "Operands must be a list of numbers."}

	default:
		return &errorDetail{codeInvalidRequest,
			`Request body must be a JSON object like {"operation": "add", "operands": [1, 2]}.`}
	}
}

func (s *Server) handleHistory(w http.ResponseWriter, r *http.Request) {
	entries := s.history.Entries()
	if entries == nil {
		// Encode a nil slice as [] rather than null, so the client never has to
		// handle two spellings of "empty".
		entries = []history.Entry{}
	}
	writeJSON(w, http.StatusOK, entries)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// methodNotAllowed answers any method a route does not support. The HTTP spec
// requires an Allow header on a 405, and it tells the client what would work.
func methodNotAllowed(allow string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Allow", allow)
		writeError(w, http.StatusMethodNotAllowed, codeMethodNotAllowed,
			fmt.Sprintf("Method %s is not allowed here. Allowed: %s.", r.Method, allow))
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	// A write failure here means the client went away mid-response; the status
	// line is already sent, so there is nothing to do but record it.
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("writing response: %v", err)
	}
}
