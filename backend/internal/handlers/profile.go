package handlers

import (
	"net/http"
	"sort"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ProfileHandler handles user profile HTTP requests.
type ProfileHandler struct{}

// NewProfileHandler creates a new ProfileHandler.
func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{}
}

// UserProfile represents a user's profile with aggregated stats.
type UserProfile struct {
	ID           uint   `json:"id"`
	Username     string `json:"username"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	Dept         string `json:"dept"`
	StudentNo    string `json:"student_id"`
	Phone        string `json:"phone"`
	Avatar       string `json:"avatar"`
	CreatedAt    string `json:"created_at"`
	TeamCount    int64  `json:"team_count"`
	AwardCount   int64  `json:"award_count"`
	PrePlanCount int64  `json:"pre_plan_count"`
	CompCount    int64  `json:"competition_count"`
}

// UpdateProfileRequest holds fields a user can update on their own profile.
type UpdateProfileRequest struct {
	Name   *string `json:"name"`
	Email  *string `json:"email"`
	Phone  *string `json:"phone"`
	Dept   *string `json:"dept"`
	Avatar *string `json:"avatar"`
}

// GetProfile handles GET /users/profile/:id — returns a user's profile with stats.
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	profile := UserProfile{
		ID:        user.ID,
		Username:  user.Username,
		Name:      user.Name,
		Email:     user.Email,
		Role:      user.Role,
		Dept:      user.Dept,
		StudentNo: user.StudentNo,
		Phone:     user.Phone,
		Avatar:    user.Avatar,
		CreatedAt: user.CreatedAt.Format("2006-01-02"),
	}

	// Count team memberships
	db.Model(&models.TeamMember{}).Where("user_id = ?", user.ID).Count(&profile.TeamCount)

	// Count awards (through teams)
	db.Raw(`SELECT COUNT(DISTINCT a.id) FROM awards a
		INNER JOIN team_members tm ON tm.team_id = a.team_id
		WHERE tm.user_id = ?`, user.ID).Scan(&profile.AwardCount)

	// Count pre-plans (through teams)
	db.Raw(`SELECT COUNT(DISTINCT pp.id) FROM pre_plans pp
		INNER JOIN team_members tm ON tm.team_id = pp.team_id
		WHERE tm.user_id = ?`, user.ID).Scan(&profile.PrePlanCount)

	// Count competitions (through teams)
	db.Raw(`SELECT COUNT(DISTINCT t.competition_id) FROM teams t
		INNER JOIN team_members tm ON tm.team_id = t.id
		WHERE tm.user_id = ? AND t.deleted_at IS NULL`, user.ID).Scan(&profile.CompCount)

	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// GetMyProfile handles GET /users/profile/me — shortcut for current user's profile.
func (h *ProfileHandler) GetMyProfile(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	profile := UserProfile{
		ID:        user.ID,
		Username:  user.Username,
		Name:      user.Name,
		Email:     user.Email,
		Role:      user.Role,
		Dept:      user.Dept,
		StudentNo: user.StudentNo,
		Phone:     user.Phone,
		Avatar:    user.Avatar,
		CreatedAt: user.CreatedAt.Format("2006-01-02"),
	}

	// Count team memberships
	db.Model(&models.TeamMember{}).Where("user_id = ?", user.ID).Count(&profile.TeamCount)

	// Count awards (through teams)
	db.Raw(`SELECT COUNT(DISTINCT a.id) FROM awards a
		INNER JOIN team_members tm ON tm.team_id = a.team_id
		WHERE tm.user_id = ?`, user.ID).Scan(&profile.AwardCount)

	// Count pre-plans (through teams)
	db.Raw(`SELECT COUNT(DISTINCT pp.id) FROM pre_plans pp
		INNER JOIN team_members tm ON tm.team_id = pp.team_id
		WHERE tm.user_id = ?`, user.ID).Scan(&profile.PrePlanCount)

	// Count competitions (through teams)
	db.Raw(`SELECT COUNT(DISTINCT t.competition_id) FROM teams t
		INNER JOIN team_members tm ON tm.team_id = t.id
		WHERE tm.user_id = ? AND t.deleted_at IS NULL`, user.ID).Scan(&profile.CompCount)

	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// UpdateProfile handles PUT /users/profile — allows users to update their own profile.
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Update only provided fields
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Email != nil {
		// Check email uniqueness
		var count int64
		db.Model(&models.User{}).Where("email = ? AND id != ?", *req.Email, userID).Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email already in use"})
			return
		}
		updates["email"] = *req.Email
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Dept != nil {
		updates["dept"] = *req.Dept
	}
	if req.Avatar != nil {
		updates["avatar"] = *req.Avatar
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	if err := db.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	// Reload user
	db.First(&user, userID)

	c.JSON(http.StatusOK, gin.H{
		"message": "profile updated",
		"user": gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"name":       user.Name,
			"email":      user.Email,
			"role":       user.Role,
			"dept":       user.Dept,
			"student_id": user.StudentNo,
			"phone":      user.Phone,
			"avatar":     user.Avatar,
		},
	})
}

// ListUsers handles GET /users — returns a list of users (for search/lookup).
func (h *ProfileHandler) ListUsers(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	query := c.Query("q")
	role := c.Query("role")

	var users []models.User
	tx := db.Model(&models.User{})
	if query != "" {
		tx = tx.Where("name ILIKE ? OR username ILIKE ?", "%"+query+"%", "%"+query+"%")
	}
	if role != "" {
		tx = tx.Where("role = ?", role)
	}
	tx.Order("id ASC").Limit(50).Find(&users)

	type UserSummary struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Name     string `json:"name"`
		Role     string `json:"role"`
		Dept     string `json:"dept"`
		Avatar   string `json:"avatar"`
	}

	result := make([]UserSummary, len(users))
	for i, u := range users {
		result[i] = UserSummary{
			ID:       u.ID,
			Username: u.Username,
			Name:     u.Name,
			Role:     u.Role,
			Dept:     u.Dept,
			Avatar:   u.Avatar,
		}
	}

	c.JSON(http.StatusOK, gin.H{"users": result, "total": len(result)})
}

// UserActivityItem represents an activity event for a specific user.
type UserActivityItem struct {
	ID        uint   `json:"id"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Detail    string `json:"detail"`
	CreatedAt string `json:"created_at"`
}

