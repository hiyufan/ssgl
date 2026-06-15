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

// PrePlanHandler handles pre-plan HTTP requests.
type PrePlanHandler struct{}

// NewPrePlanHandler creates a new PrePlanHandler.
func NewPrePlanHandler() *PrePlanHandler {
	return &PrePlanHandler{}
}

// CreatePrePlanRequest is the payload for creating a pre-plan.
type CreatePrePlanRequest struct {
	CompetitionID   uint   `json:"competition_id" binding:"required"`
	TeamID          uint   `json:"team_id" binding:"required"`
	Title           string `json:"title" binding:"required,max=256"`
	TechStack       string `json:"tech_stack"`
	TargetAudience  string `json:"target_audience"`
	MarketAnalysis  string `json:"market_analysis"`
	Innovation      string `json:"innovation"`
	ExpectedOutcome string `json:"expected_outcome"`
	Timeline        string `json:"timeline"`
}

// UpdatePrePlanRequest is the payload for updating a pre-plan.
type UpdatePrePlanRequest struct {
	Title           *string `json:"title"`
	TechStack       *string `json:"tech_stack"`
	TargetAudience  *string `json:"target_audience"`
	MarketAnalysis  *string `json:"market_analysis"`
	Innovation      *string `json:"innovation"`
	ExpectedOutcome *string `json:"expected_outcome"`
	Timeline        *string `json:"timeline"`
	Status          *string `json:"status"`
}

// List handles GET /preplans with optional competition_id, team_id, and status filters.
func (h *PrePlanHandler) List(c *gin.Context) {
	db := database.GetDB()

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := db.Model(&models.PrePlan{}).Preload("Competition").Preload("Team")

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

	var preplans []models.PrePlan
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&preplans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch pre-plans"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"pre_plans": preplans,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Get handles GET /preplans/:id.
func (h *PrePlanHandler) Get(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pre-plan id"})
		return
	}

	var preplan models.PrePlan
	if err := db.Preload("Competition").Preload("Team").First(&preplan, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "pre-plan not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch pre-plan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"pre_plan": preplan})
}

// Create handles POST /preplans.
func (h *PrePlanHandler) Create(c *gin.Context) {
	db := database.GetDB()

	var req CreatePrePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	preplan := models.PrePlan{
		CompetitionID:   req.CompetitionID,
		TeamID:          req.TeamID,
		Title:           req.Title,
		TechStack:       req.TechStack,
		TargetAudience:  req.TargetAudience,
		MarketAnalysis:  req.MarketAnalysis,
		Innovation:      req.Innovation,
		ExpectedOutcome: req.ExpectedOutcome,
		Timeline:        req.Timeline,
		Status:          models.PrePlanStatusSubmitted,
		SubmittedAt:     &now,
	}

	if err := db.Create(&preplan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create pre-plan"})
		return
	}

	db.Preload("Competition").Preload("Team").First(&preplan, preplan.ID)

	c.JSON(http.StatusCreated, gin.H{"pre_plan": preplan})
}

// Update handles PUT /pre-plans/:id.
func (h *PrePlanHandler) Update(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pre-plan id"})
		return
	}

	var preplan models.PrePlan
	if err := db.First(&preplan, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "pre-plan not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch pre-plan"})
		return
	}

	var req UpdatePrePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.TechStack != nil {
		updates["tech_stack"] = *req.TechStack
	}
	if req.TargetAudience != nil {
		updates["target_audience"] = *req.TargetAudience
	}
	if req.MarketAnalysis != nil {
		updates["market_analysis"] = *req.MarketAnalysis
	}
	if req.Innovation != nil {
		updates["innovation"] = *req.Innovation
	}
	if req.ExpectedOutcome != nil {
		updates["expected_outcome"] = *req.ExpectedOutcome
	}
	if req.Timeline != nil {
		updates["timeline"] = *req.Timeline
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if len(updates) > 0 {
		if err := db.Model(&preplan).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update pre-plan"})
			return
		}
	}

	db.Preload("Competition").Preload("Team").First(&preplan, preplan.ID)
	c.JSON(http.StatusOK, gin.H{"pre_plan": preplan})
}
