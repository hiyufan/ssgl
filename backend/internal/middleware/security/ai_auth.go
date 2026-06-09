package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// AIAuthServiceConfig holds configuration for AI service authentication
type AIAuthServiceConfig struct {
	APIKey     string // Shared API key for AI service
	SigningKey string // HMAC signing key
	Expiry     time.Duration
}

// AIAuthMiddleware returns a middleware that validates AI service requests
func AIAuthMiddleware(config *AIAuthServiceConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check API Key
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			apiKey = c.Query("api_key")
		}

		if apiKey != config.APIKey {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid API key",
			})
			return
		}

		// Check timestamp (prevent replay attacks)
		timestamp := c.GetHeader("X-Timestamp")
		if timestamp != "" {
			ts, err := time.Parse(time.RFC3339, timestamp)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
					"error":   "invalid_timestamp",
					"message": "Invalid timestamp format",
				})
				return
			}

			if time.Since(ts) > config.Expiry {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error":   "request_expired",
					"message": "Request has expired",
				})
				return
			}
		}

		// Verify signature if present
		signature := c.GetHeader("X-Signature")
		if signature != "" && config.SigningKey != "" {
			expectedSig := generateSignature(config.SigningKey, c.Request.URL.Path, timestamp)
			if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error":   "invalid_signature",
					"message": "Invalid request signature",
				})
				return
			}
		}

		c.Next()
	}
}

// GenerateAIRequestSignature generates a signature for AI service requests
func GenerateAIRequestSignature(signingKey, path, timestamp string) string {
	return generateSignature(signingKey, path, timestamp)
}

func generateSignature(key, path, timestamp string) string {
	mac := hmac.New(sha256.New, []byte(key))
	mac.Write([]byte(path + timestamp))
	return hex.EncodeToString(mac.Sum(nil))
}

// AIRequestHeaders returns headers for AI service requests
func AIRequestHeaders(apiKey, signingKey, path string) map[string]string {
	timestamp := time.Now().Format(time.RFC3339)
	signature := generateSignature(signingKey, path, timestamp)

	return map[string]string{
		"X-API-Key":   apiKey,
		"X-Timestamp": timestamp,
		"X-Signature": signature,
		"Content-Type": "application/json",
	}
}
