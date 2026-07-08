package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
	"gorm.io/gorm"
)

// AwardHandler handles award HTTP requests.
type AwardHandler struct {
	WorkflowService *services.WorkflowService
}

// NewAwardHandler creates a new AwardHandler.
func NewAwardHandler() *AwardHandler {
	return &AwardHandler{WorkflowService: services.NewWorkflowService()}
}

// CreateAwardRequest is the payload for creating/nominating an award.
type CreateAwardRequest struct {
	CompetitionID uint    `json:"competition_id" binding:"required"`
	TeamID        uint    `json:"team_id" binding:"required"`
	Rank          int     `json:"rank" binding:"min=1"`
	RankName      string  `json:"rank_name"`
	PrizeName     string  `json:"prize_name"`
	PrizeAmount   float64 `json:"prize_amount"`
	FinalScore    float64 `json:"final_score" binding:"omitempty,min=0,max=100"`
}

// UpdateAwardRequest is the payload for updating an award.
type UpdateAwardRequest struct {
	Rank        *int     `json:"rank" binding:"omitempty,min=1"`
	RankName    string   `json:"rank_name"`
	PrizeName   string   `json:"prize_name"`
	PrizeAmount *float64 `json:"prize_amount" binding:"omitempty,min=0"`
	FinalScore  *float64 `json:"final_score" binding:"omitempty,min=0,max=100"`
}

// SettleAwardRequest is the payload for settling an award.
type SettleAwardRequest struct {
	PrizeAmount float64 `json:"prize_amount" binding:"min=0"`
	FinalScore  float64 `json:"final_score" binding:"omitempty,min=0,max=100"`
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

// Create handles POST /awards — nominate a team for an award.
func (h *AwardHandler) Create(c *gin.Context) {
	db := database.GetDB()

	var req CreateAwardRequest
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

	// Verify team exists
	var team models.Team
	if err := db.First(&team, req.TeamID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "team not found"})
		return
	}

	now := time.Now()
	award := models.Award{
		CompetitionID: req.CompetitionID,
		TeamID:        req.TeamID,
		Rank:          req.Rank,
		RankName:      req.RankName,
		PrizeName:     req.PrizeName,
		PrizeAmount:   req.PrizeAmount,
		FinalScore:    req.FinalScore,
		Status:        models.AwardStatusPending,
		NominatedAt:   now,
	}

	if err := db.Create(&award).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create award"})
		return
	}

	approvers := []uint{comp.OrganizerID}
	if adminID, ok := firstAdminID(db); ok {
		approvers = append(approvers, adminID)
	}
	if err := createApprovalWorkflow(h.WorkflowService, services.CreateWorkflowInput{
		Type:        models.WorkflowTypeReward,
		TargetID:    award.ID,
		SubmitterID: currentUserIDOr(c, comp.OrganizerID),
		ApproverIDs: uniqueApprovers(approvers...),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create approval workflow"})
		return
	}

	db.Preload("Competition").Preload("Team").First(&award, award.ID)
	c.JSON(http.StatusCreated, gin.H{"award": award})
}

// Get handles GET /awards/:id.
func (h *AwardHandler) Get(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid award id"})
		return
	}

	var award models.Award
	if err := db.Preload("Competition").Preload("Team").First(&award, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "award not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch award"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"award": award})
}

// Update handles PUT /awards/:id — edit award details (pending status only).
func (h *AwardHandler) Update(c *gin.Context) {
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

	if award.Status != models.AwardStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only edit pending awards"})
		return
	}

	var req UpdateAwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Rank != nil {
		updates["rank"] = *req.Rank
	}
	if req.RankName != "" {
		updates["rank_name"] = req.RankName
	}
	if req.PrizeName != "" {
		updates["prize_name"] = req.PrizeName
	}
	if req.PrizeAmount != nil {
		updates["prize_amount"] = *req.PrizeAmount
	}
	if req.FinalScore != nil {
		updates["final_score"] = *req.FinalScore
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	if err := db.Model(&award).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update award"})
		return
	}

	db.Preload("Competition").Preload("Team").First(&award, award.ID)
	c.JSON(http.StatusOK, gin.H{"award": award})
}

// Delete handles DELETE /awards/:id — soft delete (pending status only).
func (h *AwardHandler) Delete(c *gin.Context) {
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

	if award.Status != models.AwardStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only delete pending awards"})
		return
	}

	if err := db.Delete(&award).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete award"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "award deleted"})
}

// TeacherConfirm handles POST /awards/:id/teacher-confirm — teacher confirms a pending award.
func (h *AwardHandler) TeacherConfirm(c *gin.Context) {
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

	if award.Status != models.AwardStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "award is not in pending status"})
		return
	}

	if err := db.Model(&award).Update("status", models.AwardStatusTeacherConfirm).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to confirm award"})
		return
	}

	db.Preload("Competition").Preload("Team").First(&award, award.ID)
	c.JSON(http.StatusOK, gin.H{"award": award, "action": "teacher_confirm"})
}

// Settle handles POST /awards/:id/settle — marks an award as settled.
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
	if req.FinalScore > 0 {
		updates["final_score"] = req.FinalScore
	}

	if err := db.Model(&award).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to settle award"})
		return
	}

	db.Preload("Competition").Preload("Team").First(&award, award.ID)

	c.JSON(http.StatusOK, gin.H{"award": award})
}
