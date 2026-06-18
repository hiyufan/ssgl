package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// StatsHandler handles statistics HTTP requests.
type StatsHandler struct{}

// NewStatsHandler creates a new StatsHandler.
func NewStatsHandler() *StatsHandler {
	return &StatsHandler{}
}

// Overview handles GET /stats/overview — returns high-level platform stats.
func (h *StatsHandler) Overview(c *gin.Context) {
	db := database.GetDB()

	var totalUsers int64
	db.Model(&models.User{}).Count(&totalUsers)

	var totalStudents int64
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)

	var totalTeachers int64
	db.Model(&models.User{}).Where("role = ?", models.RoleTeacher).Count(&totalTeachers)

	var totalCompetitions int64
	db.Model(&models.Competition{}).Count(&totalCompetitions)

	var totalTeams int64
	db.Model(&models.Team{}).Count(&totalTeams)

	var ongoingCompetitions int64
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusOngoing).Count(&ongoingCompetitions)

	var totalAwards int64
	db.Model(&models.Award{}).Count(&totalAwards)

	var totalPrePlans int64
	db.Model(&models.PrePlan{}).Count(&totalPrePlans)

	var totalEvaluations int64
	db.Model(&models.StudentEvaluation{}).Count(&totalEvaluations)

	var publishedCompetitions int64
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusPublished).Count(&publishedCompetitions)

	var settledAwards int64
	db.Model(&models.Award{}).Where("status = ?", models.AwardStatusSettled).Count(&settledAwards)

	c.JSON(http.StatusOK, gin.H{
		"total_users":              totalUsers,
		"total_students":           totalStudents,
		"total_teachers":           totalTeachers,
		"total_competitions":       totalCompetitions,
		"total_teams":              totalTeams,
		"ongoing_competitions":     ongoingCompetitions,
		"total_awards":             totalAwards,
		"total_pre_plans":          totalPrePlans,
		"total_evaluations":        totalEvaluations,
		"published_competitions":   publishedCompetitions,
		"settled_awards":           settledAwards,
	})
}

// CompetitionStats holds per-competition statistics.
type CompetitionStats struct {
	ID          uint   `json:"id"`
	Title       string `json:"title"`
	Status      string `json:"status"`
	TeamCount   int64  `json:"team_count"`
	AwardCount  int64  `json:"award_count"`
	PrePlanCount int64 `json:"pre_plan_count"`
}

// Competitions handles GET /stats/competitions — returns per-competition stats.
func (h *StatsHandler) Competitions(c *gin.Context) {
	db := database.GetDB()

	var competitions []models.Competition
	if err := db.Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	stats := make([]CompetitionStats, len(competitions))
	for i, comp := range competitions {
		var teamCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)

		var awardCount int64
		db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

		var prePlanCount int64
		db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&prePlanCount)

		stats[i] = CompetitionStats{
			ID:           comp.ID,
			Title:        comp.Title,
			Status:       comp.Status,
			TeamCount:    teamCount,
			AwardCount:   awardCount,
			PrePlanCount: prePlanCount,
		}
	}

	c.JSON(http.StatusOK, gin.H{"competitions": stats})
}

// TeacherStats holds per-teacher evaluation statistics.
type TeacherStats struct {
	ID               uint    `json:"id"`
	Name             string  `json:"name"`
	EvaluationCount  int64   `json:"evaluation_count"`
	AvgTeaching      float64 `json:"avg_teaching"`
	AvgCommunication float64 `json:"avg_communication"`
	AvgAvailability  float64 `json:"avg_availability"`
	AvgOverall       float64 `json:"avg_overall"`
}

// Teachers handles GET /stats/teachers — returns per-teacher evaluation aggregates.
func (h *StatsHandler) Teachers(c *gin.Context) {
	db := database.GetDB()

	var teachers []models.User
	if err := db.Where("role = ?", models.RoleTeacher).Find(&teachers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teachers"})
		return
	}

	stats := make([]TeacherStats, len(teachers))
	for i, teacher := range teachers {
		var count int64
		db.Model(&models.StudentEvaluation{}).Where("teacher_id = ?", teacher.ID).Count(&count)

		var avgTeaching, avgCommunication, avgAvailability, avgOverall float64
		if count > 0 {
			db.Model(&models.StudentEvaluation{}).
				Where("teacher_id = ?", teacher.ID).
				Select("COALESCE(AVG(teaching), 0)").
				Row().Scan(&avgTeaching)
			db.Model(&models.StudentEvaluation{}).
				Where("teacher_id = ?", teacher.ID).
				Select("COALESCE(AVG(communication), 0)").
				Row().Scan(&avgCommunication)
			db.Model(&models.StudentEvaluation{}).
				Where("teacher_id = ?", teacher.ID).
				Select("COALESCE(AVG(availability), 0)").
				Row().Scan(&avgAvailability)
			db.Model(&models.StudentEvaluation{}).
				Where("teacher_id = ?", teacher.ID).
				Select("COALESCE(AVG(overall), 0)").
				Row().Scan(&avgOverall)
		}

		stats[i] = TeacherStats{
			ID:               teacher.ID,
			Name:             teacher.Name,
			EvaluationCount:  count,
			AvgTeaching:      avgTeaching,
			AvgCommunication: avgCommunication,
			AvgAvailability:  avgAvailability,
			AvgOverall:       avgOverall,
		}
	}

	c.JSON(http.StatusOK, gin.H{"teachers": stats})
}