// MyActivity handles GET /users/me/activity — returns the current user's recent activity.
func (h *ProfileHandler) MyActivity(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	limit := 15
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 && l <= 50 {
		limit = l
	}

	var activities []UserActivityItem

	// Get user's team IDs
	var teamMembers []models.TeamMember
	db.Where("user_id = ?", userID).Find(&teamMembers)
	teamIDs := make([]uint, 0, len(teamMembers))
	for _, tm := range teamMembers {
		teamIDs = append(teamIDs, tm.TeamID)
	}

	// Teams the user is in
	if len(teamIDs) > 0 {
		var teams []models.Team
		db.Preload("Competition").Where("id IN ?", teamIDs).Order("created_at DESC").Limit(limit).Find(&teams)
		for _, team := range teams {
			compTitle := ""
			if team.Competition.ID > 0 {
				compTitle = team.Competition.Title
			}
			activities = append(activities, UserActivityItem{
				ID:        team.ID,
				Type:      "team",
				Title:     "加入团队: " + team.Name,
				Detail:    "赛事: " + compTitle,
				CreatedAt: team.CreatedAt.Format("2006-01-02 15:04"),
			})
		}

		// Pre-plans from user's teams
		var preplans []models.PrePlan
		db.Where("team_id IN ?", teamIDs).Order("created_at DESC").Limit(limit).Find(&preplans)
		for _, pp := range preplans {
			activities = append(activities, UserActivityItem{
				ID:        pp.ID,
				Type:      "preplan",
				Title:     "提交预案: " + pp.Title,
				Detail:    "状态: " + pp.Status,
				CreatedAt: pp.CreatedAt.Format("2006-01-02 15:04"),
			})
		}

		// Awards from user's teams
		var awards []models.Award
		db.Where("team_id IN ?", teamIDs).Order("created_at DESC").Limit(limit).Find(&awards)
		for _, award := range awards {
			activities = append(activities, UserActivityItem{
				ID:    award.ID,
				Type:  "award",
				Title: "获得奖项: " + award.PrizeName,
				Detail: award.RankName + ", 奖金: ¥" + strconv.FormatFloat(award.PrizeAmount, 'f', 0, 64),
				CreatedAt: award.CreatedAt.Format("2006-01-02 15:04"),
			})
		}
	}

	// Evaluations received
	var evals []models.StudentEvaluation
	db.Where("student_id = ?", userID).Order("created_at DESC").Limit(limit).Find(&evals)
	for _, ev := range evals {
		activities = append(activities, UserActivityItem{
			ID:        ev.ID,
			Type:      "evaluation",
			Title:     "收到评价",
			Detail:    "综合评分: " + strconv.Itoa(ev.Overall) + "/5",
			CreatedAt: ev.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	// Sort by CreatedAt descending
	sort.Slice(activities, func(i, j int) bool {
		return activities[i].CreatedAt > activities[j].CreatedAt
	})

	if len(activities) > limit {
		activities = activities[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
		"total":      len(activities),
	})
}
