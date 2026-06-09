package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"gorm.io/gorm"
)

// AwardHandler handles award HTTP requests.
type AwardHandler struct{}

// NewAwardHandler creates a new AwardHandler.
func NewAwardHandler() *AwardHandler {
	return &AwardHandler{}
}

// SettleAwardRequest is the payload for settling an award.
type SettleAwardRequest struct {
	PrizeAmount float64 `json:"prize_amount" binding:"min=0"`
}

// List handles GET /awards with optional competition_id, team_id, and status filters.
func (h *AwardHandler) List(c *gin.Context) {
	db := database.GetDB()

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := db.Model(&models.Award{}).Preload("Competition").Preload("Team")

	if compID := c.Query("competition_id"); compID != "" {
		query = query.Where("competition_id = ?", compID)
	}
	if teamID := c.Query("team_id"); teamID != "" {
		query = query.Where("team_id = ?", teamID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var awards []models.Award
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("rank ASC, created_at DESC").Find(&awards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch awards"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"awards":    awards,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Settle handles PATCH /awards/:id/settle — marks an award as settled.
func (h *AwardHandler) Settle(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid award id"})
		return
	}

	var award models.Award
	if err := db.First(&award, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "award not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch award"})
		return
	}

	if award.Status == models.AwardStatusSettled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "award is already settled"})
		return
	}

	var req SettleAwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDVal, _ := c.Get("user_id")
	uid := userIDVal.(uint)
	now := time.Now()

	updates := map[string]interface{}{
		"status":     models.AwardStatusSettled,
		"settled_at": now,
		"settled_by": uid,
	}
	if req.PrizeAmount > 0 {
		updates["prize_amount"] = req.PrizeAmount
	}

	if err := db.Model(&award).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to settle award"})
		return
	}

	db.Preload("Competition").Preload("Team").First(&award, award.ID)

	c.JSON(http.StatusOK, gin.H{"award": award})
}
