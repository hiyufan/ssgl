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

// CompetitionHandler handles competition HTTP requests.
type CompetitionHandler struct{}

// NewCompetitionHandler creates a new CompetitionHandler.
func NewCompetitionHandler() *CompetitionHandler {
	return &CompetitionHandler{}
}

// CreateCompetitionRequest is the payload for creating a competition.
type CreateCompetitionRequest struct {
	Title                string `json:"title" binding:"required,max=256"`
	Description          string `json:"description"`
	Type                 string `json:"type" binding:"required,oneof=hackathon innovation research"`
	MaxTeamSize          int    `json:"max_team_size" binding:"required,min=1"`
	MinTeamSize          int    `json:"min_team_size" binding:"required,min=1"`
	RegistrationDeadline string `json:"registration_deadline"`
	StartDate            string `json:"start_date" binding:"required"`
	EndDate              string `json:"end_date" binding:"required"`
	Location             string `json:"location" binding:"max=256"`
	RulesDocURL          string `json:"rules_doc_url" binding:"max=512"`
	Prize                string `json:"prize" binding:"max=256"`
	Tags                 string `json:"tags" binding:"max=512"`
}

// UpdateCompetitionRequest is the payload for updating a competition.
type UpdateCompetitionRequest struct {
	Title                string `json:"title" binding:"max=256"`
	Description          string `json:"description"`
	Type                 string `json:"type" binding:"omitempty,oneof=hackathon innovation research"`
	MaxTeamSize          int    `json:"max_team_size" binding:"min=1"`
	MinTeamSize          int    `json:"min_team_size" binding:"min=1"`
	RegistrationDeadline string `json:"registration_deadline"`
	StartDate            string `json:"start_date"`
	EndDate              string `json:"end_date"`
	Location             string `json:"location" binding:"max=256"`
	RulesDocURL          string `json:"rules_doc_url" binding:"max=512"`
	Prize                string `json:"prize" binding:"max=256"`
	Tags                 string `json:"tags" binding:"max=512"`
}

// List handles GET /competitions with filtering, search, and pagination.
func (h *CompetitionHandler) List(c *gin.Context) {
	db := database.GetDB()

	// Parse pagination params.
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := db.Model(&models.Competition{}).Preload("Organizer")

	// Filter by status.
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Search by title.
	if search := c.Query("search"); search != "" {
		query = query.Where("title ILIKE ?", "%"+search+"%")
	}

	// Count total matching records.
	var total int64
	query.Count(&total)

	// Fetch paginated results.
	var competitions []models.Competition
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"competitions": competitions,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
	})
}

// Get handles GET /competitions/:id.
func (h *CompetitionHandler) Get(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	var competition models.Competition
	if err := db.Preload("Organizer").First(&competition, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competition"})
		return
	}

	// Count teams registered for this competition.
	var teamCount int64
	db.Table("teams").Where("competition_id = ?", id).Count(&teamCount)

	c.JSON(http.StatusOK, gin.H{
		"competition": competition,
		"team_count":  teamCount,
	})
}

// Create handles POST /competitions.
func (h *CompetitionHandler) Create(c *gin.Context) {
	db := database.GetDB()

	var req CreateCompetitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get organizer ID from authenticated user context.
	organizerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Parse time fields.
	startDate, err := parseTimeField(req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format, use RFC3339"})
		return
	}
	endDate, err := parseTimeField(req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format, use RFC3339"})
		return
	}
	var regDeadline *time.Time
	if req.RegistrationDeadline != "" {
		t, err := parseTimeField(req.RegistrationDeadline)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid registration_deadline format, use RFC3339"})
			return
		}
		regDeadline = &t
	}

	competition := models.Competition{
		Title:       req.Title,
		Description: req.Description,
		Type:        req.Type,
		Status:      models.CompStatusDraft,
		MaxTeamSize: req.MaxTeamSize,
		MinTeamSize: req.MinTeamSize,
		StartDate:   startDate,
		EndDate:     endDate,
		Location:    req.Location,
		OrganizerID: organizerID.(uint),
		RulesDocURL: req.RulesDocURL,
		Prize:       req.Prize,
		Tags:        req.Tags,
	}
	if regDeadline != nil {
		competition.RegistrationDeadline = *regDeadline
	}

	if err := db.Create(&competition).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create competition"})
		return
	}

	// Reload with Organizer relation.
	db.Preload("Organizer").First(&competition, competition.ID)

	c.JSON(http.StatusCreated, gin.H{"competition": competition})
}

