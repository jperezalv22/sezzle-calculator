package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"calculator/internal/calc"
	"calculator/internal/history"
)

// newTestServer returns a handler backed by a fresh history store, with CORS
// off, so tests never share state.
func newTestServer() http.Handler {
	return NewServer(history.New(3), "")
}

// send runs one request through the handler. httptest.NewRecorder avoids
// binding a real port: the handler is called directly, which keeps these tests
// fast and order independent.
func send(t *testing.T, handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func decodeError(t *testing.T, rec *httptest.ResponseRecorder) errorDetail {
	t.Helper()
	var body errorBody
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding error body: %v (body: %s)", err, rec.Body)
	}
	return body.Error
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want float64
	}{
		{"divide", `{"operation":"divide","operands":[10,4]}`, 2.5},
		{"add", `{"operation":"add","operands":[2,3]}`, 5},
		{"sqrt takes one operand", `{"operation":"sqrt","operands":[9]}`, 3},
		{"percentage is b percent of a", `{"operation":"percentage","operands":[200,10]}`, 20},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := send(t, newTestServer(), http.MethodPost, "/api/v1/calculate", tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200 (body: %s)", rec.Code, rec.Body)
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", got)
			}

			var resp calculateResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
				t.Fatalf("decoding response: %v (body: %s)", err, rec.Body)
			}
			if resp.Result != tt.want {
				t.Errorf("result = %v, want %v", resp.Result, tt.want)
			}
		})
	}
}

func TestCalculateErrorCodes(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		wantCode string
	}{
		// From calc.
		{"division by zero", `{"operation":"divide","operands":[1,0]}`, codeDivisionByZero},
		{"negative sqrt", `{"operation":"sqrt","operands":[-1]}`, codeNegativeSqrt},
		{"unknown operation", `{"operation":"modulo","operands":[5,2]}`, codeUnknownOperation},
		{"missing operation", `{"operands":[5,2]}`, codeUnknownOperation},
		{"too few operands", `{"operation":"add","operands":[1]}`, codeInvalidOperands},
		{"too many operands", `{"operation":"sqrt","operands":[4,9]}`, codeInvalidOperands},
		{"missing operands", `{"operation":"add"}`, codeInvalidOperands},
		{"result overflows", `{"operation":"power","operands":[10,400]}`, codeResultOutOfRange},

		// From decoding.
		{"operands are strings", `{"operation":"add","operands":["1","2"]}`, codeInvalidOperands},
		{"operands not a list", `{"operation":"add","operands":"1,2"}`, codeInvalidOperands},
		{"operand too large for float64", `{"operation":"add","operands":[1e400,1]}`, codeInvalidOperands},
		{"operation not a string", `{"operation":7,"operands":[1,2]}`, codeInvalidRequest},
		{"malformed JSON", `{"operation":`, codeInvalidRequest},
		{"empty body", ``, codeInvalidRequest},
		{"not an object", `[1,2]`, codeInvalidRequest},
		{"unknown field", `{"operation":"add","operands":[1,2],"extra":true}`, codeInvalidRequest},
		{"trailing data", `{"operation":"add","operands":[1,2]} {}`, codeInvalidRequest},
		{"body too large", `{"operation":"add","operands":[` + strings.Repeat("1,", maxBodyBytes) + `1]}`, codeInvalidRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := send(t, newTestServer(), http.MethodPost, "/api/v1/calculate", tt.body)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 (body: %s)", rec.Code, rec.Body)
			}
			got := decodeError(t, rec)
			if got.Code != tt.wantCode {
				t.Errorf("code = %q, want %q (message: %q)", got.Code, tt.wantCode, got.Message)
			}
			if got.Message == "" {
				t.Error("message is empty, want something a person can read")
			}
		})
	}
}

// TestErrorsDoNotLeakGoText checks the client never sees what Go's own error
// strings say: decoder messages name internal types and echo input back, and
// calc's wrapped errors are written for logs.
func TestErrorsDoNotLeakGoText(t *testing.T) {
	tests := []struct {
		body   string
		leaked string // text from the underlying Go error
	}{
		{`{"operation":"add","operands":[1,2],"secretField":1}`, "secretField"},
		{`{"operation":"add","operands":[1,2],"secretField":1}`, "json:"},
		{`{"operation":"add","operands":["x"]}`, "float64"},
		{`{"operation":"add","operands":[1]}`, "takes 2, got 1"},
		{`{"operation":"modulo","operands":[1,2]}`, `"modulo"`},
	}

	for _, tt := range tests {
		rec := send(t, newTestServer(), http.MethodPost, "/api/v1/calculate", tt.body)
		if strings.Contains(rec.Body.String(), tt.leaked) {
			t.Errorf("response to %s contains %q: %s", tt.body, tt.leaked, rec.Body)
		}
	}
}

