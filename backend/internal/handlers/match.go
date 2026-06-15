package handlers

import (
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// MatchHandler handles teammate matching HTTP requests.
type MatchHandler struct{}

// NewMatchHandler creates a new MatchHandler.
func NewMatchHandler() *MatchHandler {
	return &MatchHandler{}
}

// MatchResult holds a potential teammate's profile and match score.
type MatchResult struct {
	UserID       uint    `json:"user_id"`
	Username     string  `json:"username"`
	Name         string  `json:"name"`
	Dept         string  `json:"dept"`
	Avatar       string  `json:"avatar"`
	TeamCount    int64   `json:"team_count"`
	AwardCount   int64   `json:"award_count"`
	PrePlanCount int64   `json:"pre_plan_count"`
	MatchScore   float64 `json:"match_score"`
	Reason       string  `json:"reason"`
}

// Match handles GET /teams/match — recommends potential teammates for a competition.
// Query params: competition_id (required), limit (optional, default 10)
func (h *MatchHandler) Match(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	// Get current user ID from context (set by auth middleware).
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	currentUserID := userIDVal.(uint)

	// Parse competition_id
	compID := c.Query("competition_id")
	if compID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "competition_id is required"})
		return
	}

	// Get students already in teams for this competition
	var busyUserIDs []uint
	db.Raw(`SELECT DISTINCT tm.user_id FROM team_members tm
		INNER JOIN teams t ON t.id = tm.team_id
		WHERE t.competition_id = ? AND t.deleted_at IS NULL`, compID).Scan(&busyUserIDs)

	// Build exclusion set (busy users + current user)
	excludeMap := make(map[uint]bool)
	excludeMap[currentUserID] = true
	for _, uid := range busyUserIDs {
		excludeMap[uid] = true
	}

	// Find available students
	var students []models.User
	db.Where("role = ? AND status = ?", models.RoleStudent, models.StatusActive).Find(&students)

	// Filter out excluded users
	available := make([]models.User, 0)
	for _, s := range students {
		if !excludeMap[s.ID] {
			available = append(available, s)
		}
	}

	// Score each available student
	results := make([]MatchResult, 0, len(available))
	for _, s := range available {
		// Count team memberships
		var teamCount int64
		db.Model(&models.TeamMember{}).Where("user_id = ?", s.ID).Count(&teamCount)

		// Count awards (through teams)
		var awardCount int64
		db.Raw(`SELECT COUNT(DISTINCT a.id) FROM awards a
			INNER JOIN team_members tm ON tm.team_id = a.team_id
			WHERE tm.user_id = ?`, s.ID).Scan(&awardCount)

		// Count pre-plans (through teams)
		var prePlanCount int64
		db.Raw(`SELECT COUNT(DISTINCT pp.id) FROM pre_plans pp
			INNER JOIN team_members tm ON tm.team_id = pp.team_id
			WHERE tm.user_id = ?`, s.ID).Scan(&prePlanCount)

		// Calculate match score:
		// - Experience (team memberships): up to 30 points
		// - Awards: up to 40 points
		// - Pre-plans (shows planning ability): up to 30 points
		// Total: 0-100
		score := float64(teamCount)*10 + float64(awardCount)*15 + float64(prePlanCount)*8
		if score > 100 {
			score = 100
		}

		// Generate reason
		reason := "available student"
		if awardCount > 0 {
			reason = "experienced competitor with awards"
		} else if prePlanCount > 0 {
			reason = "active planner with pre-plan experience"
		} else if teamCount > 0 {
			reason = "team experience"
		}

		results = append(results, MatchResult{
			UserID:       s.ID,
			Username:     s.Username,
			Name:         s.Name,
			Dept:         s.Dept,
			Avatar:       s.Avatar,
			TeamCount:    teamCount,
			AwardCount:   awardCount,
			PrePlanCount: prePlanCount,
			MatchScore:   score,
			Reason:       reason,
		})
	}

	// Sort by match score descending
	sort.Slice(results, func(i, j int) bool {
		return results[i].MatchScore > results[j].MatchScore
	})

	// Limit results
	limit := 10
	if l := c.Query("limit"); l != "" {
		if parsed, err := parseInt(l); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}
	if len(results) > limit {
		results = results[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"matches":       results,
		"total":         len(results),
		"competition_id": compID,
	})
}

// parseInt is a simple int parser helper.
func parseInt(s string) (int, error) {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, nil
		}
		n = n*10 + int(c-'0')
	}
	return n, nil
}
