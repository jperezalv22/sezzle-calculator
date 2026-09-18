// Package api serves the calculator over HTTP. The arithmetic lives in calc.
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

// maxBodyBytes is generous for a short JSON object.
const maxBodyBytes = 8 << 10 // 8 KiB

// Server holds the handlers' shared state.
type Server struct {
	history *history.Store
}

// NewServer returns the API handler. allowedOrigin is the one origin allowed
// cross-origin; empty disables CORS.
func NewServer(store *history.Store, allowedOrigin string) http.Handler {
	s := &Server{history: store}

	mux := http.NewServeMux()

	// The bare pattern catches unsupported methods, since the mux prefers
	// "POST /x" over "/x". Otherwise the mux sends a plain-text 405, not JSON.
	mux.HandleFunc("POST /api/v1/calculate", s.handleCalculate)
	mux.HandleFunc("/api/v1/calculate", methodNotAllowed("POST"))

	mux.HandleFunc("GET /api/v1/history", s.handleHistory)
	mux.HandleFunc("/api/v1/history", methodNotAllowed("GET, HEAD"))

	// GET also matches HEAD, which many health checkers send.
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

// decodeCalculateRequest returns a client-safe problem instead of the decoder's
// error, which isn't fit to show.
func decodeCalculateRequest(w http.ResponseWriter, r *http.Request) (calculateRequest, *errorDetail) {
	// Rejects oversized bodies without buffering them first.
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	decoder.DisallowUnknownFields()

	var req calculateRequest
	if err := decoder.Decode(&req); err != nil {
		return req, decodeProblem(err)
	}

	// Decode stops after the first value, so reject anything trailing it.
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return req, &errorDetail{codeInvalidRequest, "Request body must contain a single JSON object."}
	}

	return req, nil
}

func decodeProblem(err error) *errorDetail {
	var tooLarge *http.MaxBytesError
	var typeErr *json.UnmarshalTypeError

	switch {
	case errors.As(err, &tooLarge):
		return &errorDetail{codeInvalidRequest,
			fmt.Sprintf("Request body must not exceed %d bytes.", tooLarge.Limit)}

	case errors.As(err, &typeErr) && strings.HasPrefix(typeErr.Field, "operands"):
		// Strings, or numbers too big for float64, in operands.
		return &errorDetail{codeInvalidOperands, "Operands must be a list of numbers."}

	default:
		return &errorDetail{codeInvalidRequest,
			`Request body must be a JSON object like {"operation": "add", "operands": [1, 2]}.`}
	}
}

func (s *Server) handleHistory(w http.ResponseWriter, r *http.Request) {
	entries := s.history.Entries()
	if entries == nil {
		// Send [] instead of null.
		entries = []history.Entry{}
	}
	writeJSON(w, http.StatusOK, entries)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// methodNotAllowed sends a JSON 405 with the Allow header the spec requires.
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

	// The status is already sent, so a failure here can only be logged.
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("writing response: %v", err)
	}
}
