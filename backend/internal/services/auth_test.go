package services

import (
	"testing"

	"github.com/ssgl/competition-platform/internal/config"
)

func TestAuthService_Login_InvalidCredentials(t *testing.T) {
	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing",
		ExpireHour: 24,
		Issuer:     "ssgl-test",
	}
	svc := NewAuthService(jwtCfg)

	_, _, err := svc.Login("nonexistent_user", "wrong_password")
	if err == nil {
		t.Error("expected error for invalid credentials, got nil")
	}
}

func TestAuthService_GetUserByID_NotFound(t *testing.T) {
	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing",
		ExpireHour: 24,
		Issuer:     "ssgl-test",
	}
	svc := NewAuthService(jwtCfg)

	_, err := svc.GetUserByID(999999)
	if err == nil {
		t.Error("expected error for non-existent user, got nil")
	}
}
