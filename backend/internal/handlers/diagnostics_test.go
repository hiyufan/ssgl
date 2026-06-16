package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func setupDiagnosticsRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewDiagnosticsHandler()
	r.GET("/system/diagnostics", h.Diagnostics)
	return r
}

func TestDiagnosticsHandler(t *testing.T) {
	r := setupDiagnosticsRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/system/diagnostics", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp DiagnosticsResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if resp.Status != "healthy" {
		t.Errorf("expected status 'healthy', got '%s'", resp.Status)
	}
	if resp.UptimeSeconds < 0 {
		t.Errorf("uptime should be non-negative, got %f", resp.UptimeSeconds)
	}
	if resp.GoVersion == "" {
		t.Error("go_version should not be empty")
	}
	if resp.NumCPU <= 0 {
		t.Errorf("num_cpu should be positive, got %d", resp.NumCPU)
	}
	if resp.NumGoroutine < 1 {
		t.Errorf("num_goroutine should be >= 1, got %d", resp.NumGoroutine)
	}
	if resp.Timestamp == "" {
		t.Error("timestamp should not be empty")
	}
	if resp.UptimeHuman == "" {
		t.Error("uptime_human should not be empty")
	}
}

func TestDiagnosticsMemoryStats(t *testing.T) {
	r := setupDiagnosticsRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/system/diagnostics", nil)
	r.ServeHTTP(w, req)

	var resp DiagnosticsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.MemoryStats.AllocMB < 0 {
		t.Errorf("alloc_mb should be non-negative, got %f", resp.MemoryStats.AllocMB)
	}
	if resp.MemoryStats.SysMB < 0 {
		t.Errorf("sys_mb should be non-negative, got %f", resp.MemoryStats.SysMB)
	}
}

func TestDiagnosticsDBPoolStats(t *testing.T) {
	r := setupDiagnosticsRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/system/diagnostics", nil)
	r.ServeHTTP(w, req)

	var resp DiagnosticsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	// DB pool stats should be present (may be zero if no DB in test mode)
	if resp.DBPoolStats.MaxOpenConns < 0 {
		t.Errorf("max_open_conns should be non-negative, got %d", resp.DBPoolStats.MaxOpenConns)
	}
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		seconds int
		want    string
	}{
		{0, "0s"},
		{5, "5s"},
		{65, "1m5s"},
		{3661, "1h1m1s"},
		{7200, "2h0m0s"},
	}
	for _, tt := range tests {
		d := time.Duration(tt.seconds) * time.Second
		got := formatDuration(d)
		if got != tt.want {
			t.Errorf("formatDuration(%ds) = %q, want %q", tt.seconds, got, tt.want)
		}
	}
}
