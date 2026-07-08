package handlers

import (
	"net/http"

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

	// Limit results
	limit := 10
	if l := c.Query("limit"); l != "" {
		if parsed, err := parseInt(l); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}

	var results []MatchResult
	if err := db.Raw(`
		WITH busy_users AS (
			SELECT DISTINCT tm.user_id
			FROM team_members tm
			INNER JOIN teams t ON t.id = tm.team_id
			WHERE t.competition_id = ? AND t.deleted_at IS NULL
		),
		available_students AS (
			SELECT u.id AS user_id, u.username, u.name, u.dept, u.avatar
			FROM users u
			WHERE u.role = ?
				AND u.status = ?
				AND u.deleted_at IS NULL
				AND u.id <> ?
				AND NOT EXISTS (
					SELECT 1 FROM busy_users b WHERE b.user_id = u.id
				)
		),
		team_counts AS (
			SELECT tm.user_id, COUNT(*) AS team_count
			FROM team_members tm
			INNER JOIN available_students s ON s.user_id = tm.user_id
			GROUP BY tm.user_id
		),
		award_counts AS (
			SELECT tm.user_id, COUNT(DISTINCT a.id) AS award_count
			FROM team_members tm
			INNER JOIN available_students s ON s.user_id = tm.user_id
			INNER JOIN awards a ON a.team_id = tm.team_id
			GROUP BY tm.user_id
		),
		preplan_counts AS (
			SELECT tm.user_id, COUNT(DISTINCT pp.id) AS pre_plan_count
			FROM team_members tm
			INNER JOIN available_students s ON s.user_id = tm.user_id
			INNER JOIN pre_plans pp ON pp.team_id = tm.team_id
			GROUP BY tm.user_id
		),
		scored AS (
			SELECT
				s.user_id,
				s.username,
				s.name,
				s.dept,
				s.avatar,
				COALESCE(tc.team_count, 0) AS team_count,
				COALESCE(ac.award_count, 0) AS award_count,
				COALESCE(pc.pre_plan_count, 0) AS pre_plan_count,
				COALESCE(tc.team_count, 0) * 10
					+ COALESCE(ac.award_count, 0) * 15
					+ COALESCE(pc.pre_plan_count, 0) * 8 AS raw_score
			FROM available_students s
			LEFT JOIN team_counts tc ON tc.user_id = s.user_id
			LEFT JOIN award_counts ac ON ac.user_id = s.user_id
			LEFT JOIN preplan_counts pc ON pc.user_id = s.user_id
		)
		SELECT
			user_id,
			username,
			name,
			dept,
			avatar,
			team_count,
			award_count,
			pre_plan_count,
			CASE
				WHEN raw_score > 100 THEN 100.0
				ELSE raw_score
			END AS match_score,
			CASE
				WHEN award_count > 0 THEN 'experienced competitor with awards'
				WHEN pre_plan_count > 0 THEN 'active planner with pre-plan experience'
				WHEN team_count > 0 THEN 'team experience'
				ELSE 'available student'
			END AS reason
		FROM scored
		ORDER BY match_score DESC, user_id ASC
		LIMIT ?
	`, compID, models.RoleStudent, models.StatusActive, currentUserID, limit).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to match teammates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"matches":        results,
		"total":          len(results),
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
