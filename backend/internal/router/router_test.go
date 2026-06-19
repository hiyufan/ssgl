package router

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/config"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func testConfig() *config.Config {
	return &config.Config{
		DB: config.DBConfig{
			Host: "localhost", Port: "5432", User: "test",
			Password: "test", Name: "test", SSLMode: "disable",
		},
		JWT: config.JWTConfig{
			Secret:     "test-secret-key-for-unit-testing-32chars",
			Expiration: 24 * time.Hour,
		},
		AI: config.AIConfig{
			BaseURL: "http://localhost:8000",
		},
		Server: config.ServerConfig{
			Port: "8080",
			Mode: "test",
		},
	}
}

func TestSetup_ReturnsEngine(t *testing.T) {
	r := Setup(testConfig())
	if r == nil {
		t.Fatal("Setup returned nil engine")
	}
}

func TestSetup_HealthEndpoint(t *testing.T) {
	r := Setup(testConfig())

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK && w.Code != http.StatusServiceUnavailable {
		t.Errorf("health endpoint returned %d, expected 200 or 503", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("health response is not valid JSON: %v", err)
	}

	if _, ok := body["status"]; !ok {
		t.Error("health response missing 'status' field")
	}
	if _, ok := body["service"]; !ok {
		t.Error("health response missing 'service' field")
	}
}

func TestSetup_RouteCount(t *testing.T) {
	r := Setup(testConfig())

	routes := r.Routes()
	if len(routes) < 30 {
		t.Errorf("expected at least 30 routes, got %d", len(routes))
	}
}

func TestSetup_HasAPIRoutes(t *testing.T) {
	r := Setup(testConfig())

	routeMap := make(map[string]bool)
	for _, route := range r.Routes() {
		key := route.Method + " " + route.Path
		routeMap[key] = true
	}

	requiredRoutes := []string{
		"GET /health",
		"POST /api/v1/auth/login",
		"POST /api/v1/auth/register",
		"GET /api/v1/competitions",
		"GET /api/v1/teams",
		"GET /api/v1/pre-plans",
		"GET /api/v1/awards",
		"GET /api/v1/stats/overview",
		"GET /api/v1/leaderboard",
		"GET /api/v1/calendar",
		"GET /api/v1/showcase",
		"GET /api/v1/stats/engagement",
		"GET /api/v1/users/me/activity",
		"GET /api/v1/notifications",
		// New endpoints added in this iteration
		"POST /api/v1/pre-plans/:id/teacher-review",
		"DELETE /api/v1/pre-plans/:id",
		"GET /api/v1/competitions/:id/stats",
		"GET /api/v1/timeline",
		"GET /api/v1/students/:id/growth",
	}

	for _, route := range requiredRoutes {
		if !routeMap[route] {
			t.Errorf("missing required route: %s", route)
		}
	}
}

func TestSetup_UnauthenticatedEndpoints(t *testing.T) {
	r := Setup(testConfig())

	// Health should be accessible without auth
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	r.ServeHTTP(w, req)

	if w.Code == http.StatusUnauthorized {
		t.Error("health endpoint should not require authentication")
	}

	// Login should be accessible without auth (returns 400 for empty body, not 401)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/api/v1/auth/login", nil)
	r.ServeHTTP(w2, req2)

	if w2.Code == http.StatusUnauthorized {
		t.Error("login endpoint should not require authentication")
	}

	// Register should be accessible without auth
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("POST", "/api/v1/auth/register", nil)
	r.ServeHTTP(w3, req3)

	if w3.Code == http.StatusUnauthorized {
		t.Error("register endpoint should not require authentication")
	}
}

func TestSetup_ProtectedRoutesRequireAuth(t *testing.T) {
	r := Setup(testConfig())

	protectedPaths := []string{
		"/api/v1/competitions",
		"/api/v1/teams",
		"/api/v1/pre-plans",
		"/api/v1/awards",
		"/api/v1/stats/overview",
		"/api/v1/leaderboard",
		"/api/v1/users/me",
	}

	for _, path := range protectedPaths {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", path, nil)
		r.ServeHTTP(w, req)

		if w.Code == http.StatusOK {
			t.Errorf("protected route %s should require auth, got 200", path)
		}
	}
}