// StudentStats holds student-related statistics.
type StudentStats struct {
	TotalStudents      int64   `json:"total_students"`
	StudentsWithTeams  int64   `json:"students_with_teams"`
	StudentsWithAwards int64   `json:"students_with_awards"`
	AvgTeamSize        float64 `json:"avg_team_size"`
	TopStudents        []TopStudent `json:"top_students,omitempty"`
}

// TopStudent holds a student's activity summary.
type TopStudent struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	TeamCount    int64  `json:"team_count"`
	AwardCount   int64  `json:"award_count"`
	PrePlanCount int64  `json:"pre_plan_count"`
}

// Students handles GET /stats/students — returns student-related statistics.
func (h *StatsHandler) Students(c *gin.Context) {
	db := database.GetDB()

	var totalStudents int64
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)

	// Students who are in at least one team
	var studentsWithTeams int64
	db.Model(&models.TeamMember{}).Distinct("user_id").Count(&studentsWithTeams)

	// Students who have awards (through teams)
	var studentsWithAwards int64
	db.Raw(`SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm
		INNER JOIN awards a ON a.team_id = tm.team_id`).Scan(&studentsWithAwards)

	// Average team size
	var avgTeamSize float64
	db.Raw(`SELECT COALESCE(AVG(member_count), 0) FROM (
		SELECT COUNT(*) as member_count FROM team_members GROUP BY team_id
	) sub`).Scan(&avgTeamSize)

	// Top students by activity
	var topStudents []TopStudent
	db.Raw(`SELECT u.id, u.name,
		COUNT(DISTINCT tm.team_id) as team_count,
		COUNT(DISTINCT a.id) as award_count,
		COUNT(DISTINCT pp.id) as pre_plan_count
		FROM users u
		LEFT JOIN team_members tm ON tm.user_id = u.id
		LEFT JOIN awards a ON a.team_id = tm.team_id
		LEFT JOIN pre_plans pp ON pp.team_id = tm.team_id
		WHERE u.role = 'student'
		GROUP BY u.id, u.name
		ORDER BY (COUNT(DISTINCT a.id) * 10 + COUNT(DISTINCT tm.team_id) * 3 + COUNT(DISTINCT pp.id)) DESC
		LIMIT 10`).Scan(&topStudents)

	c.JSON(http.StatusOK, gin.H{
		"total_students":       totalStudents,
		"students_with_teams":  studentsWithTeams,
		"students_with_awards": studentsWithAwards,
		"avg_team_size":        avgTeamSize,
		"top_students":         topStudents,
	})
}

// CompetitionProgress holds lifecycle progress data for a single competition.
type CompetitionProgress struct {
	ID            uint    `json:"id"`
	Title         string  `json:"title"`
	Status        string  `json:"status"`
	Type          string  `json:"type"`
	StartDate     string  `json:"start_date"`
	EndDate       string  `json:"end_date"`
	TeamCount     int64   `json:"team_count"`
	StudentCount  int64   `json:"student_count"`
	PrePlanCount  int64   `json:"pre_plan_count"`
	ReviewedCount int64   `json:"reviewed_count"`
	ApprovedCount int64   `json:"approved_count"`
	AwardCount    int64   `json:"award_count"`
	SettledCount  int64   `json:"settled_count"`
	TotalPrize    float64 `json:"total_prize"`
	Progress      float64 `json:"progress"` // 0-100 lifecycle completion %
}

