package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// AchievementPointsHandler handles student achievement points.
type AchievementPointsHandler struct{}

// NewAchievementPointsHandler creates a new AchievementPointsHandler.
func NewAchievementPointsHandler() *AchievementPointsHandler {
	return &AchievementPointsHandler{}
}

// ListPoints returns achievement points for the current user.
// GET /api/v1/points
func (h *AchievementPointsHandler) ListPoints(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	userID, _ := c.Get("user_id")
	uid, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var points []models.AchievementPoint
	db.Where("user_id = ?", uid).Order("created_at DESC").Find(&points)

	total := 0
	for _, p := range points {
		total += p.Points
	}

	c.JSON(http.StatusOK, gin.H{
		"points":     points,
		"total":      total,
		"count":      len(points),
	})
}

// GetMyPoints returns the current user's total points.
// GET /api/v1/points/me
func (h *AchievementPointsHandler) GetMyPoints(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	userID, _ := c.Get("user_id")
	uid, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var total int64
	db.Model(&models.AchievementPoint{}).Where("user_id = ?", uid).Select("COALESCE(SUM(points), 0)").Scan(&total)

	// Get rank
	var rank int64
	db.Model(&models.AchievementPoint{}).
		Select("COUNT(DISTINCT user_id)").
		Where("user_id != ? AND (SELECT COALESCE(SUM(points),0) FROM achievement_points WHERE user_id = achievement_points.user_id AND deleted_at IS NULL) > ?", uid, total).
		Scan(&rank)
	rank++ // 1-indexed

	// Get breakdown by reason
	type ReasonBreakdown struct {
		Reason string `json:"reason"`
		Count  int    `json:"count"`
		Total  int    `json:"total"`
	}
	var breakdown []ReasonBreakdown
	db.Model(&models.AchievementPoint{}).
		Where("user_id = ?", uid).
		Select("reason, COUNT(*) as count, SUM(points) as total").
		Group("reason").
		Order("total DESC").
		Scan(&breakdown)

	c.JSON(http.StatusOK, gin.H{
		"total_points": total,
		"rank":         rank,
		"breakdown":    breakdown,
	})
}

// Leaderboard returns the top students by achievement points.
// GET /api/v1/points/leaderboard
func (h *AchievementPointsHandler) Leaderboard(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	type LeaderboardEntry struct {
		UserID      uint   `json:"user_id"`
		Username    string `json:"username"`
		RealName    string `json:"real_name"`
		Dept        string `json:"dept"`
		TotalPoints int    `json:"total_points"`
		Rank        int    `json:"rank"`
	}

	// Get top users by total points using subquery
	type userTotal struct {
		UserID      uint
		TotalPoints int
	}
	var userTotals []userTotal
	db.Model(&models.AchievementPoint{}).
		Select("user_id, SUM(points) as total_points").
		Group("user_id").
		Order("total_points DESC").
		Limit(limit).
		Scan(&userTotals)

	var entries []LeaderboardEntry
	for i, ut := range userTotals {
		var user models.User
		db.First(&user, ut.UserID)
		entries = append(entries, LeaderboardEntry{
			UserID:      ut.UserID,
			Username:    user.Username,
			RealName:    user.Name,
			Dept:        user.Dept,
			TotalPoints: ut.TotalPoints,
			Rank:        i + 1,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"leaderboard": entries,
		"count":       len(entries),
	})
}

// AwardPoints awards points to a user. Admin/teacher only.
// POST /api/v1/points/award
func (h *AchievementPointsHandler) AwardPoints(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	var req struct {
		UserID   uint   `json:"user_id" binding:"required"`
		Points   int    `json:"points" binding:"required"`
		Reason   string `json:"reason" binding:"required"`
		SourceID uint   `json:"source_id"`
		Source   string `json:"source"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Points <= 0 || req.Points > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "points must be between 1 and 1000"})
		return
	}

	// Verify user exists
	var user models.User
	if err := db.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	point := models.AchievementPoint{
		UserID:   req.UserID,
		Points:   req.Points,
		Reason:   req.Reason,
		SourceID: req.SourceID,
		Source:   req.Source,
	}

	if err := db.Create(&point).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to award points"})
		return
	}

	c.JSON(http.StatusCreated, point)
}

// PointHistory returns point history for a specific user. Admin/teacher only.
// GET /api/v1/points/history/:user_id
func (h *AchievementPointsHandler) PointHistory(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	var points []models.AchievementPoint
	db.Where("user_id = ?", uint(userID)).Order("created_at DESC").Find(&points)

	var total int64
	db.Model(&models.AchievementPoint{}).Where("user_id = ?", uint(userID)).Select("COALESCE(SUM(points), 0)").Scan(&total)

	c.JSON(http.StatusOK, gin.H{
		"user_id": userID,
		"points":  points,
		"total":   total,
		"count":   len(points),
	})
}
