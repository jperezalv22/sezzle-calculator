package api

import "net/http"

// withCORS lets the frontend at allowedOrigin call the API from the browser.
//
// An empty allowedOrigin disables CORS entirely, which is the right setting
// whenever the frontend and API share an origin: behind the Vite dev proxy or
// nginx, the browser never makes a cross-origin request at all.
//
// Only an exact match is allowed. There is deliberately no wildcard: "*" would
// let any site call the API from its visitors' browsers.
func withCORS(allowedOrigin string, next http.Handler) http.Handler {
	if allowedOrigin == "" {
		return next
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// The response differs by Origin, so caches must key on it; otherwise a
		// response cached for one origin can be served to another.
		w.Header().Add("Vary", "Origin")

		origin := r.Header.Get("Origin")
		allowed := origin == allowedOrigin
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		// A preflight is the browser asking permission before the real request,
		// sent because the POST carries a JSON Content-Type. It is answered here
		// and never reaches the routes.
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