// Progress handles GET /stats/progress — returns lifecycle progress for all competitions.
func (h *StatsHandler) Progress(c *gin.Context) {
	db := database.GetDB()

	var competitions []models.Competition
	if err := db.Order("id ASC").Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	progress := make([]CompetitionProgress, len(competitions))
	for i, comp := range competitions {
		var teamCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)

		var studentCount int64
		db.Raw(`SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm
			INNER JOIN teams t ON t.id = tm.team_id
			WHERE t.competition_id = ?`, comp.ID).Scan(&studentCount)

		var prePlanCount int64
		db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&prePlanCount)

		var reviewedCount int64
		db.Model(&models.PrePlan{}).Where("competition_id = ? AND status IN ?", comp.ID, []string{"reviewed", "approved"}).Count(&reviewedCount)

		var approvedCount int64
		db.Model(&models.PrePlan{}).Where("competition_id = ? AND status = ?", comp.ID, "approved").Count(&approvedCount)

		var awardCount int64
		db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

		var settledCount int64
		db.Model(&models.Award{}).Where("competition_id = ? AND status = ?", comp.ID, models.AwardStatusSettled).Count(&settledCount)

		var totalPrize float64
		db.Model(&models.Award{}).Where("competition_id = ? AND status = ?", comp.ID, models.AwardStatusSettled).
			Select("COALESCE(SUM(prize_amount), 0)").Row().Scan(&totalPrize)

		// Calculate lifecycle progress: creation(10%) + teams(20%) + preplans(30%) + review(20%) + awards(20%)
		var progressPct float64
		if teamCount > 0 {
			progressPct += 20
		}
		if prePlanCount > 0 {
			progressPct += 30
		}
		if reviewedCount > 0 {
			progressPct += 20
		}
		if awardCount > 0 {
			progressPct += 20
		}
		// Base progress for existing competition
		progressPct += 10
		if progressPct > 100 {
			progressPct = 100
		}

		startStr := ""
		if !comp.StartDate.IsZero() {
			startStr = comp.StartDate.Format("2006-01-02")
		}
		endStr := ""
		if !comp.EndDate.IsZero() {
			endStr = comp.EndDate.Format("2006-01-02")
		}

		progress[i] = CompetitionProgress{
			ID:            comp.ID,
			Title:         comp.Title,
			Status:        comp.Status,
			Type:          comp.Type,
			StartDate:     startStr,
			EndDate:       endStr,
			TeamCount:     teamCount,
			StudentCount:  studentCount,
			PrePlanCount:  prePlanCount,
			ReviewedCount: reviewedCount,
			ApprovedCount: approvedCount,
			AwardCount:    awardCount,
			SettledCount:  settledCount,
			TotalPrize:    totalPrize,
			Progress:      progressPct,
		}
	}

	c.JSON(http.StatusOK, gin.H{"competitions": progress})
}

// ExportOverview handles GET /stats/export/overview — returns platform stats as CSV.
func (h *StatsHandler) ExportOverview(c *gin.Context) {
	db := database.GetDB()

	var totalUsers, totalStudents, totalTeachers int64
	db.Model(&models.User{}).Count(&totalUsers)
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
	db.Model(&models.User{}).Where("role = ?", models.RoleTeacher).Count(&totalTeachers)

	var totalCompetitions, ongoingComp, publishedComp int64
	db.Model(&models.Competition{}).Count(&totalCompetitions)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusOngoing).Count(&ongoingComp)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusPublished).Count(&publishedComp)

	var totalTeams, totalAwards, totalPrePlans, totalEvals int64
	db.Model(&models.Team{}).Count(&totalTeams)
	db.Model(&models.Award{}).Count(&totalAwards)
	db.Model(&models.PrePlan{}).Count(&totalPrePlans)
	db.Model(&models.StudentEvaluation{}).Count(&totalEvals)

	filename := fmt.Sprintf("ssgl_stats_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"指标", "数值"})
	w.Write([]string{"总用户数", strconv.FormatInt(totalUsers, 10)})
	w.Write([]string{"学生数", strconv.FormatInt(totalStudents, 10)})
	w.Write([]string{"教师数", strconv.FormatInt(totalTeachers, 10)})
	w.Write([]string{"赛事总数", strconv.FormatInt(totalCompetitions, 10)})
	w.Write([]string{"进行中赛事", strconv.FormatInt(ongoingComp, 10)})
	w.Write([]string{"已发布赛事", strconv.FormatInt(publishedComp, 10)})
	w.Write([]string{"团队总数", strconv.FormatInt(totalTeams, 10)})
	w.Write([]string{"奖项总数", strconv.FormatInt(totalAwards, 10)})
	w.Write([]string{"预案总数", strconv.FormatInt(totalPrePlans, 10)})
	w.Write([]string{"评价总数", strconv.FormatInt(totalEvals, 10)})
	w.Flush()
}

// LeaderboardEntry holds a team's ranking data.
type LeaderboardEntry struct {
	Rank             int     `json:"rank"`
	TeamID           uint    `json:"team_id"`
	TeamName         string  `json:"team_name"`
	LeaderName       string  `json:"leader_name"`
	CompetitionCount int64   `json:"competition_count"`
	AwardCount       int64   `json:"award_count"`
	PrePlanCount     int64   `json:"pre_plan_count"`
	Score            float64 `json:"score"`
}