// Update handles PUT /competitions/:id.
func (h *CompetitionHandler) Update(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	var competition models.Competition
	if err := db.First(&competition, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competition"})
		return
	}

	if !canManageCompetition(c, competition.OrganizerID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only modify your own competitions"})
		return
	}

	var req UpdateCompetitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build updates map for non-zero fields.
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
	if req.MaxTeamSize > 0 {
		updates["max_team_size"] = req.MaxTeamSize
	}
	if req.MinTeamSize > 0 {
		updates["min_team_size"] = req.MinTeamSize
	}
	if req.StartDate != "" {
		t, err := parseTimeField(req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format"})
			return
		}
		updates["start_date"] = t
	}
	if req.EndDate != "" {
		t, err := parseTimeField(req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format"})
			return
		}
		updates["end_date"] = t
	}
	if req.RegistrationDeadline != "" {
		t, err := parseTimeField(req.RegistrationDeadline)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid registration_deadline format"})
			return
		}
		updates["registration_deadline"] = t
	}
	if req.Location != "" {
		updates["location"] = req.Location
	}
	if req.RulesDocURL != "" {
		updates["rules_doc_url"] = req.RulesDocURL
	}
	if req.Prize != "" {
		updates["prize"] = req.Prize
	}
	if req.Tags != "" {
		updates["tags"] = req.Tags
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	if err := db.Model(&competition).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update competition"})
		return
	}

	// Reload with Organizer relation.
	db.Preload("Organizer").First(&competition, competition.ID)

	c.JSON(http.StatusOK, gin.H{"competition": competition})
}

// Delete handles DELETE /competitions/:id (soft delete).
func (h *CompetitionHandler) Delete(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	var competition models.Competition
	if err := db.First(&competition, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competition"})
		return
	}

	if !canManageCompetition(c, competition.OrganizerID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own competitions"})
		return
	}

	if err := db.Delete(&competition).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete competition"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "competition deleted"})
}

// Publish handles PATCH /competitions/:id/publish — changes status from draft to published.
func (h *CompetitionHandler) Publish(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	var competition models.Competition
	if err := db.First(&competition, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competition"})
		return
	}

	if !canManageCompetition(c, competition.OrganizerID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only publish your own competitions"})
		return
	}

	if competition.Status != models.CompStatusDraft {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only draft competitions can be published"})
		return
	}

	if err := db.Model(&competition).Update("status", models.CompStatusPublished).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to publish competition"})
		return
	}

	competition.Status = models.CompStatusPublished
	db.Preload("Organizer").First(&competition, competition.ID)

	c.JSON(http.StatusOK, gin.H{"competition": competition})
}

// parseTimeField parses an RFC3339 time string.
func parseTimeField(s string) (time.Time, error) {
	return time.Parse(time.RFC3339, s)
}

// canManageCompetition reports whether the current user may modify a competition
// owned by organizerID. Admins may manage any competition; other staff may only
// manage their own.
func canManageCompetition(c *gin.Context, organizerID uint) bool {
	if role, _ := c.Get("role"); role == models.RoleAdmin {
		return true
	}
	uid, exists := c.Get("user_id")
	if !exists {
		return false
	}
	id, ok := uid.(uint)
	return ok && id == organizerID
}
