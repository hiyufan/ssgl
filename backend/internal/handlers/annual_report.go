package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// AnnualReportHandler handles platform annual report requests.
type AnnualReportHandler struct{}

// NewAnnualReportHandler creates a new AnnualReportHandler.
func NewAnnualReportHandler() *AnnualReportHandler {
	return &AnnualReportHandler{}
}

// AnnualReport is the comprehensive platform report.
type AnnualReport struct {
	GeneratedAt time.Time `json:"generated_at"`
	Year        int       `json:"year"`

	// Platform overview
	Platform PlatformOverview `json:"platform"`

	// Competition statistics
	Competitions CompetitionBreakdown `json:"competitions"`

	// Team statistics
	Teams TeamReport `json:"teams"`

	// Student statistics
	Students StudentReport `json:"students"`

	// Award statistics
	Awards AwardReport `json:"awards"`

	// AI usage statistics
	AIUsage AIUsageReport `json:"ai_usage"`

	// Monthly trends
	Trends []MonthlyTrend `json:"trends"`

	// Top competitions by participation
	TopCompetitions []TopCompetition `json:"top_competitions"`

	// Top teams by awards
	TopTeams []TopTeam `json:"top_teams"`

	// Achievement highlights
	Highlights []Highlight `json:"highlights"`
}

type PlatformOverview struct {
	TotalUsers       int64   `json:"total_users"`
	TotalStudents    int64   `json:"total_students"`
	TotalTeachers    int64   `json:"total_teachers"`
	TotalAdmins      int64   `json:"total_admins"`
	TotalCompetitions int64  `json:"total_competitions"`
	TotalTeams       int64   `json:"total_teams"`
	TotalAwards      int64   `json:"total_awards"`
	TotalPrePlans    int64   `json:"total_pre_plans"`
	TotalEvaluations int64   `json:"total_evaluations"`
	ActiveCompetitions int64 `json:"active_competitions"`
	SettledAwards    int64   `json:"settled_awards"`
	AvgTeamSize      float64 `json:"avg_team_size"`
	StudentParticipation float64 `json:"student_participation"`
}

// CompetitionBreakdown holds competition statistics for the annual report.
type CompetitionBreakdown struct {
	Total         int64            `json:"total"`
	Published     int64            `json:"published"`
	Ongoing       int64            `json:"ongoing"`
	Completed     int64            `json:"completed"`
	Draft         int64            `json:"draft"`
	ByType        []TypeCount      `json:"by_type"`
	AvgTeamsPerComp float64        `json:"avg_teams_per_comp"`
}

type TypeCount struct {
	Type  string `json:"type"`
	Count int64  `json:"count"`
}

type TeamReport struct {
	Total       int64   `json:"total"`
	WithMembers int64   `json:"with_members"`
	WithPlans   int64   `json:"with_plans"`
	AvgSize     float64 `json:"avg_size"`
	MaxSize     int     `json:"max_size"`
}

type StudentReport struct {
	Total          int64   `json:"total"`
	WithTeams      int64   `json:"with_teams"`
	WithAwards     int64   `json:"with_awards"`
	WithPrePlans   int64   `json:"with_pre_plans"`
	TeamRate       float64 `json:"team_rate"`
	AwardRate      float64 `json:"award_rate"`
	AvgCompetitions float64 `json:"avg_competitions"`
}

type AwardReport struct {
	Total        int64   `json:"total"`
	Settled      int64   `json:"settled"`
	Pending      int64   `json:"pending"`
	TotalPrize   float64 `json:"total_prize"`
	AvgPrize     float64 `json:"avg_prize"`
	TopRankCount int64   `json:"top_rank_count"`
}

type AIUsageReport struct {
	TotalPrePlanReviews int64 `json:"total_preplan_reviews"`
	TotalAIAnalyses     int64 `json:"total_ai_analyses"`
	TotalRAGDocuments   int64 `json:"total_rag_documents"`
}

type MonthlyTrend struct {
	Month        string `json:"month"`
	Competitions int64  `json:"competitions"`
	Teams        int64  `json:"teams"`
	Awards       int64  `json:"awards"`
	PrePlans     int64  `json:"pre_plans"`
}

