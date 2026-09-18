package api

import "net/http"

// withCORS allows exactly allowedOrigin, never "*". Leave it empty when the
// frontend shares the API's origin, as it does behind nginx.
func withCORS(allowedOrigin string, next http.Handler) http.Handler {
	if allowedOrigin == "" {
		return next
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Keeps caches from serving one origin's response to another.
		w.Header().Add("Vary", "Origin")

		origin := r.Header.Get("Origin")
		allowed := origin == allowedOrigin
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		// Preflight, triggered by the JSON Content-Type. Answered here.
		if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
			if !allowed {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
