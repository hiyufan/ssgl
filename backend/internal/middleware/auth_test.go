package middleware

import (
	"fmt"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/services"
)

func TestAuthMiddleware_MissingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := &config.JWTConfig{Secret: "test-secret-key-unit-testing"}
	r := gin.New()
	r.Use(AuthMiddleware(cfg))
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_InvalidFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := &config.JWTConfig{Secret: "test-secret-key-unit-testing"}
	r := gin.New()
	r.Use(AuthMiddleware(cfg))
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "NotBearer sometoken")
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := &config.JWTConfig{Secret: "test-secret-key-unit-testing"}
	r := gin.New()
	r.Use(AuthMiddleware(cfg))
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid.jwt.token")
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret-key-unit-testing"
	cfg := &config.JWTConfig{Secret: secret}
	r := gin.New()
	r.Use(AuthMiddleware(cfg))
	r.GET("/test", func(c *gin.Context) {
		uid, _ := c.Get("user_id")
		role, _ := c.Get("role")
		c.String(200, "uid=%v role=%v", uid, role)
	})

	// Generate a valid access token
	claims := &services.Claims{
		UserID:    42,
		Role:      "student",
		TokenType: services.TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(secret))

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenStr))
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestAuthMiddleware_RefreshTokenRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret-key-unit-testing"
	cfg := &config.JWTConfig{Secret: secret}
	r := gin.New()
	r.Use(AuthMiddleware(cfg))
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	// Generate a refresh token (should be rejected on protected routes)
	claims := &services.Claims{
		UserID:    42,
		Role:      "student",
		TokenType: services.TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(secret))

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenStr))
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("expected 401 for refresh token, got %d", w.Code)
	}
}

func TestAuthMiddleware_ExpiredToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret-key-unit-testing"
	cfg := &config.JWTConfig{Secret: secret}
	r := gin.New()
	r.Use(AuthMiddleware(cfg))
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	// Generate an expired token
	claims := &services.Claims{
		UserID:    42,
		Role:      "student",
		TokenType: services.TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(secret))

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenStr))
	r.ServeHTTP(w, req)

	if w.Code != 401 {
		t.Errorf("expected 401 for expired token, got %d", w.Code)
	}
}
