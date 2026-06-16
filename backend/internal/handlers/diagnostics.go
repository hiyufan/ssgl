package handlers

import (
	"fmt"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
)

// startTime records when the server process started (set at init).
var startTime = time.Now()

// DiagnosticsHandler handles system diagnostics HTTP requests.
type DiagnosticsHandler struct{}

// NewDiagnosticsHandler creates a new DiagnosticsHandler.
func NewDiagnosticsHandler() *DiagnosticsHandler {
	return &DiagnosticsHandler{}
}

// DBPoolStats holds database connection pool statistics.
type DBPoolStats struct {
	OpenConnections int   `json:"open_connections"`
	InUse           int   `json:"in_use"`
	Idle            int   `json:"idle"`
	WaitCount       int64 `json:"wait_count"`
	WaitDuration    string `json:"wait_duration"`
	MaxOpenConns    int   `json:"max_open_conns"`
}

// MemoryStats holds Go runtime memory statistics.
type MemoryStats struct {
	AllocMB      float64 `json:"alloc_mb"`
	TotalAllocMB float64 `json:"total_alloc_mb"`
	SysMB        float64 `json:"sys_mb"`
	NumGC        uint32  `json:"num_gc"`
	HeapAllocMB  float64 `json:"heap_alloc_mb"`
	HeapSysMB    float64 `json:"heap_sys_mb"`
	HeapIdleMB   float64 `json:"heap_idle_mb"`
	HeapInuseMB  float64 `json:"heap_inuse_mb"`
}

// DiagnosticsResponse holds the full system diagnostics payload.
type DiagnosticsResponse struct {
	Status        string       `json:"status"`
	UptimeSeconds float64      `json:"uptime_seconds"`
	UptimeHuman   string       `json:"uptime_human"`
	GoVersion     string       `json:"go_version"`
	NumCPU        int          `json:"num_cpu"`
	NumGoroutine  int          `json:"num_goroutine"`
	DBPoolStats   DBPoolStats  `json:"db_pool_stats"`
	MemoryStats   MemoryStats  `json:"memory_stats"`
	Timestamp     string       `json:"timestamp"`
}

// Diagnostics handles GET /system/diagnostics — returns system health details.
func (h *DiagnosticsHandler) Diagnostics(c *gin.Context) {
	db := database.GetDB()

	dbStats := DBPoolStats{}
	if db != nil {
		sqlDB, err := db.DB()
		if err == nil {
			stats := sqlDB.Stats()
			dbStats = DBPoolStats{
				OpenConnections: stats.OpenConnections,
				InUse:           stats.InUse,
				Idle:            stats.Idle,
				WaitCount:       stats.WaitCount,
				WaitDuration:    stats.WaitDuration.String(),
				MaxOpenConns:    stats.MaxOpenConnections,
			}
		}
	}

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	uptime := time.Since(startTime)
	uptimeHuman := formatDuration(uptime)

	c.JSON(http.StatusOK, DiagnosticsResponse{
		Status:        "healthy",
		UptimeSeconds: uptime.Seconds(),
		UptimeHuman:   uptimeHuman,
		GoVersion:     runtime.Version(),
		NumCPU:        runtime.NumCPU(),
		NumGoroutine:  runtime.NumGoroutine(),
		DBPoolStats:   dbStats,
		MemoryStats: MemoryStats{
			AllocMB:      float64(mem.Alloc) / 1024 / 1024,
			TotalAllocMB: float64(mem.TotalAlloc) / 1024 / 1024,
			SysMB:        float64(mem.Sys) / 1024 / 1024,
			NumGC:        mem.NumGC,
			HeapAllocMB:  float64(mem.HeapAlloc) / 1024 / 1024,
			HeapSysMB:    float64(mem.HeapSys) / 1024 / 1024,
			HeapIdleMB:   float64(mem.HeapIdle) / 1024 / 1024,
			HeapInuseMB:  float64(mem.HeapInuse) / 1024 / 1024,
		},
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

// formatDuration returns a human-readable duration string.
func formatDuration(d time.Duration) string {
	total := int(d.Seconds())
	if total < 0 {
		total = 0
	}
	h := total / 3600
	m := (total % 3600) / 60
	s := total % 60
	if h > 0 {
		return fmt.Sprintf("%dh%dm%ds", h, m, s)
	}
	if m > 0 {
		return fmt.Sprintf("%dm%ds", m, s)
	}
	return fmt.Sprintf("%ds", s)
}
