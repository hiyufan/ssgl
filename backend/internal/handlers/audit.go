package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/middleware/security"
	"gorm.io/gorm"
)

type AuditHandler struct {
	db *gorm.DB
}

func NewAuditHandler(db *gorm.DB) *AuditHandler {
	return &AuditHandler{db: db}
}

// List returns audit logs with pagination and filtering
func (h *AuditHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	userID, _ := strconv.ParseUint(c.Query("user_id"), 10, 32)
	action := c.Query("action")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	logs, total, err := security.GetAuditLogs(h.db, page, pageSize, uint(userID), action)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":       logs,
		"total":      total,
		"page":       page,
		"page_size":  pageSize,
		"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// GetStats returns audit log statistics
func (h *AuditHandler) GetStats(c *gin.Context) {
	var stats struct {
		TotalLogs    int64 `json:"total_logs"`
		TodayLogs    int64 `json:"today_logs"`
		FailedLogins int64 `json:"failed_logins"`
		TopActions   []struct {
			Action string `json:"action"`
			Count  int64  `json:"count"`
		} `json:"top_actions"`
	}

	// Total logs
	h.db.Model(&security.AuditLog{}).Count(&stats.TotalLogs)

	// Today's logs
	h.db.Model(&security.AuditLog{}).
		Where("created_at >= CURRENT_DATE").
		Count(&stats.TodayLogs)

	// Failed logins
	h.db.Model(&security.AuditLog{}).
		Where("action = 'login' AND status >= 400").
		Count(&stats.FailedLogins)

	// Top actions
	h.db.Model(&security.AuditLog{}).
		Select("action, count(*) as count").
		Group("action").
		Order("count DESC").
		Limit(10).
		Find(&stats.TopActions)

	c.JSON(http.StatusOK, stats)
}
