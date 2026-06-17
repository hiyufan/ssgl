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

func TestDiagnosticsResponse_Fields(t *testing.T) {
	resp := DiagnosticsResponse{
		Status:        "healthy",
		UptimeSeconds: 3600,
		UptimeHuman:   "1h0m0s",
		GoVersion:     "go1.21.0",
		NumCPU:        4,
		NumGoroutine:  10,
		Timestamp:     "2026-06-18T10:00:00Z",
	}

	if resp.Status != "healthy" {
		t.Errorf("expected Status='healthy', got '%s'", resp.Status)
	}
	if resp.UptimeSeconds != 3600 {
		t.Errorf("expected UptimeSeconds=3600, got %f", resp.UptimeSeconds)
	}
	if resp.UptimeHuman != "1h0m0s" {
		t.Errorf("expected UptimeHuman='1h0m0s', got '%s'", resp.UptimeHuman)
	}
	if resp.GoVersion != "go1.21.0" {
		t.Errorf("expected GoVersion='go1.21.0', got '%s'", resp.GoVersion)
	}
	if resp.NumCPU != 4 {
		t.Errorf("expected NumCPU=4, got %d", resp.NumCPU)
	}
	if resp.NumGoroutine != 10 {
		t.Errorf("expected NumGoroutine=10, got %d", resp.NumGoroutine)
	}
	if resp.Timestamp != "2026-06-18T10:00:00Z" {
		t.Errorf("expected Timestamp='2026-06-18T10:00:00Z', got '%s'", resp.Timestamp)
	}
}

func TestMemoryStats_Fields(t *testing.T) {
	stats := MemoryStats{
		AllocMB:      100.5,
		TotalAllocMB: 500.25,
		SysMB:        200.75,
		NumGC:        10,
		HeapAllocMB:  80.5,
		HeapSysMB:    150.25,
		HeapIdleMB:   50.0,
		HeapInuseMB:  100.25,
	}

	if stats.AllocMB != 100.5 {
		t.Errorf("expected AllocMB=100.5, got %f", stats.AllocMB)
	}
	if stats.TotalAllocMB != 500.25 {
		t.Errorf("expected TotalAllocMB=500.25, got %f", stats.TotalAllocMB)
	}
	if stats.SysMB != 200.75 {
		t.Errorf("expected SysMB=200.75, got %f", stats.SysMB)
	}
	if stats.NumGC != 10 {
		t.Errorf("expected NumGC=10, got %d", stats.NumGC)
	}
	if stats.HeapAllocMB != 80.5 {
		t.Errorf("expected HeapAllocMB=80.5, got %f", stats.HeapAllocMB)
	}
	if stats.HeapSysMB != 150.25 {
		t.Errorf("expected HeapSysMB=150.25, got %f", stats.HeapSysMB)
	}
	if stats.HeapIdleMB != 50.0 {
		t.Errorf("expected HeapIdleMB=50.0, got %f", stats.HeapIdleMB)
	}
	if stats.HeapInuseMB != 100.25 {
		t.Errorf("expected HeapInuseMB=100.25, got %f", stats.HeapInuseMB)
	}
}

func TestDBPoolStats_Fields(t *testing.T) {
	stats := DBPoolStats{
		OpenConnections: 10,
		InUse:           5,
		Idle:            5,
		WaitCount:       0,
		WaitDuration:    "0s",
		MaxOpenConns:    25,
	}

	if stats.OpenConnections != 10 {
		t.Errorf("expected OpenConnections=10, got %d", stats.OpenConnections)
	}
	if stats.InUse != 5 {
		t.Errorf("expected InUse=5, got %d", stats.InUse)
	}
	if stats.Idle != 5 {
		t.Errorf("expected Idle=5, got %d", stats.Idle)
	}
	if stats.WaitCount != 0 {
		t.Errorf("expected WaitCount=0, got %d", stats.WaitCount)
	}
	if stats.WaitDuration != "0s" {
		t.Errorf("expected WaitDuration='0s', got '%s'", stats.WaitDuration)
	}
	if stats.MaxOpenConns != 25 {
		t.Errorf("expected MaxOpenConns=25, got %d", stats.MaxOpenConns)
	}
}

func TestFormatDuration_EdgeCases(t *testing.T) {
	tests := []struct {
		seconds int
		want    string
	}{
		{1, "1s"},
		{59, "59s"},
		{60, "1m0s"},
		{3599, "59m59s"},
		{3600, "1h0m0s"},
		{86400, "24h0m0s"},
	}
	for _, tt := range tests {
		d := time.Duration(tt.seconds) * time.Second
		got := formatDuration(d)
		if got != tt.want {
			t.Errorf("formatDuration(%ds) = %q, want %q", tt.seconds, got, tt.want)
		}
	}
}

func TestDiagnosticsHandler_ResponseFormat(t *testing.T) {
	r := setupDiagnosticsRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/system/diagnostics", nil)
	r.ServeHTTP(w, req)

	// Verify response is valid JSON
	var raw map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &raw); err != nil {
		t.Fatalf("response is not valid JSON: %v", err)
	}

	// Verify required fields exist
	requiredFields := []string{"status", "uptime_seconds", "uptime_human", "go_version", "num_cpu", "num_goroutine", "timestamp"}
	for _, field := range requiredFields {
		if _, ok := raw[field]; !ok {
			t.Errorf("missing required field: %s", field)
		}
	}
}

func TestDiagnosticsHandler_ContentHeader(t *testing.T) {
	r := setupDiagnosticsRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/system/diagnostics", nil)
	r.ServeHTTP(w, req)

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json; charset=utf-8" {
		t.Errorf("expected Content-Type 'application/json; charset=utf-8', got '%s'", contentType)
	}
}
