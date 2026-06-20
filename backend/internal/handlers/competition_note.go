package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// CompetitionNoteHandler handles competition note/annotation HTTP requests.
type CompetitionNoteHandler struct{}

// NewCompetitionNoteHandler creates a new CompetitionNoteHandler.
func NewCompetitionNoteHandler() *CompetitionNoteHandler {
	return &CompetitionNoteHandler{}
}

// ListByCompetition handles GET /competitions/:id/notes — returns notes for a competition.
func (h *CompetitionNoteHandler) ListByCompetition(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	compID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || compID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事 ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	db.Model(&models.CompetitionNote{}).
		Where("user_id = ? AND competition_id = ?", userID, compID).
		Count(&total)

	var notes []models.CompetitionNote
	db.Where("user_id = ? AND competition_id = ?", userID, compID).
		Order("pinned DESC, updated_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&notes)

	c.JSON(http.StatusOK, gin.H{
		"items":     notes,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// ListMyNotes handles GET /notes — returns all notes for the current user.
func (h *CompetitionNoteHandler) ListMyNotes(c *gin.Context) {
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
	db.Model(&models.CompetitionNote{}).Where("user_id = ?", userID).Count(&total)

	var notes []models.CompetitionNote
	db.Preload("Competition").
		Where("user_id = ?", userID).
		Order("pinned DESC, updated_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&notes)

	c.JSON(http.StatusOK, gin.H{
		"items":     notes,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

type createNoteRequest struct {
	Title   string `json:"title" binding:"required,max=200"`
	Content string `json:"content" binding:"required"`
	Color   string `json:"color"`
	Pinned  *bool  `json:"pinned"`
}

// Create handles POST /competitions/:id/notes — creates a new note.
func (h *CompetitionNoteHandler) Create(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	compID, err := strconv.ParseUint(c.Param("id"), 10, 64)
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

	var req createNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "标题和内容不能为空"})
		return
	}

	color := req.Color
	if color == "" {
		color = "teal"
	}
	validColors := map[string]bool{"teal": true, "amber": true, "purple": true, "green": true, "red": true}
	if !validColors[color] {
		color = "teal"
	}

	pinned := false
	if req.Pinned != nil {
		pinned = *req.Pinned
	}

	note := models.CompetitionNote{
		UserID:        userID,
		CompetitionID: uint(compID),
		Title:         req.Title,
		Content:       req.Content,
		Color:         color,
		Pinned:        pinned,
	}
	if err := db.Create(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建笔记失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"note": note, "message": "笔记已创建"})
}

type updateNoteRequest struct {
	Title   *string `json:"title"`
	Content *string `json:"content"`
	Color   *string `json:"color"`
	Pinned  *bool   `json:"pinned"`
}

// Update handles PUT /notes/:id — updates a note.
func (h *CompetitionNoteHandler) Update(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	noteID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || noteID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的笔记 ID"})
		return
	}

	var note models.CompetitionNote
	if err := db.First(&note, noteID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在"})
		return
	}

	if note.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权修改他人的笔记"})
		return
	}

	var req updateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Content != nil {
		updates["content"] = *req.Content
	}
	if req.Color != nil {
		validColors := map[string]bool{"teal": true, "amber": true, "purple": true, "green": true, "red": true}
		if validColors[*req.Color] {
			updates["color"] = *req.Color
		}
	}
	if req.Pinned != nil {
		updates["pinned"] = *req.Pinned
	}

	if len(updates) > 0 {
		db.Model(&note).Updates(updates)
	}

	// Reload.
	db.First(&note, noteID)

	c.JSON(http.StatusOK, gin.H{"note": note, "message": "笔记已更新"})
}

// Delete handles DELETE /notes/:id — deletes a note.
func (h *CompetitionNoteHandler) Delete(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	noteID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || noteID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的笔记 ID"})
		return
	}

	var note models.CompetitionNote
	if err := db.First(&note, noteID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在"})
		return
	}

	if note.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权删除他人的笔记"})
		return
	}

	db.Delete(&note)
	c.JSON(http.StatusOK, gin.H{"message": "笔记已删除"})
}

// Get handles GET /notes/:id — returns a single note.
func (h *CompetitionNoteHandler) Get(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	noteID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || noteID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的笔记 ID"})
		return
	}

	var note models.CompetitionNote
	if err := db.First(&note, noteID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在"})
		return
	}

	if note.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权查看他人的笔记"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"note": note})
}
