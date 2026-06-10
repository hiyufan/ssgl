package security

import (
	"time"

	"github.com/gin-gonic/gin"
)

// SecurityHeaders returns a middleware that adds security headers to responses.
//
// NOTE: this backend serves only JSON API responses, so the CSP below is the
// strict policy appropriate for an API (resources should never be loaded from
// an API response). It does NOT protect the SPA against XSS — the frontend
// document must set its own CSP where its HTML is served (Vite dev server /
// reverse proxy / hosting), since that is where script execution happens.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")

		// Strict, API-appropriate CSP: forbid loading any resource and disallow
		// embedding this response in a frame.
		c.Header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")

		// Isolate this origin's browsing context and restrict legacy policies.
		c.Header("Cross-Origin-Opener-Policy", "same-origin")
		c.Header("X-Permitted-Cross-Domain-Policies", "none")

		// Don't leak full URLs (which may contain ids) to other origins.
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Restrict powerful browser features.
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		// Strict Transport Security: enable in production at the TLS-terminating
		// proxy (not here) to avoid pinning HSTS on http://localhost during dev.
		// c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Don't advertise the server implementation.
		c.Header("Server", "")

		c.Next()
	}
}

// CORSSecure returns a secure CORS middleware
func CORSSecure(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, o := range allowedOrigins {
			if o == "*" || o == origin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID")
			c.Header("Access-Control-Expose-Headers", "Content-Length, X-Request-ID")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Max-Age", "86400")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// RequestID adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

func generateRequestID() string {
	// Simple request ID generation
	return time.Now().Format("20060102150405") + "-" + randomString(8)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
