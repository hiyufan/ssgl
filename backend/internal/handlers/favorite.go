package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// FavoriteHandler handles competition bookmark/favorite HTTP requests.
type FavoriteHandler struct{}

// NewFavoriteHandler creates a new FavoriteHandler.
func NewFavoriteHandler() *FavoriteHandler {
	return &FavoriteHandler{}
}

// Toggle handles POST /favorites/:comp_id — toggles a competition favorite for the current user.
func (h *FavoriteHandler) Toggle(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	compID, err := strconv.ParseUint(c.Param("comp_id"), 10, 64)
	if err != nil || compID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事 ID"})
		return
	}

	// Verify competition exists.
	var comp models.Competition
	if err := db.First(&comp, compID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "赛事不存在"})
		return
	}

	// Check if already favorited.
	var existing models.CompetitionFavorite
	result := db.Where("user_id = ? AND competition_id = ?", userID, compID).First(&existing)

	if result.Error == nil {
		// Already favorited → remove it.
		db.Delete(&existing)
		c.JSON(http.StatusOK, gin.H{
			"favorited": false,
			"message":   "已取消收藏",
		})
		return
	}

	// Not favorited → create.
	fav := models.CompetitionFavorite{
		UserID:        userID,
		CompetitionID: uint(compID),
	}
	if err := db.Create(&fav).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "收藏失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"favorited": true,
		"message":   "已收藏",
		"favorite":  fav,
	})
}

// List handles GET /favorites — returns the current user's favorited competitions.
func (h *FavoriteHandler) List(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	db.Model(&models.CompetitionFavorite{}).Where("user_id = ?", userID).Count(&total)

	var favorites []models.CompetitionFavorite
	db.Preload("Competition").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&favorites)

	c.JSON(http.StatusOK, gin.H{
		"items":     favorites,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Check handles GET /favorites/:comp_id/check — checks if a competition is favorited.
func (h *FavoriteHandler) Check(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	compID, err := strconv.ParseUint(c.Param("comp_id"), 10, 64)
	if err != nil || compID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事 ID"})
		return
	}

	var count int64
	db.Model(&models.CompetitionFavorite{}).
		Where("user_id = ? AND competition_id = ?", userID, compID).
		Count(&count)

	c.JSON(http.StatusOK, gin.H{
		"favorited": count > 0,
	})
}
