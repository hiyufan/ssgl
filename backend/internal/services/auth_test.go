package services

import (
	"testing"
	"time"

	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/database"
)

func TestAuthService_NewAuthService(t *testing.T) {
	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing",
		Expiration: 24 * time.Hour,
	}
	svc := NewAuthService(jwtCfg)
	if svc == nil {
		t.Error("NewAuthService returned nil")
	}
}

func TestAuthService_Login_NilDB(t *testing.T) {
	// Skip if DB is connected (integration test environment)
	if database.GetDB() != nil {
		t.Skip("DB is connected, skipping nil-DB test")
	}

	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing",
		Expiration: 24 * time.Hour,
	}
	svc := NewAuthService(jwtCfg)

	// Login should fail gracefully when DB is nil (panics = bug)
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("Login panicked with nil DB: %v", r)
		}
	}()

	_, _, err := svc.Login("testuser", "testpass")
	if err == nil {
		t.Error("expected error when DB is nil")
	}
}

func TestAuthService_GetUserByID_NilDB(t *testing.T) {
	if database.GetDB() != nil {
		t.Skip("DB is connected, skipping nil-DB test")
	}

	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing",
		Expiration: 24 * time.Hour,
	}
	svc := NewAuthService(jwtCfg)

	defer func() {
		if r := recover(); r != nil {
			t.Errorf("GetUserByID panicked with nil DB: %v", r)
		}
	}()

	_, err := svc.GetUserByID(1)
	if err == nil {
		t.Error("expected error when DB is nil")
	}
}