type TopCompetition struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`
	Type         string `json:"type"`
	TeamCount    int64  `json:"team_count"`
	AwardCount   int64  `json:"award_count"`
	PrePlanCount int64  `json:"pre_plan_count"`
}

type TopTeam struct {
	ID             uint    `json:"id"`
	Name           string  `json:"name"`
	CompetitionID  uint    `json:"competition_id"`
	CompTitle      string  `json:"comp_title"`
	MemberCount    int     `json:"member_count"`
	AwardCount     int64   `json:"award_count"`
	PrePlanCount   int64   `json:"pre_plan_count"`
}

type Highlight struct {
	Type    string `json:"type"`
	Title   string `json:"title"`
	Details string `json:"details"`
	Icon    string `json:"icon"`
}

// Generate handles GET /report/annual
func (h *AnnualReportHandler) Generate(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	report := AnnualReport{
		GeneratedAt: time.Now(),
		Year:        time.Now().Year(),
	}

	// Platform overview — consolidated into 4 queries instead of 14
	var totalUsers, totalStudents, totalTeachers, totalAdmins int64
	db.Raw(`SELECT
		COUNT(*),
		COUNT(*) FILTER (WHERE role = ?),
		COUNT(*) FILTER (WHERE role = ?),
		COUNT(*) FILTER (WHERE role = ?)
		FROM users WHERE deleted_at IS NULL`,
		models.RoleStudent, models.RoleTeacher, models.RoleAdmin,
	).Row().Scan(&totalUsers, &totalStudents, &totalTeachers, &totalAdmins)

	var totalComp, totalTeams, totalAwards, totalPrePlans, totalEvals int64
	var activeComp, settledAwards int64
	db.Raw(`SELECT
		(SELECT COUNT(*) FROM competitions WHERE deleted_at IS NULL),
		(SELECT COUNT(*) FROM teams WHERE deleted_at IS NULL),
		(SELECT COUNT(*) FROM awards WHERE deleted_at IS NULL),
		(SELECT COUNT(*) FROM pre_plans WHERE deleted_at IS NULL),
		(SELECT COUNT(*) FROM student_evaluations WHERE deleted_at IS NULL),
		(SELECT COUNT(*) FROM competitions WHERE deleted_at IS NULL AND status IN (?, ?)),
		(SELECT COUNT(*) FROM awards WHERE deleted_at IS NULL AND status = ?)`,
		models.CompStatusPublished, models.CompStatusOngoing, models.AwardStatusSettled,
	).Row().Scan(&totalComp, &totalTeams, &totalAwards, &totalPrePlans, &totalEvals, &activeComp, &settledAwards)

	// Average team size + student participation
	var avgSize float64
	var studentsWithTeams int64
	db.Raw(`SELECT COALESCE(AVG(member_count), 0) FROM (SELECT COUNT(*) as member_count FROM team_members GROUP BY team_id) sub`,
	).Row().Scan(&avgSize)
	db.Raw(`SELECT COUNT(DISTINCT user_id) FROM team_members`).Row().Scan(&studentsWithTeams)
	participation := 0.0
	if totalStudents > 0 {
		participation = float64(studentsWithTeams) / float64(totalStudents) * 100
	}

	report.Platform = PlatformOverview{
		TotalUsers:       totalUsers,
		TotalStudents:    totalStudents,
		TotalTeachers:    totalTeachers,
		TotalAdmins:      totalAdmins,
		TotalCompetitions: totalComp,
		TotalTeams:       totalTeams,
		TotalAwards:      totalAwards,
		TotalPrePlans:    totalPrePlans,
		TotalEvaluations: totalEvals,
		ActiveCompetitions: activeComp,
		SettledAwards:    settledAwards,
		AvgTeamSize:      avgSize,
		StudentParticipation: participation,
	}

	// Competition breakdown — consolidated into 1 query instead of 5
	var published, ongoing, completed, draft int64
	db.Raw(`SELECT
		COUNT(*) FILTER (WHERE status = ?),
		COUNT(*) FILTER (WHERE status = ?),
		COUNT(*) FILTER (WHERE status = ?),
		COUNT(*) FILTER (WHERE status = ?)
		FROM competitions WHERE deleted_at IS NULL`,
		models.CompStatusPublished, models.CompStatusOngoing, models.CompStatusCompleted, models.CompStatusDraft,
	).Row().Scan(&published, &ongoing, &completed, &draft)

	// By type
	var typeCounts []TypeCount
	db.Raw(`SELECT type, COUNT(*) as count FROM competitions GROUP BY type ORDER BY count DESC`).Scan(&typeCounts)

	// Avg teams per competition
	avgTeamsPerComp := 0.0
	if totalComp > 0 {
		avgTeamsPerComp = float64(totalTeams) / float64(totalComp)
	}

	report.Competitions = CompetitionBreakdown{
		Total:           totalComp,
		Published:       published,
		Ongoing:         ongoing,
		Completed:       completed,
		Draft:           draft,
		ByType:          typeCounts,
		AvgTeamsPerComp: avgTeamsPerComp,
	}

	// Team stats — consolidated into 1 query instead of 3
	var teamsWithMembers, teamsWithPlans int64
	var maxSize int
	db.Raw(`SELECT
		(SELECT COUNT(DISTINCT team_id) FROM team_members),
		(SELECT COUNT(DISTINCT t.id) FROM teams t JOIN pre_plans p ON t.competition_id = p.competition_id AND t.leader_id = p.student_id),
		(SELECT COALESCE(MAX(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM team_members GROUP BY team_id) sub)`,
	).Row().Scan(&teamsWithMembers, &teamsWithPlans, &maxSize)

	report.Teams = TeamReport{
		Total:       totalTeams,
		WithMembers: teamsWithMembers,
		WithPlans:   teamsWithPlans,
		AvgSize:     avgSize,
		MaxSize:     maxSize,
	}

	// Student stats — consolidated into 1 query instead of 2
	var studentsWithAwards, studentsWithPlans int64
	db.Raw(`SELECT
		(SELECT COUNT(DISTINCT student_id) FROM awards),
		(SELECT COUNT(DISTINCT student_id) FROM pre_plans)`,
	).Row().Scan(&studentsWithAwards, &studentsWithPlans)

	awardRate := 0.0
	if totalStudents > 0 {
		awardRate = float64(studentsWithAwards) / float64(totalStudents) * 100
	}

	avgComps := 0.0
	if totalStudents > 0 {
		avgComps = float64(totalTeams) / float64(totalStudents)
	}

	report.Students = StudentReport{
		Total:           totalStudents,
		WithTeams:       studentsWithTeams,
		WithAwards:      studentsWithAwards,
		WithPrePlans:    studentsWithPlans,
		TeamRate:        participation,
		AwardRate:       awardRate,
		AvgCompetitions: avgComps,
	}

	// Award stats — consolidated into 1 query instead of 3
	var totalPrize float64
	var pendingAwards, topRankCount int64
	db.Raw(`SELECT
		COALESCE(SUM(prize_amount), 0),
		COUNT(*) FILTER (WHERE status = ?),
		COUNT(*) FILTER (WHERE rank <= 3)
		FROM awards WHERE deleted_at IS NULL`,
		models.AwardStatusPending,
	).Row().Scan(&totalPrize, &pendingAwards, &topRankCount)
	avgPrize := 0.0
	if totalAwards > 0 {
		avgPrize = totalPrize / float64(totalAwards)
	}

	report.Awards = AwardReport{
		Total:        totalAwards,
		Settled:      settledAwards,
		Pending:      pendingAwards,
		TotalPrize:   totalPrize,
		AvgPrize:     avgPrize,
		TopRankCount: topRankCount,
	}

	// Monthly trends (last 12 months) — consolidated into 4 queries instead of 48
	cutoff := time.Now().AddDate(0, -11, 0)
	cutoff = time.Date(cutoff.Year(), cutoff.Month(), 1, 0, 0, 0, 0, cutoff.Location())
	monthCounts := make(map[string]*MonthlyTrend)
	for i := 11; i >= 0; i-- {
		m := time.Now().AddDate(0, -i, 0).Format("2006-01")
		monthCounts[m] = &MonthlyTrend{Month: m}
	}

	type monthCount struct {
		Month string
		Count int64
	}
	var compMonthly, teamMonthly, awardMonthly, planMonthly []monthCount
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
		FROM competitions WHERE deleted_at IS NULL AND created_at >= ?
		GROUP BY month ORDER BY month`, cutoff).Scan(&compMonthly)
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
		FROM teams WHERE deleted_at IS NULL AND created_at >= ?
		GROUP BY month ORDER BY month`, cutoff).Scan(&teamMonthly)
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
		FROM awards WHERE deleted_at IS NULL AND created_at >= ?
		GROUP BY month ORDER BY month`, cutoff).Scan(&awardMonthly)
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
		FROM pre_plans WHERE deleted_at IS NULL AND created_at >= ?
		GROUP BY month ORDER BY month`, cutoff).Scan(&planMonthly)

	for _, mc := range compMonthly {
		if t, ok := monthCounts[mc.Month]; ok {
			t.Competitions = mc.Count
		}
	}
	for _, mc := range teamMonthly {
		if t, ok := monthCounts[mc.Month]; ok {
			t.Teams = mc.Count
		}
	}
	for _, mc := range awardMonthly {
		if t, ok := monthCounts[mc.Month]; ok {
			t.Awards = mc.Count
		}
	}
	for _, mc := range planMonthly {
		if t, ok := monthCounts[mc.Month]; ok {
			t.PrePlans = mc.Count
		}
	}

	var trends []MonthlyTrend
	for i := 11; i >= 0; i-- {
		m := time.Now().AddDate(0, -i, 0).Format("2006-01")
		trends = append(trends, *monthCounts[m])
	}
	report.Trends = trends

	// Top competitions by participation
	report.TopCompetitions = []TopCompetition{}
	type compStat struct {
		ID           uint
		Title        string
		Type         string
		TeamCount    int64
		AwardCount   int64
		PrePlanCount int64
	}
	var compStats []compStat
	db.Raw(`
		SELECT c.id, c.title, c.type,
			(SELECT COUNT(*) FROM teams WHERE competition_id = c.id) as team_count,
			(SELECT COUNT(*) FROM awards WHERE competition_id = c.id) as award_count,
			(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id) as pre_plan_count
		FROM competitions c
		ORDER BY team_count DESC
		LIMIT 10
	`).Scan(&compStats)

	for _, cs := range compStats {
		report.TopCompetitions = append(report.TopCompetitions, TopCompetition{
			ID:           cs.ID,
			Title:        cs.Title,
			Type:         cs.Type,
			TeamCount:    cs.TeamCount,
			AwardCount:   cs.AwardCount,
			PrePlanCount: cs.PrePlanCount,
		})
	}

	// Top teams by awards
	report.TopTeams = []TopTeam{}
	type teamStat struct {
		ID            uint
		Name          string
		CompetitionID uint
		CompTitle     string
		MemberCount   int
		AwardCount    int64
		PrePlanCount  int64
	}
	var teamStats []teamStat
	db.Raw(`
		SELECT t.id, t.name, t.competition_id, COALESCE(c.title, '') as comp_title,
			(SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
			(SELECT COUNT(*) FROM awards a WHERE a.team_id = t.id) as award_count,
			(SELECT COUNT(*) FROM pre_plans p WHERE p.student_id = t.leader_id AND p.competition_id = t.competition_id) as pre_plan_count
		FROM teams t
		LEFT JOIN competitions c ON t.competition_id = c.id
		ORDER BY award_count DESC
		LIMIT 10
	`).Scan(&teamStats)

	for _, ts := range teamStats {
		report.TopTeams = append(report.TopTeams, TopTeam{
			ID:            ts.ID,
			Name:          ts.Name,
			CompetitionID: ts.CompetitionID,
			CompTitle:     ts.CompTitle,
			MemberCount:   ts.MemberCount,
			AwardCount:    ts.AwardCount,
			PrePlanCount:  ts.PrePlanCount,
		})
	}

	// Achievement highlights
	highlights := []Highlight{}

	if totalComp > 0 {
		highlights = append(highlights, Highlight{
			Type:    "platform",
			Title:   "平台规模",
			Details: fmt.Sprintf("累计 %d 个赛事、%d 支团队、%d 个奖项", totalComp, totalTeams, totalAwards),
			Icon:    "🏗️",
		})
	}

	if participation > 50 {
		highlights = append(highlights, Highlight{
			Type:    "engagement",
			Title:   "高参与率",
			Details: fmt.Sprintf("%.1f%% 的学生已组建团队参赛", participation),
			Icon:    "🎯",
		})
	}

	if totalPrize > 0 {
		highlights = append(highlights, Highlight{
			Type:    "award",
			Title:   "奖金总额",
			Details: fmt.Sprintf("累计发放奖金 ¥%.0f", totalPrize),
			Icon:    "💰",
		})
	}

	if settledAwards > 0 {
		highlights = append(highlights, Highlight{
			Type:    "award",
			Title:   "奖项结算",
			Details: fmt.Sprintf("已结算 %d 个奖项", settledAwards),
			Icon:    "✅",
		})
	}

	// Sort highlights by type
	sort.Slice(highlights, func(i, j int) bool {
		return highlights[i].Type < highlights[j].Type
	})

	report.Highlights = highlights

	c.JSON(http.StatusOK, report)
}
