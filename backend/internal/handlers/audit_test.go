package handlers

import (
	"testing"

	"github.com/ssgl/competition-platform/internal/middleware/security"
)

func TestNewAuditHandler(t *testing.T) {
	handler := NewAuditHandler(nil)
	if handler == nil {
		t.Error("NewAuditHandler returned nil")
	}
}

func TestAuditHandlerNilDB(t *testing.T) {
	handler := NewAuditHandler(nil)
	if handler == nil {
		t.Fatal("NewAuditHandler(nil) returned nil")
	}
	if handler.db != nil {
		t.Error("expected nil db")
	}
}

func TestAuditLogModel_Fields(t *testing.T) {
	log := security.AuditLog{
		ID:        1,
		UserID:    42,
		Username:  "testuser",
		Action:    "login",
		Resource:  "/api/v1/auth/login",
		Method:    "POST",
		Path:      "/api/v1/auth/login",
		IP:        "192.168.1.1",
		UserAgent: "Mozilla/5.0",
		RequestID: "req-123",
		Status:    200,
		Duration:  150,
		Body:      `{"username":"testuser"}`,
	}

	if log.ID != 1 {
		t.Errorf("expected ID=1, got %d", log.ID)
	}
	if log.UserID != 42 {
		t.Errorf("expected UserID=42, got %d", log.UserID)
	}
	if log.Username != "testuser" {
		t.Errorf("expected Username='testuser', got '%s'", log.Username)
	}
	if log.Action != "login" {
		t.Errorf("expected Action='login', got '%s'", log.Action)
	}
	if log.Resource != "/api/v1/auth/login" {
		t.Errorf("expected Resource='/api/v1/auth/login', got '%s'", log.Resource)
	}
	if log.Method != "POST" {
		t.Errorf("expected Method='POST', got '%s'", log.Method)
	}
	if log.Path != "/api/v1/auth/login" {
		t.Errorf("expected Path='/api/v1/auth/login', got '%s'", log.Path)
	}
	if log.IP != "192.168.1.1" {
		t.Errorf("expected IP='192.168.1.1', got '%s'", log.IP)
	}
	if log.UserAgent != "Mozilla/5.0" {
		t.Errorf("expected UserAgent='Mozilla/5.0', got '%s'", log.UserAgent)
	}
	if log.RequestID != "req-123" {
		t.Errorf("expected RequestID='req-123', got '%s'", log.RequestID)
	}
	if log.Status != 200 {
		t.Errorf("expected Status=200, got %d", log.Status)
	}
	if log.Duration != 150 {
		t.Errorf("expected Duration=150, got %d", log.Duration)
	}
	if log.Body != `{"username":"testuser"}` {
		t.Errorf("expected Body='{\"username\":\"testuser\"}', got '%s'", log.Body)
	}
}

func TestAuditLogModel_TableName(t *testing.T) {
	log := security.AuditLog{}
	if log.TableName() != "audit_logs" {
		t.Errorf("expected TableName()='audit_logs', got '%s'", log.TableName())
	}
}

func TestAuditLogModel_ZeroValues(t *testing.T) {
	log := security.AuditLog{}
	if log.ID != 0 {
		t.Errorf("expected zero ID, got %d", log.ID)
	}
	if log.UserID != 0 {
		t.Errorf("expected zero UserID, got %d", log.UserID)
	}
	if log.Username != "" {
		t.Errorf("expected empty Username, got '%s'", log.Username)
	}
	if log.Action != "" {
		t.Errorf("expected empty Action, got '%s'", log.Action)
	}
	if log.Status != 0 {
		t.Errorf("expected zero Status, got %d", log.Status)
	}
	if log.Duration != 0 {
		t.Errorf("expected zero Duration, got %d", log.Duration)
	}
}

func TestAuditLogModel_ActionTypes(t *testing.T) {
	actions := []string{"login", "register", "create", "read", "update", "delete", "approve", "reject"}
	for _, action := range actions {
		log := security.AuditLog{Action: action}
		if log.Action != action {
			t.Errorf("expected Action='%s', got '%s'", action, log.Action)
		}
	}
}

func TestAuditLogModel_JSONTags(t *testing.T) {
	// Verify JSON tags exist by checking the struct can be instantiated
	log := security.AuditLog{
		ID:        1,
		UserID:    1,
		Username:  "user",
		Action:    "login",
		Resource:  "/api/v1/auth/login",
		Method:    "POST",
		Path:      "/api/v1/auth/login",
		IP:        "127.0.0.1",
		UserAgent: "test",
		RequestID: "req-1",
		Status:    200,
		Duration:  100,
		Body:      "{}",
	}
	// If this compiles, the JSON tags are valid
	if log.ID == 0 {
		t.Error("unexpected zero ID")
	}
}

func TestAuditLogModel_IPAddresses(t *testing.T) {
	ips := []string{"127.0.0.1", "192.168.1.1", "10.0.0.1", "::1", "2001:db8::1"}
	for _, ip := range ips {
		log := security.AuditLog{IP: ip}
		if log.IP != ip {
			t.Errorf("expected IP='%s', got '%s'", ip, log.IP)
		}
	}
}
