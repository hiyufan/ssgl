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
