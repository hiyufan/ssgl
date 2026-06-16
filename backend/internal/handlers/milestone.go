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

// MilestoneHandler handles milestone HTTP requests.
type MilestoneHandler struct{}

// NewMilestoneHandler creates a new MilestoneHandler.
func NewMilestoneHandler() *MilestoneHandler {
	return &MilestoneHandler{}
}

// CreateMilestoneRequest is the payload for creating a milestone.
type CreateMilestoneRequest struct {
	CompetitionID uint   `json:"competition_id" binding:"required"`
	Title         string `json:"title" binding:"required,max=256"`
	Description   string `json:"description"`
	Type          string `json:"type" binding:"omitempty,oneof=registration submission review defense award custom"`
	StartDate     string `json:"start_date"`
	DueDate       string `json:"due_date" binding:"required"`
	SortOrder     int    `json:"sort_order"`
}

// BatchMilestoneRequest is the payload for batch-creating milestones (no competition_id — from URL).
type BatchMilestoneRequest struct {
	Title       string `json:"title" binding:"required,max=256"`
	Description string `json:"description"`
	Type        string `json:"type" binding:"omitempty,oneof=registration submission review defense award custom"`
	StartDate   string `json:"start_date"`
	DueDate     string `json:"due_date" binding:"required"`
	SortOrder   int    `json:"sort_order"`
}

// UpdateMilestoneRequest is the payload for updating a milestone.
type UpdateMilestoneRequest struct {
	Title       string `json:"title" binding:"max=256"`
	Description string `json:"description"`
	Type        string `json:"type" binding:"omitempty,oneof=registration submission review defense award custom"`
	Status      string `json:"status" binding:"omitempty,oneof=pending in_progress completed skipped"`
	StartDate   string `json:"start_date"`
	DueDate     string `json:"due_date"`
	SortOrder   *int   `json:"sort_order"`
}

// List handles GET /competitions/:id/milestones — returns milestones for a competition.
func (h *MilestoneHandler) List(c *gin.Context) {
	db := database.GetDB()

	compID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	var milestones []models.Milestone
	query := db.Where("competition_id = ?", compID)

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by type
	if typ := c.Query("type"); typ != "" {
		query = query.Where("type = ?", typ)
	}

	if err := query.Order("sort_order ASC, due_date ASC").Find(&milestones).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch milestones"})
		return
	}

	// Compute progress stats
	total := len(milestones)
	completed := 0
	overdue := 0
	now := time.Now()
	for _, m := range milestones {
		if m.Status == models.MilestoneStatusCompleted {
			completed++
		}
		if m.Status == models.MilestoneStatusPending && m.DueDate.Before(now) {
			overdue++
		}
	}

	progress := 0.0
	if total > 0 {
		progress = float64(completed) / float64(total) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"milestones": milestones,
		"total":      total,
		"completed":  completed,
		"overdue":    overdue,
		"progress":   progress,
	})
}

// Get handles GET /milestones/:id.
func (h *MilestoneHandler) Get(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone id"})
		return
	}

	var milestone models.Milestone
	if err := db.Preload("Competition").First(&milestone, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "milestone not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch milestone"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"milestone": milestone})
}

// Create handles POST /milestones.
func (h *MilestoneHandler) Create(c *gin.Context) {
	db := database.GetDB()

	var req CreateMilestoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify competition exists
	var comp models.Competition
	if err := db.First(&comp, req.CompetitionID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "competition not found"})
		return
	}

	// Parse due date
	dueDate, err := parseTimeField(req.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid due_date format, use RFC3339"})
		return
	}

	// Parse optional start date
	var startDate time.Time
	if req.StartDate != "" {
		startDate, err = parseTimeField(req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format, use RFC3339"})
			return
		}
	}

	// Default type
	milestoneType := req.Type
	if milestoneType == "" {
		milestoneType = models.MilestoneTypeCustom
	}

	milestone := models.Milestone{
		CompetitionID: req.CompetitionID,
		Title:         req.Title,
		Description:   req.Description,
		Type:          milestoneType,
		Status:        models.MilestoneStatusPending,
		StartDate:     startDate,
		DueDate:       dueDate,
		SortOrder:     req.SortOrder,
	}

	if err := db.Create(&milestone).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create milestone"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"milestone": milestone})
}

// Update handles PUT /milestones/:id.
func (h *MilestoneHandler) Update(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone id"})
		return
	}

	var milestone models.Milestone
	if err := db.First(&milestone, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "milestone not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch milestone"})
		return
	}

	var req UpdateMilestoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Type != "" {
		updates["type"] = req.Type
	}
	if req.Status != "" {
		updates["status"] = req.Status
		// Auto-set completed_at when marking as completed
		if req.Status == models.MilestoneStatusCompleted {
			now := time.Now()
			updates["completed_at"] = &now
		} else if req.Status == models.MilestoneStatusPending {
			updates["completed_at"] = nil
		}
	}
	if req.StartDate != "" {
		t, err := parseTimeField(req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format"})
			return
		}
		updates["start_date"] = t
	}
	if req.DueDate != "" {
		t, err := parseTimeField(req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid due_date format"})
			return
		}
		updates["due_date"] = t
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	if err := db.Model(&milestone).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update milestone"})
		return
	}

	db.First(&milestone, milestone.ID)
	c.JSON(http.StatusOK, gin.H{"milestone": milestone})
}

// Delete handles DELETE /milestones/:id.
func (h *MilestoneHandler) Delete(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone id"})
		return
	}

	var milestone models.Milestone
	if err := db.First(&milestone, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "milestone not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch milestone"})
		return
	}

	if err := db.Delete(&milestone).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete milestone"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "milestone deleted"})
}

// BatchCreate handles POST /competitions/:id/milestones/batch — create multiple milestones at once.
func (h *MilestoneHandler) BatchCreate(c *gin.Context) {
	db := database.GetDB()

	compID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	// Verify competition exists
	var comp models.Competition
	if err := db.First(&comp, compID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	var reqs []BatchMilestoneRequest
	if err := c.ShouldBindJSON(&reqs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(reqs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no milestones provided"})
		return
	}

	var milestones []models.Milestone
	for i, req := range reqs {
		dueDate, err := parseTimeField(req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid due_date in item " + strconv.Itoa(i)})
			return
		}

		var startDate time.Time
		if req.StartDate != "" {
			startDate, err = parseTimeField(req.StartDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date in item " + strconv.Itoa(i)})
				return
			}
		}

		milestoneType := req.Type
		if milestoneType == "" {
			milestoneType = models.MilestoneTypeCustom
		}

		milestones = append(milestones, models.Milestone{
			CompetitionID: uint(compID),
			Title:         req.Title,
			Description:   req.Description,
			Type:          milestoneType,
			Status:        models.MilestoneStatusPending,
			StartDate:     startDate,
			DueDate:       dueDate,
			SortOrder:     req.SortOrder,
		})
	}

	if err := db.Create(&milestones).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create milestones"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"milestones": milestones,
		"total":      len(milestones),
	})
}
