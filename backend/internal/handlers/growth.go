package handlers

import (
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// GrowthHandler generates student growth profiles.
type GrowthHandler struct{}

func NewGrowthHandler() *GrowthHandler {
	return &GrowthHandler{}
}

// ── Response structures ────────────────────────────────────────────────────

// GrowthProfile is the top-level response for a student's growth profile.
type GrowthProfile struct {
	StudentID      uint               `json:"student_id"`
	StudentName    string             `json:"student_name"`
	GeneratedAt    time.Time          `json:"generated_at"`
	Summary        GrowthSummary      `json:"summary"`
	Competitions   []GrowthComp       `json:"competitions"`
	Awards         []GrowthAward      `json:"awards"`
	Skills         []SkillEntry       `json:"skills"`
	Timeline       []GrowthEvent      `json:"timeline"`
	Recommendations []string          `json:"recommendations"`
}

// GrowthSummary provides aggregate metrics.
type GrowthSummary struct {
	TotalCompetitions  int     `json:"total_competitions"`
	TotalAwards        int     `json:"total_awards"`
	TotalTeams         int     `json:"total_teams"`
	TotalPrePlans      int     `json:"total_pre_plans"`
	AwardRate          float64 `json:"award_rate"`
	ParticipationDays  int     `json:"participation_days"`
	TopCompetitionType string  `json:"top_competition_type"`
}

// GrowthComp is a competition entry in the growth profile.
type GrowthComp struct {
	ID        uint   `json:"id"`
	Title     string `json:"title"`
	Type      string `json:"type"`
	Level     string `json:"level"`
	Status    string `json:"status"`
	TeamName  string `json:"team_name,omitempty"`
	Role      string `json:"role,omitempty"`
	AwardRank string `json:"award_rank,omitempty"`
}

// GrowthAward is an award entry in the growth profile.
type GrowthAward struct {
	ID            uint    `json:"id"`
	CompetitionID uint    `json:"competition_id"`
	CompTitle     string  `json:"comp_title"`
	RankName      string  `json:"rank_name"`
	PrizeAmount   float64 `json:"prize_amount"`
	Status        string  `json:"status"`
	SettledAt     *time.Time `json:"settled_at,omitempty"`
}

// SkillEntry represents a skill dimension derived from competition types.
type SkillEntry struct {
	Name  string  `json:"name"`
	Score float64 `json:"score"`
	Count int     `json:"count"`
}

// GrowthEvent is a timeline entry.
type GrowthEvent struct {
	Date    time.Time `json:"date"`
	Type    string    `json:"type"`
	Title   string    `json:"title"`
	Details string    `json:"details,omitempty"`
}

// ── Handler ────────────────────────────────────────────────────────────────

// GetGrowthProfile returns a comprehensive growth profile for a student.
//
//	GET /api/v1/students/:id/growth
func (h *GrowthHandler) GetGrowthProfile(c *gin.Context) {
	// Auth check first.
	if _, exists := c.Get("user_id"); !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	studentID, err := parseUint(c.Param("id"))
	if err != nil || studentID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	// Verify student exists.
	var student models.User
	if err := db.First(&student, studentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	profile := GrowthProfile{
		StudentID:   studentID,
		StudentName: student.Name,
		GeneratedAt: time.Now(),
	}

	// ── Competitions via registrations ──────────────────────────────────
	var registrations []models.CompetitionRegistration
	db.Where("user_id = ?", studentID).
		Preload("Competition").
		Find(&registrations)

	compTypeCounts := map[string]int{}
	var firstDate, lastDate time.Time

	for _, reg := range registrations {
		comp := reg.Competition
		compTypeCounts[comp.Type]++

		gc := GrowthComp{
			ID:     comp.ID,
			Title:  comp.Title,
			Type:   comp.Type,
			Level:  comp.Level,
			Status: reg.Status,
		}

		// Find team membership for this competition.
		var member models.TeamMember
		if err := db.Joins("JOIN teams ON teams.id = team_members.team_id").
			Where("team_members.user_id = ? AND teams.competition_id = ?", studentID, comp.ID).
			Preload("Team").
			First(&member).Error; err == nil {
			gc.TeamName = member.Team.Name
			gc.Role = member.Role
		}

		// Find award for this competition.
		var award models.Award
		if err := db.Joins("JOIN teams ON teams.id = awards.team_id").
			Joins("JOIN team_members ON team_members.team_id = teams.id").
			Where("team_members.user_id = ? AND awards.competition_id = ?", studentID, comp.ID).
			First(&award).Error; err == nil {
			gc.AwardRank = award.RankName
		}

		profile.Competitions = append(profile.Competitions, gc)

		if firstDate.IsZero() || reg.CreatedAt.Before(firstDate) {
			firstDate = reg.CreatedAt
		}
		if reg.CreatedAt.After(lastDate) {
			lastDate = reg.CreatedAt
		}
	}

	// ── Awards ──────────────────────────────────────────────────────────
	var awards []models.Award
	db.Joins("JOIN teams ON teams.id = awards.team_id").
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ?", studentID).
		Preload("Competition").
		Group("awards.id").
		Find(&awards)

	for _, a := range awards {
		profile.Awards = append(profile.Awards, GrowthAward{
			ID:            a.ID,
			CompetitionID: a.CompetitionID,
			CompTitle:     a.Competition.Title,
			RankName:      a.RankName,
			PrizeAmount:   a.PrizeAmount,
			Status:        a.Status,
			SettledAt:     a.SettledAt,
		})
	}

	// ── Teams ───────────────────────────────────────────────────────────
	var teamMembers []models.TeamMember
	db.Where("user_id = ?", studentID).Find(&teamMembers)
	teamCount := len(teamMembers)

	// ── Pre-plans ───────────────────────────────────────────────────────
	var preplanCount int64
	db.Model(&models.PrePlan{}).
		Joins("JOIN teams ON teams.id = pre_plans.team_id").
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ?", studentID).
		Group("pre_plans.id").
		Count(&preplanCount)

	// ── Skills (derived from competition types) ─────────────────────────
	typeSkillMap := map[string]string{
		"hackathon":    "创新实践",
		"programming":  "编程能力",
		"business":     "商业思维",
		"design":       "设计能力",
		"research":     "科研能力",
		"ai":           "人工智能",
	}

	maxCount := 1
	for _, cnt := range compTypeCounts {
		if cnt > maxCount {
			maxCount = cnt
		}
	}

	for compType, cnt := range compTypeCounts {
		skillName := typeSkillMap[compType]
		if skillName == "" {
			skillName = compType
		}
		score := float64(cnt) / float64(maxCount) * 100
		profile.Skills = append(profile.Skills, SkillEntry{
			Name:  skillName,
			Score: score,
			Count: cnt,
		})
	}
	sort.Slice(profile.Skills, func(i, j int) bool {
		return profile.Skills[i].Score > profile.Skills[j].Score
	})

	// ── Timeline ────────────────────────────────────────────────────────
	for _, reg := range registrations {
		profile.Timeline = append(profile.Timeline, GrowthEvent{
			Date:  reg.CreatedAt,
			Type:  "registration",
			Title: "报名赛事: " + reg.Competition.Title,
		})
	}
	for _, a := range awards {
		evt := GrowthEvent{
			Date:    a.CreatedAt,
			Type:    "award",
			Title:   "获得奖项: " + a.RankName,
			Details: a.Competition.Title,
		}
		if a.SettledAt != nil {
			evt.Date = *a.SettledAt
		}
		profile.Timeline = append(profile.Timeline, evt)
	}
	sort.Slice(profile.Timeline, func(i, j int) bool {
		return profile.Timeline[i].Date.After(profile.Timeline[j].Date)
	})

	// ── Summary ─────────────────────────────────────────────────────────
	participationDays := 0
	if !firstDate.IsZero() && !lastDate.IsZero() {
		participationDays = int(lastDate.Sub(firstDate).Hours() / 24)
	}

	topType := ""
	topCount := 0
	for t, c := range compTypeCounts {
		if c > topCount {
			topCount = c
			topType = t
		}
	}

	awardRate := 0.0
	if len(registrations) > 0 {
		awardRate = float64(len(awards)) / float64(len(registrations)) * 100
	}

	profile.Summary = GrowthSummary{
		TotalCompetitions:  len(registrations),
		TotalAwards:        len(awards),
		TotalTeams:         teamCount,
		TotalPrePlans:      int(preplanCount),
		AwardRate:          awardRate,
		ParticipationDays:  participationDays,
		TopCompetitionType: topType,
	}

	// ── Recommendations ─────────────────────────────────────────────────
	profile.Recommendations = generateRecommendations(profile)

	c.JSON(http.StatusOK, profile)
}

// generateRecommendations produces growth suggestions based on the profile.
func generateRecommendations(p GrowthProfile) []string {
	var recs []string

	if p.Summary.TotalCompetitions < 3 {
		recs = append(recs, "建议多参加不同类型的赛事，拓宽视野和技能栈")
	}
	if p.Summary.AwardRate < 30 && p.Summary.TotalCompetitions > 0 {
		recs = append(recs, "获奖率偏低，建议加强赛前准备，善用AI预案评审工具")
	}
	if len(p.Skills) > 0 && p.Skills[0].Score > 80 {
		recs = append(recs, "在"+p.Skills[0].Name+"方向表现突出，建议尝试更高级别赛事")
	}
	if p.Summary.TotalPrePlans == 0 && p.Summary.TotalCompetitions > 0 {
		recs = append(recs, "尚未提交预案，建议使用AI预案工具提升项目质量")
	}
	if p.Summary.TotalTeams > 0 && p.Summary.TotalAwards == 0 {
		recs = append(recs, "已参与团队但未获奖，建议使用队友匹配功能优化团队配置")
	}
	if len(recs) == 0 {
		recs = append(recs, "表现优秀！继续保持，可以尝试国家级或国际赛事挑战自我")
	}
	return recs
}
