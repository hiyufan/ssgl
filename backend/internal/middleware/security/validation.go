package security

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

// SQLInjectionPatterns defines patterns that might indicate SQL injection
var SQLInjectionPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(union\s+select)`),
	regexp.MustCompile(`(?i)(select\s+.*\s+from)`),
	regexp.MustCompile(`(?i)(insert\s+into)`),
	regexp.MustCompile(`(?i)(delete\s+from)`),
	regexp.MustCompile(`(?i)(drop\s+table)`),
	regexp.MustCompile(`(?i)(update\s+.*\s+set)`),
	regexp.MustCompile(`(?i)(\b(or|and)\b\s+\d+\s*=\s*\d+)`),
	regexp.MustCompile(`(?i)(--\s*$)`),
	regexp.MustCompile(`(?i)(/\*.*\*/)`),
	regexp.MustCompile(`(?i)(;\s*(drop|alter|create|truncate))`),
}

// XSSPatterns defines patterns that might indicate XSS attacks
var XSSPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(<script[^>]*>)`),
	regexp.MustCompile(`(?i)(javascript:)`),
	regexp.MustCompile(`(?i)(on\w+\s*=)`),
	regexp.MustCompile(`(?i)(<iframe[^>]*>)`),
	regexp.MustCompile(`(?i)(<object[^>]*>)`),
	regexp.MustCompile(`(?i)(<embed[^>]*>)`),
	regexp.MustCompile(`(?i)(<form[^>]*>)`),
}

// InputValidation returns a middleware that validates request inputs
func InputValidation() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate query parameters
		for _, values := range c.Request.URL.Query() {
			for _, value := range values {
				if containsSQLInjection(value) || containsXSS(value) {
					c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
						"error":   "invalid_input",
						"message": "Request contains potentially malicious content",
					})
					return
				}
			}
		}

		// Validate path parameters
		for _, param := range c.Params {
			if containsSQLInjection(param.Value) || containsXSS(param.Value) {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
					"error":   "invalid_input",
					"message": "Request contains potentially malicious content",
				})
				return
			}
		}

		c.Next()
	}
}

// containsSQLInjection checks if a string contains SQL injection patterns
func containsSQLInjection(s string) bool {
	s = strings.ToLower(s)
	for _, pattern := range SQLInjectionPatterns {
		if pattern.MatchString(s) {
			return true
		}
	}
	return false
}

// containsXSS checks if a string contains XSS patterns
func containsXSS(s string) bool {
	s = strings.ToLower(s)
	for _, pattern := range XSSPatterns {
		if pattern.MatchString(s) {
			return true
		}
	}
	return false
}

// SanitizeInput removes potentially dangerous characters from input
func SanitizeInput(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")

	// Trim whitespace
	input = strings.TrimSpace(input)

	return input
}

// SanitizeHTML escapes HTML special characters to prevent stored XSS.
// Use this on user-supplied strings before persisting to the database.
func SanitizeHTML(input string) string {
	input = strings.ReplaceAll(input, "&", "&amp;")
	input = strings.ReplaceAll(input, "<", "&lt;")
	input = strings.ReplaceAll(input, ">", "&gt;")
	input = strings.ReplaceAll(input, "\"", "&quot;")
	input = strings.ReplaceAll(input, "'", "&#39;")
	return input
}

// BodySanitizer returns middleware that walks every string value in a JSON
// request body and escapes HTML entities. This prevents stored XSS when
// user input is later rendered in an HTML context.
func BodySanitizer() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only process requests with a JSON body
		ct := c.GetHeader("Content-Type")
		if !strings.Contains(ct, "application/json") {
			c.Next()
			return
		}

		// Read body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil || len(body) == 0 {
			c.Next()
			return
		}
		c.Request.Body.Close()

		// Parse and sanitize
		var data interface{}
		if err := json.Unmarshal(body, &data); err != nil {
			// Not valid JSON — pass through and let handler deal with it
			c.Request.Body = io.NopCloser(bytes.NewReader(body))
			c.Next()
			return
		}

		sanitized := sanitizeValue(data)
		newBody, _ := json.Marshal(sanitized)
		c.Request.Body = io.NopCloser(bytes.NewReader(newBody))
		c.Request.ContentLength = int64(len(newBody))
		c.Header("X-Content-Sanitized", "true")
		c.Next()
	}
}

// sanitizeValue recursively walks a JSON-decoded value and sanitizes all strings.
func sanitizeValue(v interface{}) interface{} {
	switch val := v.(type) {
	case string:
		// Only sanitize if the string contains HTML-like content
		if containsXSS(val) {
			return SanitizeHTML(val)
		}
		return SanitizeInput(val)
	case map[string]interface{}:
		out := make(map[string]interface{}, len(val))
		for k, item := range val {
			out[k] = sanitizeValue(item)
		}
		return out
	case []interface{}:
		out := make([]interface{}, len(val))
		for i, item := range val {
			out[i] = sanitizeValue(item)
		}
		return out
	default:
		return v
	}
}

// isJSONBody checks if the request has a JSON content type.
func isJSONBody(c *gin.Context) bool {
	ct := c.GetHeader("Content-Type")
	return strings.HasPrefix(ct, "application/json")
}

// ReadBodyString reads the request body as a string (useful for logging).
func ReadBodyString(c *gin.Context) string {
	if c.Request.Body == nil {
		return ""
	}
	body, _ := io.ReadAll(c.Request.Body)
	c.Request.Body = io.NopCloser(bytes.NewReader(body))
	return string(body)
}

// ValidateBodyField validates a specific field in the request body.
// Returns an error if the field contains malicious content.
func ValidateBodyField(body map[string]interface{}, field string) error {
	if val, ok := body[field]; ok {
		if s, ok := val.(string); ok {
			if containsXSS(s) {
				return fmt.Errorf("field '%s' contains potentially malicious content", field)
			}
		}
	}
	return nil
}

// ValidateEmail validates email format
func ValidateEmail(email string) bool {
	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	re := regexp.MustCompile(pattern)
	return re.MatchString(email)
}

// ValidateUsername validates username format (alphanumeric, 3-20 chars)
func ValidateUsername(username string) bool {
	pattern := `^[a-zA-Z0-9_]{3,20}$`
	re := regexp.MustCompile(pattern)
	return re.MatchString(username)
}

// ValidatePassword validates password strength
func ValidatePassword(password string) (bool, string) {
	if len(password) < 8 {
		return false, "Password must be at least 8 characters long"
	}
	if len(password) > 128 {
		return false, "Password must be less than 128 characters"
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper || !hasLower || !hasDigit {
		return false, "Password must contain at least one uppercase letter, one lowercase letter, and one digit"
	}

	return true, ""
}