// Leaderboard handles GET /leaderboard — returns teams ranked by activity and awards.
func (h *StatsHandler) Leaderboard(c *gin.Context) {
	db := database.GetDB()

	var teams []models.Team
	if err := db.Preload("Leader").Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teams"})
		return
	}

	entries := make([]LeaderboardEntry, len(teams))
	for i, team := range teams {
		var compCount int64
		db.Model(&models.Team{}).Where("name = ? AND leader_id = ?", team.Name, team.LeaderID).Count(&compCount)

		var awardCount int64
		db.Model(&models.Award{}).Where("team_id = ?", team.ID).Count(&awardCount)

		var prePlanCount int64
		db.Model(&models.PrePlan{}).Where("team_id = ?", team.ID).Count(&prePlanCount)

		// Score = awards * 10 + competitions * 3 + preplans * 1
		score := float64(awardCount)*10 + float64(compCount)*3 + float64(prePlanCount)

		leaderName := ""
		if team.LeaderID > 0 {
			leaderName = team.Leader.Name
		}

		entries[i] = LeaderboardEntry{
			TeamID:           team.ID,
			TeamName:         team.Name,
			LeaderName:       leaderName,
			CompetitionCount: compCount,
			AwardCount:       awardCount,
			PrePlanCount:     prePlanCount,
			Score:            score,
		}
	}

	// Sort by score descending
	for i := 0; i < len(entries); i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[j].Score > entries[i].Score {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}

	// Assign ranks
	for i := range entries {
		entries[i].Rank = i + 1
	}

	c.JSON(http.StatusOK, gin.H{"leaderboard": entries})
}

// ExportCompetitions handles GET /stats/export/competitions — returns per-competition stats as CSV.
func (h *StatsHandler) ExportCompetitions(c *gin.Context) {
	db := database.GetDB()

	var competitions []models.Competition
	if err := db.Order("id ASC").Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	filename := fmt.Sprintf("ssgl_competitions_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"ID", "赛事名称", "类型", "状态", "团队数", "预案数", "奖项数", "开始日期", "结束日期"})

	for _, comp := range competitions {
		var teamCount, prePlanCount, awardCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)
		db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&prePlanCount)
		db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

		startStr := ""
		if !comp.StartDate.IsZero() {
			startStr = comp.StartDate.Format("2006-01-02")
		}
		endStr := ""
		if !comp.EndDate.IsZero() {
			endStr = comp.EndDate.Format("2006-01-02")
		}

		w.Write([]string{
			strconv.FormatUint(uint64(comp.ID), 10),
			comp.Title,
			comp.Type,
			comp.Status,
			strconv.FormatInt(teamCount, 10),
			strconv.FormatInt(prePlanCount, 10),
			strconv.FormatInt(awardCount, 10),
			startStr,
			endStr,
		})
	}
	w.Flush()
}

// ExportTeams handles GET /stats/export/teams — returns team data as CSV.
func (h *StatsHandler) ExportTeams(c *gin.Context) {
	db := database.GetDB()

	var teams []models.Team
	if err := db.Preload("Competition").Preload("Leader").Order("id ASC").Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teams"})
		return
	}

	filename := fmt.Sprintf("ssgl_teams_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"ID", "团队名称", "所属赛事", "队长", "成员数", "状态", "创建日期"})

	for _, team := range teams {
		var memberCount int64
		db.Model(&models.TeamMember{}).Where("team_id = ?", team.ID).Count(&memberCount)

		createdAt := ""
		if !team.CreatedAt.IsZero() {
			createdAt = team.CreatedAt.Format("2006-01-02")
		}

		compTitle := ""
		if team.Competition.ID > 0 {
			compTitle = team.Competition.Title
		}
		leaderName := ""
		if team.Leader.ID > 0 {
			leaderName = team.Leader.Username
		}

		w.Write([]string{
			strconv.FormatUint(uint64(team.ID), 10),
			team.Name,
			compTitle,
			leaderName,
			strconv.FormatInt(memberCount, 10),
			team.Status,
			createdAt,
		})
	}
	w.Flush()
}

// TypeDistribution holds competition count by type.
type TypeDistribution struct {
	Type  string `json:"type"`
	Count int64  `json:"count"`
}

// TypeDistribution handles GET /stats/type-distribution — returns competition counts grouped by type.
func (h *StatsHandler) TypeDistribution(c *gin.Context) {
	db := database.GetDB()

	var results []TypeDistribution
	db.Model(&models.Competition{}).
		Select("type, COUNT(*) as count").
		Group("type").
		Order("count DESC").
		Scan(&results)

	c.JSON(http.StatusOK, gin.H{"types": results})
}

// ActivityItem represents a single activity event in the feed.
type ActivityItem struct {
	ID        uint   `json:"id"`
	Type      string `json:"type"` // competition, team, award, preplan, evaluation
	Title     string `json:"title"`
	Detail    string `json:"detail"`
	UserID    uint   `json:"user_id,omitempty"`
	UserName  string `json:"user_name,omitempty"`
	CreatedAt string `json:"created_at"`
}

