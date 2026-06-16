package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
	"gorm.io/gorm"
)

// PrePlanHandler handles pre-plan HTTP requests.
type PrePlanHandler struct {
	AIClient *services.AIServiceClient
}

// NewPrePlanHandler creates a new PrePlanHandler.
func NewPrePlanHandler(aiClient *services.AIServiceClient) *PrePlanHandler {
	return &PrePlanHandler{AIClient: aiClient}
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

// AIReview handles POST /pre-plans/:id/review — triggers AI review and saves results.
func (h *PrePlanHandler) AIReview(c *gin.Context) {
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

	if h.AIClient == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service not configured"})
		return
	}

	// Build plan data for the AI review service
	planData := map[string]interface{}{
		"title":            preplan.Title,
		"tech_stack":       preplan.TechStack,
		"target_audience":  preplan.TargetAudience,
		"market_analysis":  preplan.MarketAnalysis,
		"innovation":       preplan.Innovation,
		"expected_outcome": preplan.ExpectedOutcome,
		"timeline":         preplan.Timeline,
	}

	result, err := h.AIClient.ReviewPrePlan(planData)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI review failed", "details": err.Error()})
		return
	}

	// Extract score from result
	var score *int
	if s, ok := result["score"].(float64); ok {
		intScore := int(s)
		score = &intScore
	}

	// Marshal notes (full review JSON)
	notesBytes, _ := json.Marshal(result)
	notes := string(notesBytes)

	// Update preplan with AI review results
	updates := map[string]interface{}{
		"ai_review_score": score,
		"ai_review_notes": notes,
		"status":          models.PrePlanStatusReviewed,
	}
	if err := db.Model(&preplan).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save AI review"})
		return
	}

	db.Preload("Competition").Preload("Team").First(&preplan, preplan.ID)
	c.JSON(http.StatusOK, gin.H{"pre_plan": preplan, "review": result})
}

// TeacherReview handles POST /pre-plans/:id/teacher-review — teacher approves or rejects a preplan.
func (h *PrePlanHandler) TeacherReview(c *gin.Context) {
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

	var req struct {
		Action string `json:"action" binding:"required,oneof=approve reject"`
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newStatus := models.PrePlanStatusApproved
	if req.Action == "reject" {
		newStatus = models.PrePlanStatusRejected
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":      newStatus,
		"updated_at":  now,
	}
	if req.Notes != "" {
		// Preserve existing AI review notes and append teacher notes
		teacherNotes := map[string]interface{}{
			"teacher_action": req.Action,
			"teacher_notes":  req.Notes,
			"reviewed_at":    now.Format(time.RFC3339),
		}
		notesBytes, _ := json.Marshal(teacherNotes)
		updates["ai_review_notes"] = preplan.AIReviewNotes + "\n---\n" + string(notesBytes)
	}

	if err := db.Model(&preplan).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update pre-plan"})
		return
	}

	db.Preload("Competition").Preload("Team").First(&preplan, preplan.ID)
	c.JSON(http.StatusOK, gin.H{"pre_plan": preplan, "action": req.Action})
}

// Delete handles DELETE /pre-plans/:id — soft deletes a pre-plan.
func (h *PrePlanHandler) Delete(c *gin.Context) {
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

	if err := db.Delete(&preplan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete pre-plan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "pre-plan deleted"})
}
