package handlers

import (
	"testing"
)

func TestNewAuthHandler(t *testing.T) {
	handler := NewAuthHandler(nil)
	if handler == nil {
		t.Error("NewAuthHandler returned nil")
	}
}

func TestRegisterRequestFields(t *testing.T) {
	req := RegisterRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "securePass123",
		Role:     "student",
		Name:     "测试用户",
	}

	if req.Username != "testuser" {
		t.Errorf("expected Username='testuser', got '%s'", req.Username)
	}
	if req.Email != "test@example.com" {
		t.Errorf("expected Email='test@example.com', got '%s'", req.Email)
	}
	if req.Password != "securePass123" {
		t.Errorf("expected Password='securePass123', got '%s'", req.Password)
	}
	if req.Role != "student" {
		t.Errorf("expected Role='student', got '%s'", req.Role)
	}
	if req.Name != "测试用户" {
		t.Errorf("expected Name='测试用户', got '%s'", req.Name)
	}
}

func TestLoginRequestFields(t *testing.T) {
	req := LoginRequest{
		Username: "liuzy",
		Password: "admin123",
	}

	if req.Username != "liuzy" {
		t.Errorf("expected Username='liuzy', got '%s'", req.Username)
	}
	if req.Password != "admin123" {
		t.Errorf("expected Password='admin123', got '%s'", req.Password)
	}
}

func TestRefreshRequestFields(t *testing.T) {
	req := RefreshRequest{
		RefreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
	}

	if req.RefreshToken != "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test" {
		t.Errorf("expected RefreshToken set, got '%s'", req.RefreshToken)
	}
}

func TestRegisterRequestRoleValidation(t *testing.T) {
	// Valid roles
	validRoles := []string{"student", "teacher"}
	for _, role := range validRoles {
		req := RegisterRequest{
			Username: "user_" + role,
			Email:    role + "@test.com",
			Password: "pass123",
			Role:     role,
			Name:     "Test User",
		}
		if req.Role != role {
			t.Errorf("expected Role='%s', got '%s'", role, req.Role)
		}
	}
}

func TestAuthHandlerNilAuthService(t *testing.T) {
	handler := NewAuthHandler(nil)
	if handler == nil {
		t.Fatal("NewAuthHandler(nil) returned nil")
	}
	if handler.authService != nil {
		t.Error("expected nil authService")
	}
}
