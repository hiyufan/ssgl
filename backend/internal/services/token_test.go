package services

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/ssgl/competition-platform/internal/config"
)

func TestGenerateTokenPair(t *testing.T) {
	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing-32chars!",
		Expiration: 24 * time.Hour,
	}
	svc := NewAuthService(jwtCfg)

	tokens, err := svc.generateTokenPair(42, "student")
	if err != nil {
		t.Fatalf("generateTokenPair failed: %v", err)
	}
	if tokens.AccessToken == "" {
		t.Error("access token is empty")
	}
	if tokens.RefreshToken == "" {
		t.Error("refresh token is empty")
	}
	if tokens.ExpiresIn != int64(24*3600) {
		t.Errorf("expected ExpiresIn=%d, got %d", 24*3600, tokens.ExpiresIn)
	}

	// Parse and validate access token
	accessClaims := &Claims{}
	accessTok, err := jwt.ParseWithClaims(tokens.AccessToken, accessClaims, func(t *jwt.Token) (interface{}, error) {
		return []byte(jwtCfg.Secret), nil
	})
	if err != nil {
		t.Fatalf("failed to parse access token: %v", err)
	}
	if !accessTok.Valid {
		t.Error("access token should be valid")
	}
	if accessClaims.UserID != 42 {
		t.Errorf("expected UserID=42, got %d", accessClaims.UserID)
	}
	if accessClaims.Role != "student" {
		t.Errorf("expected Role='student', got '%s'", accessClaims.Role)
	}
	if accessClaims.TokenType != TokenTypeAccess {
		t.Errorf("expected TokenType='%s', got '%s'", TokenTypeAccess, accessClaims.TokenType)
	}

	// Parse and validate refresh token
	refreshClaims := &Claims{}
	refreshTok, err := jwt.ParseWithClaims(tokens.RefreshToken, refreshClaims, func(t *jwt.Token) (interface{}, error) {
		return []byte(jwtCfg.Secret), nil
	})
	if err != nil {
		t.Fatalf("failed to parse refresh token: %v", err)
	}
	if !refreshTok.Valid {
		t.Error("refresh token should be valid")
	}
	if refreshClaims.UserID != 42 {
		t.Errorf("expected UserID=42, got %d", refreshClaims.UserID)
	}
	if refreshClaims.TokenType != TokenTypeRefresh {
		t.Errorf("expected TokenType='%s', got '%s'", TokenTypeRefresh, refreshClaims.TokenType)
	}
}

func TestRefreshToken_ValidRefreshToken(t *testing.T) {
	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing-32chars!",
		Expiration: 1 * time.Hour,
	}
	svc := NewAuthService(jwtCfg)

	// Generate initial tokens
	tokens, err := svc.generateTokenPair(10, "teacher")
	if err != nil {
		t.Fatalf("generateTokenPair failed: %v", err)
	}

	// Refresh using the refresh token
	newTokens, err := svc.RefreshToken(tokens.RefreshToken)
	if err != nil {
		t.Fatalf("RefreshToken failed: %v", err)
	}
	if newTokens.AccessToken == "" {
		t.Error("new access token is empty")
	}
	if newTokens.RefreshToken == "" {
		t.Error("new refresh token is empty")
	}

	// Parse new access token to verify claims
	claims := &Claims{}
	_, err = jwt.ParseWithClaims(newTokens.AccessToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(jwtCfg.Secret), nil
	})
	if err != nil {
		t.Fatalf("failed to parse refreshed access token: %v", err)
	}
	if claims.UserID != 10 {
		t.Errorf("expected UserID=10, got %d", claims.UserID)
	}
	if claims.Role != "teacher" {
		t.Errorf("expected Role='teacher', got '%s'", claims.Role)
	}
}

func TestRefreshToken_InvalidToken(t *testing.T) {
	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing-32chars!",
		Expiration: 1 * time.Hour,
	}
	svc := NewAuthService(jwtCfg)

	_, err := svc.RefreshToken("invalid.token.string")
	if err == nil {
		t.Error("expected error for invalid refresh token")
	}
}

func TestRefreshToken_AccessTokenRejected(t *testing.T) {
	jwtCfg := &config.JWTConfig{
		Secret:     "test-secret-key-for-unit-testing-32chars!",
		Expiration: 1 * time.Hour,
	}
	svc := NewAuthService(jwtCfg)

	tokens, err := svc.generateTokenPair(1, "admin")
	if err != nil {
		t.Fatalf("generateTokenPair failed: %v", err)
	}

	// Using an access token as refresh token should fail
	_, err = svc.RefreshToken(tokens.AccessToken)
	if err == nil {
		t.Error("expected error when using access token as refresh token")
	}
}

func TestTokenTypeConstants(t *testing.T) {
	if TokenTypeAccess != "access" {
		t.Errorf("expected TokenTypeAccess='access', got '%s'", TokenTypeAccess)
	}
	if TokenTypeRefresh != "refresh" {
		t.Errorf("expected TokenTypeRefresh='refresh', got '%s'", TokenTypeRefresh)
	}
}

func TestClaims_Fields(t *testing.T) {
	claims := Claims{
		UserID:    99,
		Role:      "admin",
		TokenType: "access",
	}
	if claims.UserID != 99 {
		t.Errorf("expected UserID=99, got %d", claims.UserID)
	}
	if claims.Role != "admin" {
		t.Errorf("expected Role='admin', got '%s'", claims.Role)
	}
	if claims.TokenType != "access" {
		t.Errorf("expected TokenType='access', got '%s'", claims.TokenType)
	}
}
