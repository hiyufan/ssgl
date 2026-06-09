package security

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AuditLog represents an audit log entry
type AuditLog struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id"`
	Username  string    `json:"username" gorm:"size:50"`
	Action    string    `json:"action" gorm:"size:50;not null"`
	Resource  string    `json:"resource" gorm:"size:100"`
	Method    string    `json:"method" gorm:"size:10"`
	Path      string    `json:"path" gorm:"size:500"`
	IP        string    `json:"ip" gorm:"size:50"`
	UserAgent string    `json:"user_agent" gorm:"size:500"`
	RequestID string    `json:"request_id" gorm:"size:50"`
	Status    int       `json:"status"`
	Duration  int64 `json:"duration"` // milliseconds
	Body      string    `json:"body" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}

// AuditMiddleware returns a middleware that logs audit events
func AuditMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Read request body
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Process request
		c.Next()

		// Skip logging for certain paths
		path := c.Request.URL.Path
		if shouldSkipLogging(path) {
			return
		}

		// Get user info
		var userID uint
		var username string
		if uid, exists := c.Get("user_id"); exists {
			userID = uid.(uint)
		}
		if uname, exists := c.Get("username"); exists {
			username = uname.(string)
		}

		// Determine action
		action := determineAction(c.Request.Method, path)

		// Truncate body if too large
		body := string(bodyBytes)
		if len(body) > 1000 {
			body = body[:1000] + "... (truncated)"
		}

		// Create audit log
		auditLog := AuditLog{
			UserID:    userID,
			Username:  username,
			Action:    action,
			Resource:  extractResource(path),
			Method:    c.Request.Method,
			Path:      path,
			IP:        c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			RequestID: c.GetString("request_id"),
			Status:    c.Writer.Status(),
			Duration:  time.Since(start).Milliseconds(),
			Body:      body,
		}

		// Save to database (async to not block response)
		go func() {
			db.Create(&auditLog)
		}()
	}
}

// shouldSkipLogging determines if a path should be skipped for logging
func shouldSkipLogging(path string) bool {
	skipPaths := []string{
		"/health",
		"/metrics",
		"/favicon.ico",
	}

	for _, p := range skipPaths {
		if path == p {
			return true
		}
	}

	// Skip static files
	if len(path) > 4 && path[len(path)-4:] == ".css" ||
		len(path) > 3 && path[len(path)-3:] == ".js" ||
		len(path) > 4 && path[len(path)-4:] == ".png" ||
		len(path) > 4 && path[len(path)-4:] == ".jpg" {
		return true
	}

	return false
}

// determineAction determines the action based on HTTP method and path
func determineAction(method, path string) string {
	switch method {
	case "GET":
		return "read"
	case "POST":
		if contains(path, "/login") {
			return "login"
		}
		if contains(path, "/register") {
			return "register"
		}
		if contains(path, "/approve") {
			return "approve"
		}
		if contains(path, "/reject") {
			return "reject"
		}
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return "other"
	}
}

// extractResource extracts the resource name from the path
func extractResource(path string) string {
	parts := splitPath(path)
	if len(parts) >= 3 {
		return parts[2] // /api/v1/resource/...
	}
	return path
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && (s[0:len(substr)] == substr || contains(s[1:], substr)))
}

func splitPath(path string) []string {
	var parts []string
	current := ""
	for _, c := range path {
		if c == '/' {
			if current != "" {
				parts = append(parts, current)
			}
			current = ""
		} else {
			current += string(c)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}

// GetAuditLogs retrieves audit logs with pagination
func GetAuditLogs(db *gorm.DB, page, pageSize int, userID uint, action string) ([]AuditLog, int64, error) {
	var logs []AuditLog
	var total int64

	query := db.Model(&AuditLog{})

	if userID > 0 {
		query = query.Where("user_id = ?", userID)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}

	query.Count(&total)

	err := query.
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&logs).Error

	return logs, total, err
}
