package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ComparisonHandler handles competition comparison requests.
type ComparisonHandler struct{}

func NewComparisonHandler() *ComparisonHandler {
	return &ComparisonHandler{}
}

// CompetitionComparison holds comparison data for a single competition.
type CompetitionComparison struct {
	ID              uint    `json:"id"`
	Title           string  `json:"title"`
	Type            string  `json:"type"`
	Status          string  `json:"status"`
	Level           string  `json:"level"`
	Location        string  `json:"location"`
	Tags            string  `json:"tags"`
	MaxTeamSize     int     `json:"max_team_size"`
	MinTeamSize     int     `json:"min_team_size"`
	TeamCount       int     `json:"team_count"`
	StudentCount    int     `json:"student_count"`
	PreplanCount    int     `json:"preplan_count"`
	AwardCount      int     `json:"award_count"`
	AvgTeamSize     float64 `json:"avg_team_size"`
	RegistrationPct float64 `json:"registration_pct"`
	DaysUntilStart  int     `json:"days_until_start"`
	Duration        int     `json:"duration_days"`
}

// CompareResponse is the API response for competition comparison.
type CompareResponse struct {
	Competitions []CompetitionComparison `json:"competitions"`
	Summary      ComparisonSummary       `json:"summary"`
}

// ComparisonSummary provides aggregate comparison insights.
type ComparisonSummary struct {
	MostPopular     string  `json:"most_popular"`
	MostPopularID   uint    `json:"most_popular_id"`
	BestTeamSize    string  `json:"best_team_size"`
	BestTeamSizeID  uint    `json:"best_team_size_id"`
	AvgTeamsOverall float64 `json:"avg_teams_overall"`
	TotalTeams      int     `json:"total_teams"`
	TotalStudents   int     `json:"total_students"`
}

// Compare handles GET /api/v1/competitions/compare?ids=1,2,3
func (h *ComparisonHandler) Compare(c *gin.Context) {
	idsParam := c.Query("ids")
	if idsParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供要比较的赛事ID，格式: ?ids=1,2,3"})
		return
	}

	// Parse comma-separated IDs
	idStrs := strings.Split(idsParam, ",")
	var ids []uint
	for _, s := range idStrs {
		id, err := strconv.ParseUint(strings.TrimSpace(s), 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事ID: " + s})
			return
		}
		ids = append(ids, uint(id))
	}

	if len(ids) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "至少需要2个赛事进行比较"})
		return
	}
	if len(ids) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "最多比较10个赛事"})
		return
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库未连接"})
		return
	}

	var comparisons []CompetitionComparison
	for _, id := range ids {
		var comp models.Competition
		if err := db.First(&comp, id).Error; err != nil {
			continue // skip non-existent competitions
		}

		// Count teams
		var teamCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", id).Count(&teamCount)

		// Count unique students in teams
		var studentCount int64
		db.Raw(`SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm
			JOIN teams t ON t.id = tm.team_id
			WHERE t.competition_id = ?`, id).Scan(&studentCount)

		// Count preplans
		var preplanCount int64
		db.Model(&models.PrePlan{}).Where("competition_id = ?", id).Count(&preplanCount)

		// Count awards
		var awardCount int64
		db.Model(&models.Award{}).Where("competition_id = ?", id).Count(&awardCount)

		// Average team size
		var avgTeamSize float64
		db.Raw(`SELECT COALESCE(AVG(member_count), 0) FROM (
			SELECT COUNT(*) as member_count FROM team_members tm
			JOIN teams t ON t.id = tm.team_id
			WHERE t.competition_id = ?
			GROUP BY t.id
		) sub`, id).Scan(&avgTeamSize)

		// Registration percentage (registered vs published teams)
		var regPct float64
		if teamCount > 0 {
			regPct = float64(teamCount) / float64(comp.MaxTeamSize*10) * 100
			if regPct > 100 {
				regPct = 100
			}
		}

		// Days until start
		daysUntil := 0
		duration := 0
		if comp.StartDate.After(comp.CreatedAt) {
			daysUntil = int(comp.StartDate.Sub(comp.CreatedAt).Hours() / 24)
			if daysUntil < 0 {
				daysUntil = 0
			}
		}
		if comp.EndDate.After(comp.StartDate) {
			duration = int(comp.EndDate.Sub(comp.StartDate).Hours() / 24)
		}

		comparisons = append(comparisons, CompetitionComparison{
			ID:              comp.ID,
			Title:           comp.Title,
			Type:            comp.Type,
			Status:          comp.Status,
			Level:           comp.Level,
			Location:        comp.Location,
			Tags:            comp.Tags,
			MaxTeamSize:     comp.MaxTeamSize,
			MinTeamSize:     comp.MinTeamSize,
			TeamCount:       int(teamCount),
			StudentCount:    int(studentCount),
			PreplanCount:    int(preplanCount),
			AwardCount:      int(awardCount),
			AvgTeamSize:     avgTeamSize,
			RegistrationPct: regPct,
			DaysUntilStart:  daysUntil,
			Duration:        duration,
		})
	}

	if len(comparisons) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到任何指定的赛事"})
		return
	}

	// Build summary
	summary := ComparisonSummary{}
	totalTeams := 0
	totalStudents := 0
	maxTeams := 0
	maxAvgSize := 0.0

	for _, cc := range comparisons {
		totalTeams += cc.TeamCount
		totalStudents += cc.StudentCount
		if cc.TeamCount > maxTeams {
			maxTeams = cc.TeamCount
			summary.MostPopular = cc.Title
			summary.MostPopularID = cc.ID
		}
		if cc.AvgTeamSize > maxAvgSize {
			maxAvgSize = cc.AvgTeamSize
			summary.BestTeamSize = cc.Title
			summary.BestTeamSizeID = cc.ID
		}
	}

	summary.TotalTeams = totalTeams
	summary.TotalStudents = totalStudents
	if len(comparisons) > 0 {
		summary.AvgTeamsOverall = float64(totalTeams) / float64(len(comparisons))
	}

	c.JSON(http.StatusOK, CompareResponse{
		Competitions: comparisons,
		Summary:      summary,
	})
}
