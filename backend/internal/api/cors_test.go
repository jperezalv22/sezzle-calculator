package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"calculator/internal/history"
)

const frontendOrigin = "http://localhost:5173"

func corsRequest(t *testing.T, handler http.Handler, method, origin string, preflight bool) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, "/api/v1/calculate",
		strings.NewReader(`{"operation":"add","operands":[1,2]}`))
	req.Header.Set("Content-Type", "application/json")
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	if preflight {
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		req.Header.Set("Access-Control-Request-Headers", "content-type")
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func TestCORSAllowsTheConfiguredOrigin(t *testing.T) {
	handler := NewServer(history.New(1), frontendOrigin)
	rec := corsRequest(t, handler, http.MethodPost, frontendOrigin, false)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != frontendOrigin {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, frontendOrigin)
	}
	if got := rec.Header().Get("Vary"); got != "Origin" {
		t.Errorf("Vary = %q, want Origin", got)
	}
}

func TestCORSIgnoresOtherOrigins(t *testing.T) {
	handler := NewServer(history.New(1), frontendOrigin)

	for _, origin := range []string{
		"https://evil.example",
		"http://localhost:5174",
		frontendOrigin + ".evil.example", // a prefix match would let this through
	} {
		rec := corsRequest(t, handler, http.MethodPost, origin, false)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("origin %q got Access-Control-Allow-Origin %q, want none", origin, got)
		}
	}
}

func TestCORSPreflight(t *testing.T) {
	handler := NewServer(history.New(1), frontendOrigin)

	t.Run("allowed origin", func(t *testing.T) {
		rec := corsRequest(t, handler, http.MethodOptions, frontendOrigin, true)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, "POST") {
			t.Errorf("Access-Control-Allow-Methods = %q, want it to include POST", got)
		}
		if got := rec.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(got, "Content-Type") {
			t.Errorf("Access-Control-Allow-Headers = %q, want it to include Content-Type", got)
		}
	})

	t.Run("other origin", func(t *testing.T) {
		rec := corsRequest(t, handler, http.MethodOptions, "https://evil.example", true)
		if rec.Code != http.StatusForbidden {
			t.Errorf("status = %d, want 403", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Access-Control-Allow-Origin = %q, want none", got)
		}
	})
}

func TestCORSDisabledWhenOriginUnset(t *testing.T) {
	handler := NewServer(history.New(1), "")
	rec := corsRequest(t, handler, http.MethodPost, frontendOrigin, false)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("Access-Control-Allow-Origin = %q, want none with CORS disabled", got)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want the request itself to still succeed", rec.Code)
	}
}