// TestEveryCalcErrorHasACode guards the mapping table: if a sentinel is added to
// calc and not to calcErrors, this fails instead of the client getting a 500.
func TestEveryCalcErrorHasACode(t *testing.T) {
	sentinels := []error{
		calc.ErrUnknownOperation,
		calc.ErrOperandCount,
		calc.ErrDivideByZero,
		calc.ErrNegativeSquareRoot,
		calc.ErrNotFinite,
	}

	for _, sentinel := range sentinels {
		rec := httptest.NewRecorder()
		// Wrapped, the way calc returns some of them: the mapping must see
		// through it.
		writeCalcError(rec, errors.Join(errors.New("context"), sentinel))

		if rec.Code != http.StatusBadRequest {
			t.Errorf("%v: status = %d, want 400", sentinel, rec.Code)
		}
		if got := decodeError(t, rec).Code; got == codeInternal {
			t.Errorf("%v has no error code mapped", sentinel)
		}
	}
}

func TestUnmappedErrorIsInternalAndOpaque(t *testing.T) {
	rec := httptest.NewRecorder()
	writeCalcError(rec, errors.New("database password is hunter2"))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "hunter2") {
		t.Errorf("internal error text reached the client: %s", rec.Body)
	}
}

func TestWrongMethodIs405WithJSONAndAllow(t *testing.T) {
	tests := []struct {
		method, path, wantAllow string
	}{
		{http.MethodGet, "/api/v1/calculate", "POST"},
		{http.MethodPut, "/api/v1/calculate", "POST"},
		{http.MethodDelete, "/api/v1/calculate", "POST"},
		{http.MethodPost, "/healthz", "GET, HEAD"},
		{http.MethodPost, "/api/v1/history", "GET, HEAD"},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			rec := send(t, newTestServer(), tt.method, tt.path, "")

			if rec.Code != http.StatusMethodNotAllowed {
				t.Fatalf("status = %d, want 405", rec.Code)
			}
			if got := rec.Header().Get("Allow"); got != tt.wantAllow {
				t.Errorf("Allow = %q, want %q", got, tt.wantAllow)
			}
			if got := decodeError(t, rec).Code; got != codeMethodNotAllowed {
				t.Errorf("code = %q, want %q", got, codeMethodNotAllowed)
			}
		})
	}
}

func TestHealthz(t *testing.T) {
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		rec := send(t, newTestServer(), method, "/healthz", "")
		if rec.Code != http.StatusOK {
			t.Errorf("%s /healthz: status = %d, want 200", method, rec.Code)
		}
	}
}

func TestOldUnversionedPathIsGone(t *testing.T) {
	rec := send(t, newTestServer(), http.MethodPost, "/api/calculate", `{"operation":"add","operands":[1,2]}`)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

func TestHistoryRecordsOnlySuccesses(t *testing.T) {
	handler := newTestServer() // limit is 3

	for _, op := range []string{"add", "subtract", "multiply", "divide"} {
		body := `{"operation":"` + op + `","operands":[8,2]}`
		if rec := send(t, handler, http.MethodPost, "/api/v1/calculate", body); rec.Code != http.StatusOK {
			t.Fatalf("calculating %q: status %d (%s)", op, rec.Code, rec.Body)
		}
	}
	send(t, handler, http.MethodPost, "/api/v1/calculate", `{"operation":"divide","operands":[1,0]}`)

	var entries []history.Entry
	rec := send(t, handler, http.MethodGet, "/api/v1/history", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &entries); err != nil {
		t.Fatalf("decoding history: %v (body: %s)", err, rec.Body)
	}

	want := []string{"divide", "multiply", "subtract"}
	if len(entries) != len(want) {
		t.Fatalf("history has %d entries, want %d: %+v", len(entries), len(want), entries)
	}
	for i, op := range want {
		if entries[i].Operation != op {
			t.Errorf("entry %d is %q, want %q", i, entries[i].Operation, op)
		}
	}
}

func TestHistoryIsEmptyArrayNotNull(t *testing.T) {
	rec := send(t, newTestServer(), http.MethodGet, "/api/v1/history", "")
	if got := strings.TrimSpace(rec.Body.String()); got != "[]" {
		t.Errorf("body = %s, want []", got)
	}
}