// RecentActivity handles GET /stats/recent-activity — returns the latest activity events.
func (h *StatsHandler) RecentActivity(c *gin.Context) {
	db := database.GetDB()

	limit := 20
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 && l <= 50 {
		limit = l
	}

	var activities []ActivityItem

	// Recent competitions
	var comps []models.Competition
	db.Order("created_at DESC").Limit(limit).Find(&comps)
	for _, comp := range comps {
		activities = append(activities, ActivityItem{
			ID:        comp.ID,
			Type:      "competition",
			Title:     comp.Title,
			Detail:    "赛事类型: " + comp.Type + ", 状态: " + comp.Status,
			UserID:    comp.OrganizerID,
			CreatedAt: comp.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	// Recent teams
	var teams []models.Team
	db.Preload("Leader").Preload("Competition").Order("created_at DESC").Limit(limit).Find(&teams)
	for _, team := range teams {
		leaderName := ""
		if team.LeaderID > 0 {
			leaderName = team.Leader.Name
		}
		compTitle := ""
		if team.Competition.ID > 0 {
			compTitle = team.Competition.Title
		}
		detail := "队长: " + leaderName
		if compTitle != "" {
			detail += ", 赛事: " + compTitle
		}
		activities = append(activities, ActivityItem{
			ID:        team.ID,
			Type:      "team",
			Title:     team.Name,
			Detail:    detail,
			UserID:    team.LeaderID,
			UserName:  leaderName,
			CreatedAt: team.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	// Recent awards
	var awards []models.Award
	db.Preload("Team").Order("created_at DESC").Limit(limit).Find(&awards)
	for _, award := range awards {
		teamName := ""
		if award.Team.ID > 0 {
			teamName = award.Team.Name
		}
		activities = append(activities, ActivityItem{
			ID:    award.ID,
			Type:  "award",
			Title: award.PrizeName,
			Detail: "团队: " + teamName + ", 奖项: " + award.RankName + ", 奖金: ¥" +
				strconv.FormatFloat(award.PrizeAmount, 'f', 0, 64),
			CreatedAt: award.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	// Recent pre-plans
	var preplans []models.PrePlan
	db.Preload("Team").Order("created_at DESC").Limit(limit).Find(&preplans)
	for _, pp := range preplans {
		teamName := ""
		if pp.Team.ID > 0 {
			teamName = pp.Team.Name
		}
		activities = append(activities, ActivityItem{
			ID:        pp.ID,
			Type:      "preplan",
			Title:     pp.Title,
			Detail:    "团队: " + teamName + ", 状态: " + pp.Status,
			CreatedAt: pp.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	// Sort all activities by CreatedAt descending (simple bubble sort for small N)
	for i := 0; i < len(activities); i++ {
		for j := i + 1; j < len(activities); j++ {
			if activities[j].CreatedAt > activities[i].CreatedAt {
				activities[i], activities[j] = activities[j], activities[i]
			}
		}
	}

	// Trim to limit
	if len(activities) > limit {
		activities = activities[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
		"total":      len(activities),
	})
}

// TrendPoint holds one month's aggregate counts.
type TrendPoint struct {
	Month         string  `json:"month"`          // "2026-01"
	Competitions  int64   `json:"competitions"`
	Teams         int64   `json:"teams"`
	Awards        int64   `json:"awards"`
	PrePlans      int64   `json:"pre_plans"`
	PrizeAmount   float64 `json:"prize_amount"`
}

// Trends handles GET /stats/trends — returns monthly time-series data
// for competitions, teams, awards, and pre-plans over the last N months.
func (h *StatsHandler) Trends(c *gin.Context) {
	db := database.GetDB()

	// Default to 12 months
	monthsStr := c.DefaultQuery("months", "12")
	months := 12
	if m, err := strconv.Atoi(monthsStr); err == nil && m > 0 && m <= 24 {
		months = m
	}

	startDate := time.Now().AddDate(0, -months, 0)
	startDate = time.Date(startDate.Year(), startDate.Month(), 1, 0, 0, 0, 0, time.UTC)

	// Build list of month labels
	type monthKey struct{ year, month int }
	var points []TrendPoint
	cursor := startDate
	now := time.Now()
	for cursor.Before(now) || cursor.Format("2006-01") == now.Format("2006-01") {
		label := cursor.Format("2006-01")
		nextMonth := cursor.AddDate(0, 1, 0)

		var compCount int64
		db.Model(&models.Competition{}).
			Where("created_at >= ? AND created_at < ?", cursor, nextMonth).
			Count(&compCount)

		var teamCount int64
		db.Model(&models.Team{}).
			Where("created_at >= ? AND created_at < ?", cursor, nextMonth).
			Count(&teamCount)

		var awardCount int64
		db.Model(&models.Award{}).
			Where("created_at >= ? AND created_at < ?", cursor, nextMonth).
			Count(&awardCount)

		var prePlanCount int64
		db.Model(&models.PrePlan{}).
			Where("created_at >= ? AND created_at < ?", cursor, nextMonth).
			Count(&prePlanCount)

		var prizeAmount float64
		db.Model(&models.Award{}).
			Where("created_at >= ? AND created_at < ?", cursor, nextMonth).
			Select("COALESCE(SUM(prize_amount), 0)").
			Row().Scan(&prizeAmount)

		points = append(points, TrendPoint{
			Month:        label,
			Competitions: compCount,
			Teams:        teamCount,
			Awards:       awardCount,
			PrePlans:     prePlanCount,
			PrizeAmount:  prizeAmount,
		})

		cursor = nextMonth
	}

	c.JSON(http.StatusOK, gin.H{
		"trends": points,
		"total":  len(points),
	})
}

// EngagementStats represents platform engagement metrics.
type EngagementStats struct {
	TotalStudents      int64   `json:"total_students"`
	StudentsWithTeams  int64   `json:"students_with_teams"`
	TeamFormationRate  float64 `json:"team_formation_rate"`
	TotalPrePlans      int64   `json:"total_pre_plans"`
	ReviewedPrePlans   int64   `json:"reviewed_pre_plans"`
	AIReviewRate       float64 `json:"ai_review_rate"`
	AvgPrePlanScore    float64 `json:"avg_pre_plan_score"`
	TotalCompetitions  int64   `json:"total_competitions"`
	PublishedComps     int64   `json:"published_competitions"`
	CompletionRate     float64 `json:"completion_rate"`
	TotalTeams         int64   `json:"total_teams"`
	AvgTeamSize        float64 `json:"avg_team_size"`
	ActiveCompetitions int64   `json:"active_competitions"`
}

// Engagement handles GET /stats/engagement — returns platform engagement metrics.
func (h *StatsHandler) Engagement(c *gin.Context) {
	db := database.GetDB()

	var totalStudents int64
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)

	var studentsWithTeams int64
	db.Raw(`SELECT COUNT(DISTINCT user_id) FROM team_members tm
		INNER JOIN users u ON u.id = tm.user_id AND u.role = 'student'`).Scan(&studentsWithTeams)

	var totalPrePlans int64
	db.Model(&models.PrePlan{}).Count(&totalPrePlans)

	var reviewedPrePlans int64
	db.Model(&models.PrePlan{}).Where("ai_review_score IS NOT NULL AND ai_review_score > 0").Count(&reviewedPrePlans)

	var avgScore float64
	db.Model(&models.PrePlan{}).
		Where("ai_review_score IS NOT NULL AND ai_review_score > 0").
		Select("COALESCE(AVG(ai_review_score), 0)").
		Row().Scan(&avgScore)

	var totalCompetitions int64
	db.Model(&models.Competition{}).Count(&totalCompetitions)

	var publishedComps int64
	db.Model(&models.Competition{}).Where("status IN ?", []string{models.CompStatusPublished, models.CompStatusOngoing, "completed"}).Count(&publishedComps)

	var completedComps int64
	db.Model(&models.Competition{}).Where("status = ?", "completed").Count(&completedComps)

	var totalTeams int64
	db.Model(&models.Team{}).Count(&totalTeams)

	var avgTeamSize float64
	db.Raw(`SELECT COALESCE(AVG(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM team_members GROUP BY team_id) sub`).Scan(&avgTeamSize)

	var activeCompetitions int64
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusOngoing).Count(&activeCompetitions)

	teamFormationRate := float64(0)
	if totalStudents > 0 {
		teamFormationRate = float64(studentsWithTeams) / float64(totalStudents) * 100
	}

	aiReviewRate := float64(0)
	if totalPrePlans > 0 {
		aiReviewRate = float64(reviewedPrePlans) / float64(totalPrePlans) * 100
	}

	completionRate := float64(0)
	if publishedComps > 0 {
		completionRate = float64(completedComps) / float64(publishedComps) * 100
	}

	c.JSON(http.StatusOK, EngagementStats{
		TotalStudents:      totalStudents,
		StudentsWithTeams:  studentsWithTeams,
		TeamFormationRate:  teamFormationRate,
		TotalPrePlans:      totalPrePlans,
		ReviewedPrePlans:   reviewedPrePlans,
		AIReviewRate:       aiReviewRate,
		AvgPrePlanScore:    avgScore,
		TotalCompetitions:  totalCompetitions,
		PublishedComps:     publishedComps,
		CompletionRate:     completionRate,
		TotalTeams:         totalTeams,
		AvgTeamSize:        avgTeamSize,
		ActiveCompetitions: activeCompetitions,
	})
}

// ============================================================
// Competition Kanban Board — innovation feature
// ============================================================

// KanbanColumn represents one column (status stage) on the kanban board.
type KanbanColumn struct {
	Status       string                  `json:"status"`
	Label        string                  `json:"label"`
	Count        int                     `json:"count"`
	Competitions []KanbanCompetition     `json:"competitions"`
}

// KanbanCompetition is a lightweight competition card for the kanban board.
type KanbanCompetition struct {
	ID            uint    `json:"id"`
	Title         string  `json:"title"`
	Type          string  `json:"type"`
	TeamCount     int     `json:"team_count"`
	StudentCount  int     `json:"student_count"`
	PreplanCount  int     `json:"preplan_count"`
	AwardCount    int     `json:"award_count"`
	Progress      float64 `json:"progress"`
	StartDate     string  `json:"start_date"`
	EndDate       string  `json:"end_date"`
	DaysRemaining int     `json:"days_remaining"`
}

// KanbanBoard handles GET /stats/kanban — returns competitions grouped by status
// for a kanban-style progress dashboard.
func (h *StatsHandler) KanbanBoard(c *gin.Context) {
	db := database.GetDB()

	statusOrder := []struct {
		status string
		label  string
	}{
		{models.CompStatusDraft, "草稿"},
		{models.CompStatusPublished, "已发布"},
		{models.CompStatusOngoing, "进行中"},
		{models.CompStatusCompleted, "已完成"},
	}

	columns := make([]KanbanColumn, 0, len(statusOrder))
	now := time.Now()

	for _, stage := range statusOrder {
		var competitions []models.Competition
		db.Where("status = ?", stage.status).Order("start_date ASC").Find(&competitions)

		cards := make([]KanbanCompetition, 0, len(competitions))
		for _, comp := range competitions {
			// Team count
			var teamCount int64
			db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)

			// Student count
			var studentCount int64
			db.Raw("SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ?", comp.ID).Scan(&studentCount)

			// Preplan count
			var preplanCount int64
			db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&preplanCount)

			// Award count
			var awardCount int64
			db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

			// Progress calculation
			progress := float64(0)
			if stage.status == models.CompStatusCompleted {
				progress = 100
			} else if stage.status == models.CompStatusOngoing && !comp.StartDate.IsZero() && !comp.EndDate.IsZero() {
				total := comp.EndDate.Sub(comp.StartDate).Hours()
				elapsed := now.Sub(comp.StartDate).Hours()
				if total > 0 {
					progress = elapsed / total * 100
					if progress > 100 {
						progress = 100
					}
					if progress < 0 {
						progress = 0
					}
				}
			}

			// Days remaining
			daysRemaining := 0
			if !comp.EndDate.IsZero() && comp.EndDate.After(now) {
				daysRemaining = int(comp.EndDate.Sub(now).Hours() / 24)
			}

			startDate := ""
			endDate := ""
			if !comp.StartDate.IsZero() {
				startDate = comp.StartDate.Format("2006-01-02")
			}
			if !comp.EndDate.IsZero() {
				endDate = comp.EndDate.Format("2006-01-02")
			}

			cards = append(cards, KanbanCompetition{
				ID:            comp.ID,
				Title:         comp.Title,
				Type:          comp.Type,
				TeamCount:     int(teamCount),
				StudentCount:  int(studentCount),
				PreplanCount:  int(preplanCount),
				AwardCount:    int(awardCount),
				Progress:      progress,
				StartDate:     startDate,
				EndDate:       endDate,
				DaysRemaining: daysRemaining,
			})
		}

		columns = append(columns, KanbanColumn{
			Status:       stage.status,
			Label:        stage.label,
			Count:        len(cards),
			Competitions: cards,
		})
	}

	c.JSON(http.StatusOK, gin.H{"columns": columns})
}

// CountdownItem represents an upcoming competition deadline.
type CountdownItem struct {
	ID             uint   `json:"id"`
	Title          string `json:"title"`
	Type           string `json:"type"`
	Status         string `json:"status"`
	StartDate      string `json:"start_date"`
	EndDate        string `json:"end_date"`
	DaysUntilStart int    `json:"days_until_start"`
	DaysUntilEnd   int    `json:"days_until_end"`
	Phase          string `json:"phase"` // "upcoming", "registration", "ongoing", "ending"
	Location       string `json:"location"`
	Prize          string `json:"prize"`
}

// Countdown handles GET /stats/countdown — returns upcoming competitions
// sorted by urgency (nearest deadline first). Includes registration deadlines,
// start dates, and end dates. Useful for dashboard widgets and notifications.
func (h *StatsHandler) Countdown(c *gin.Context) {
	db := database.GetDB()

	var competitions []models.Competition
	if err := db.
		Where("status IN ?", []string{models.CompStatusPublished, models.CompStatusOngoing}).
		Order("start_date ASC").
		Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	now := time.Now()
	var items []CountdownItem

	for _, comp := range competitions {
		daysUntilStart := int(comp.StartDate.Sub(now).Hours() / 24)
		daysUntilEnd := int(comp.EndDate.Sub(now).Hours() / 24)

		phase := "upcoming"
		if comp.Status == models.CompStatusOngoing {
			phase = "ongoing"
			if daysUntilEnd <= 7 {
				phase = "ending"
			}
		} else if !comp.RegistrationDeadline.IsZero() && now.Before(comp.RegistrationDeadline) {
			phase = "registration"
		}

		if daysUntilStart < -1 {
			continue // Skip competitions that started more than 1 day ago
		}

		items = append(items, CountdownItem{
			ID:             comp.ID,
			Title:          comp.Title,
			Type:           comp.Type,
			Status:         comp.Status,
			StartDate:      comp.StartDate.Format("2006-01-02"),
			EndDate:        comp.EndDate.Format("2006-01-02"),
			DaysUntilStart: daysUntilStart,
			DaysUntilEnd:   daysUntilEnd,
			Phase:          phase,
			Location:       comp.Location,
			Prize:          comp.Prize,
		})
	}

	// Sort: ongoing-ending first, then by days_until_start ascending
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			pi, pj := phasePriority(items[i].Phase), phasePriority(items[j].Phase)
			if pj < pi || (pj == pi && items[j].DaysUntilStart < items[i].DaysUntilStart) {
				items[i], items[j] = items[j], items[i]
			}
		}
	}

	// Limit to 10 items
	limit := 10
	if len(items) < limit {
		limit = len(items)
	}

	c.JSON(http.StatusOK, gin.H{
		"countdown": items[:limit],
		"total":     len(items),
	})
}

// ────────────────────────────────────────────────────────────
// Competition Popularity Index
// ────────────────────────────────────────────────────────────

// PopularityItem represents a competition with a computed popularity score.
type PopularityItem struct {
	ID              uint    `json:"id"`
	Title           string  `json:"title"`
	Type            string  `json:"type"`
	Status          string  `json:"status"`
	TeamCount       int     `json:"team_count"`
	StudentCount    int     `json:"student_count"`
	RegistrationCnt int     `json:"registration_count"`
	PrePlanCount    int     `json:"preplan_count"`
	AwardCount      int     `json:"award_count"`
	PopularityScore float64 `json:"popularity_score"`
	Rank            int     `json:"rank"`
}

// Popularity handles GET /stats/popularity — returns competitions ranked by a
// composite popularity score.  Score formula (weights tunable):
//
//	score = teams×3 + students×2 + registrations×1.5 + preplans×2 + awards×4
//
// Returns top-N competitions (default limit=10, max=50).
func (h *StatsHandler) Popularity(c *gin.Context) {
	db := database.GetDB()

	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	var competitions []models.Competition
	if err := db.Order("id ASC").Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	var items []PopularityItem
	for _, comp := range competitions {
		var teamCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)

		var studentCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).
			Distinct("captain_id").Count(&studentCount)

		var regCount int64
		db.Model(&models.CompetitionRegistration{}).Where("competition_id = ?", comp.ID).Count(&regCount)

		var preplanCount int64
		db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&preplanCount)

		var awardCount int64
		db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

		score := float64(teamCount)*3.0 + float64(studentCount)*2.0 +
			float64(regCount)*1.5 + float64(preplanCount)*2.0 + float64(awardCount)*4.0

		items = append(items, PopularityItem{
			ID:              comp.ID,
			Title:           comp.Title,
			Type:            comp.Type,
			Status:          comp.Status,
			TeamCount:       int(teamCount),
			StudentCount:    int(studentCount),
			RegistrationCnt: int(regCount),
			PrePlanCount:    int(preplanCount),
			AwardCount:      int(awardCount),
			PopularityScore: score,
		})
	}

	// Sort by score descending (simple insertion sort, fine for small N).
	for i := 1; i < len(items); i++ {
		for j := i; j > 0 && items[j].PopularityScore > items[j-1].PopularityScore; j-- {
			items[j], items[j-1] = items[j-1], items[j]
		}
	}

	// Assign ranks and limit.
	for i := range items {
		items[i].Rank = i + 1
	}
	if len(items) > limit {
		items = items[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"competitions": items,
		"total":        len(items),
		"formula":      "teams×3 + students×2 + registrations×1.5 + preplans×2 + awards×4",
	})
}

// phasePriority returns a sort priority for competition phases (lower = more urgent).
func phasePriority(phase string) int {
	switch phase {
	case "ending":
		return 0
	case "ongoing":
		return 1
	case "registration":
		return 2
	case "upcoming":
		return 3
	default:
		return 4
	}
}
