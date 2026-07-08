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

// TeamHandler handles team HTTP requests.
type TeamHandler struct{}

// NewTeamHandler creates a new TeamHandler.
func NewTeamHandler() *TeamHandler {
	return &TeamHandler{}
}

// CreateTeamRequest is the payload for creating a team.
type CreateTeamRequest struct {
	Name           string `json:"name" binding:"required,max=128"`
	CompetitionID  uint   `json:"competition_id" binding:"required"`
	GuideTeacherID *uint  `json:"guide_teacher_id"`
}

// List handles GET /teams — filtered by role and optional competition_id.
func (h *TeamHandler) List(c *gin.Context) {
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

	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	query := db.Model(&models.Team{}).
		Preload("Competition").
		Preload("Leader").
		Preload("Members.User")

	// Filter by competition_id if provided.
	if compID := c.Query("comp_id"); compID != "" {
		query = query.Where("competition_id = ?", compID)
	}

	// Filter by role.
	switch role {
	case models.RoleStudent:
		// Students see only teams they are a member of.
		query = query.Joins("INNER JOIN team_members ON team_members.team_id = teams.id").
			Where("team_members.user_id = ?", userID)
	case models.RoleTeacher:
		// Teachers see teams in competitions they organize.
		query = query.Joins("INNER JOIN competitions ON competitions.id = teams.competition_id").
			Where("competitions.organizer_id = ?", userID)
	case models.RoleAdmin:
		// Admins see all teams — no additional filter.
	}

	// Count total matching records.
	var total int64
	query.Count(&total)

	// Fetch paginated results.
	var teams []models.Team
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teams"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"teams":     teams,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Get handles GET /teams/:id with all preloads.
func (h *TeamHandler) Get(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	var team models.Team
	if err := db.Preload("Competition").Preload("Leader").Preload("GuideTeacher").Preload("Members.User").First(&team, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"team": team})
}

// Create handles POST /teams — creates a team and adds the leader as the first member.
func (h *TeamHandler) Create(c *gin.Context) {
	db := database.GetDB()

	var req CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	// Verify the competition exists.
	var competition models.Competition
	if err := db.First(&competition, req.CompetitionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "competition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competition"})
		return
	}

	// Check the user doesn't already have a team for this competition.
	var existingCount int64
	db.Model(&models.TeamMember{}).
		Joins("INNER JOIN teams ON teams.id = team_members.team_id").
		Where("team_members.user_id = ? AND teams.competition_id = ?", uid, req.CompetitionID).
		Count(&existingCount)
	if existingCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you already have a team for this competition"})
		return
	}

	// Create team and add leader as member in a transaction.
	team := models.Team{
		Name:            req.Name,
		CompetitionID:   req.CompetitionID,
		LeaderID:        uid,
		GuideTeacherID:  req.GuideTeacherID,
		Status:          models.TeamStatusActive,
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&team).Error; err != nil {
			return err
		}

		member := models.TeamMember{
			TeamID:   team.ID,
			UserID:   uid,
			Role:     models.TeamMemberRoleLeader,
			JoinedAt: time.Now(),
		}
		if err := tx.Create(&member).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create team"})
		return
	}

	// Reload with all relations.
	db.Preload("Competition").Preload("Leader").Preload("GuideTeacher").Preload("Members.User").First(&team, team.ID)

	c.JSON(http.StatusCreated, gin.H{"team": team})
}

// Join handles POST /teams/:id/join — adds the authenticated user as a team member.
func (h *TeamHandler) Join(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var team models.Team
	if err := db.First(&team, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team"})
		return
	}

	// Check user is not already a member.
	var existingCount int64
	db.Model(&models.TeamMember{}).Where("team_id = ? AND user_id = ?", team.ID, uid).Count(&existingCount)
	if existingCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you are already a member of this team"})
		return
	}

	// Check team size against the competition's max_team_size.
	var memberCount int64
	db.Model(&models.TeamMember{}).Where("team_id = ?", team.ID).Count(&memberCount)

	var competition models.Competition
	db.First(&competition, team.CompetitionID)
	if int(memberCount) >= competition.MaxTeamSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "team is full"})
		return
	}

	member := models.TeamMember{
		TeamID:   team.ID,
		UserID:   uid,
		Role:     models.TeamMemberRoleMember,
		JoinedAt: time.Now(),
	}
	if err := db.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join team"})
		return
	}

	// Reload team with relations.
	db.Preload("Competition").Preload("Leader").Preload("GuideTeacher").Preload("Members.User").First(&team, team.ID)

	c.JSON(http.StatusOK, gin.H{"team": team})
}

// Leave handles POST /teams/:id/leave — removes the authenticated user from the team.
func (h *TeamHandler) Leave(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var team models.Team
	if err := db.First(&team, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team"})
		return
	}

	// Leaders cannot leave — they must transfer leadership first.
	if team.LeaderID == uid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "team leader cannot leave; transfer leadership first"})
		return
	}

	result := db.Where("team_id = ? AND user_id = ?", team.ID, uid).Delete(&models.TeamMember{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to leave team"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you are not a member of this team"})
		return
	}

	// Reload team with relations.
	db.Preload("Competition").Preload("Leader").Preload("GuideTeacher").Preload("Members.User").First(&team, team.ID)

	c.JSON(http.StatusOK, gin.H{"team": team})
}

// UpdateTeamRequest is the payload for updating a team.
type UpdateTeamRequest struct {
	Name *string `json:"name"`
}

// Update handles PUT /teams/:id — updates team name (leader or admin only).
func (h *TeamHandler) Update(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	var team models.Team
	if err := db.First(&team, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team"})
		return
	}

	var req UpdateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}

	if len(updates) > 0 {
		if err := db.Model(&team).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update team"})
			return
		}
	}

	db.Preload("Competition").Preload("Leader").Preload("GuideTeacher").Preload("Members.User").First(&team, team.ID)
	c.JSON(http.StatusOK, gin.H{"team": team})
}

// Delete handles DELETE /teams/:id — soft-deletes a team (leader or admin only).
func (h *TeamHandler) Delete(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	var team models.Team
	if err := db.First(&team, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team"})
		return
	}

	// Delete team members first, then the team.
	db.Where("team_id = ?", team.ID).Delete(&models.TeamMember{})
	if err := db.Delete(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete team"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "team deleted"})
}
