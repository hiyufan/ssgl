package security

import (
	"testing"
)

// --- AuditLog model tests ---

func TestAuditLog_Fields(t *testing.T) {
	log := AuditLog{
		ID:        1,
		UserID:    42,
		Username:  "testuser",
		Action:    "create",
		Resource:  "competitions",
		Method:    "POST",
		Path:      "/api/v1/competitions",
		IP:        "192.168.1.1",
		UserAgent: "Mozilla/5.0",
		RequestID: "req-123",
		Status:    200,
		Duration:  150,
		Body:      `{"title":"test"}`,
	}

	if log.UserID != 42 {
		t.Errorf("expected UserID 42, got %d", log.UserID)
	}
	if log.Username != "testuser" {
		t.Errorf("expected Username 'testuser', got '%s'", log.Username)
	}
	if log.Action != "create" {
		t.Errorf("expected Action 'create', got '%s'", log.Action)
	}
	if log.Resource != "competitions" {
		t.Errorf("expected Resource 'competitions', got '%s'", log.Resource)
	}
	if log.Method != "POST" {
		t.Errorf("expected Method 'POST', got '%s'", log.Method)
	}
	if log.Path != "/api/v1/competitions" {
		t.Errorf("expected Path '/api/v1/competitions', got '%s'", log.Path)
	}
	if log.IP != "192.168.1.1" {
		t.Errorf("expected IP '192.168.1.1', got '%s'", log.IP)
	}
	if log.Status != 200 {
		t.Errorf("expected Status 200, got %d", log.Status)
	}
	if log.Duration != 150 {
		t.Errorf("expected Duration 150, got %d", log.Duration)
	}
}

func TestAuditLog_TableName(t *testing.T) {
	al := AuditLog{}
	if al.TableName() != "audit_logs" {
		t.Errorf("expected table name 'audit_logs', got '%s'", al.TableName())
	}
}

// --- shouldSkipLogging tests ---

func TestShouldSkipLogging_Health(t *testing.T) {
	if !shouldSkipLogging("/health") {
		t.Error("expected /health to be skipped")
	}
}

func TestShouldSkipLogging_Metrics(t *testing.T) {
	if !shouldSkipLogging("/metrics") {
		t.Error("expected /metrics to be skipped")
	}
}

func TestShouldSkipLogging_Favicon(t *testing.T) {
	if !shouldSkipLogging("/favicon.ico") {
		t.Error("expected /favicon.ico to be skipped")
	}
}

func TestShouldSkipLogging_CSS(t *testing.T) {
	if !shouldSkipLogging("/static/style.css") {
		t.Error("expected .css to be skipped")
	}
}

func TestShouldSkipLogging_JS(t *testing.T) {
	if !shouldSkipLogging("/static/app.js") {
		t.Error("expected .js to be skipped")
	}
}

func TestShouldSkipLogging_PNG(t *testing.T) {
	if !shouldSkipLogging("/images/logo.png") {
		t.Error("expected .png to be skipped")
	}
}

func TestShouldSkipLogging_JPG(t *testing.T) {
	if !shouldSkipLogging("/images/photo.jpg") {
		t.Error("expected .jpg to be skipped")
	}
}

func TestShouldSkipLogging_APIPath(t *testing.T) {
	if shouldSkipLogging("/api/v1/users") {
		t.Error("expected /api/v1/users NOT to be skipped")
	}
}

// --- determineAction tests ---

func TestDetermineAction_GET(t *testing.T) {
	if got := determineAction("GET", "/api/v1/competitions"); got != "read" {
		t.Errorf("expected 'read', got '%s'", got)
	}
}

func TestDetermineAction_POST_Login(t *testing.T) {
	if got := determineAction("POST", "/api/v1/login"); got != "login" {
		t.Errorf("expected 'login', got '%s'", got)
	}
}

func TestDetermineAction_POST_Register(t *testing.T) {
	if got := determineAction("POST", "/api/v1/register"); got != "register" {
		t.Errorf("expected 'register', got '%s'", got)
	}
}

func TestDetermineAction_POST_Approve(t *testing.T) {
	if got := determineAction("POST", "/api/v1/workflows/1/approve"); got != "approve" {
		t.Errorf("expected 'approve', got '%s'", got)
	}
}

func TestDetermineAction_POST_Reject(t *testing.T) {
	if got := determineAction("POST", "/api/v1/workflows/1/reject"); got != "reject" {
		t.Errorf("expected 'reject', got '%s'", got)
	}
}

func TestDetermineAction_POST_Default(t *testing.T) {
	if got := determineAction("POST", "/api/v1/teams"); got != "create" {
		t.Errorf("expected 'create', got '%s'", got)
	}
}

func TestDetermineAction_PUT(t *testing.T) {
	if got := determineAction("PUT", "/api/v1/competitions/1"); got != "update" {
		t.Errorf("expected 'update', got '%s'", got)
	}
}

func TestDetermineAction_PATCH(t *testing.T) {
	if got := determineAction("PATCH", "/api/v1/competitions/1"); got != "update" {
		t.Errorf("expected 'update', got '%s'", got)
	}
}

func TestDetermineAction_DELETE(t *testing.T) {
	if got := determineAction("DELETE", "/api/v1/competitions/1"); got != "delete" {
		t.Errorf("expected 'delete', got '%s'", got)
	}
}

func TestDetermineAction_Default(t *testing.T) {
	if got := determineAction("OPTIONS", "/api/v1/test"); got != "other" {
		t.Errorf("expected 'other', got '%s'", got)
	}
}

// --- extractResource tests ---

func TestExtractResource_NormalPath(t *testing.T) {
	if got := extractResource("/api/v1/competitions/1"); got != "competitions" {
		t.Errorf("expected 'competitions', got '%s'", got)
	}
}

func TestExtractResource_ShortPath(t *testing.T) {
	if got := extractResource("/health"); got != "/health" {
		t.Errorf("expected '/health', got '%s'", got)
	}
}

func TestExtractResource_NestedPath(t *testing.T) {
	if got := extractResource("/api/v1/users/42/profile"); got != "users" {
		t.Errorf("expected 'users', got '%s'", got)
	}
}

// --- splitPath tests ---

func TestSplitPath_Normal(t *testing.T) {
	parts := splitPath("/api/v1/users")
	if len(parts) != 3 {
		t.Fatalf("expected 3 parts, got %d", len(parts))
	}
	if parts[0] != "api" || parts[1] != "v1" || parts[2] != "users" {
		t.Errorf("unexpected parts: %v", parts)
	}
}

func TestSplitPath_TrailingSlash(t *testing.T) {
	parts := splitPath("/api/v1/")
	if len(parts) != 2 {
		t.Fatalf("expected 2 parts, got %d", len(parts))
	}
}

func TestSplitPath_Empty(t *testing.T) {
	parts := splitPath("/")
	if len(parts) != 0 {
		t.Errorf("expected 0 parts for '/', got %d", len(parts))
	}
}

// --- contains helper tests ---

func TestContains_Match(t *testing.T) {
	if !contains("/api/v1/login", "/login") {
		t.Error("expected contains to find '/login' in path")
	}
}

func TestContains_NoMatch(t *testing.T) {
	if contains("/api/v1/users", "/login") {
		t.Error("expected contains to not find '/login' in path")
	}
}
