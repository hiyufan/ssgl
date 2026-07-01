package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"sort"
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

	// Batch user counts into one query
	type userCounts struct {
		Total    int64
		Students int64
		Teachers int64
	}
	var uc userCounts
	db.Raw(`SELECT
		COUNT(*) as total,
		COUNT(*) FILTER (WHERE role = ?) as students,
		COUNT(*) FILTER (WHERE role = ?) as teachers
	FROM users WHERE deleted_at IS NULL`, models.RoleStudent, models.RoleTeacher).Scan(&uc)

	// Batch competition counts into one query
	type compCounts struct {
		Total     int64
		Ongoing   int64
		Published int64
	}
	var cc compCounts
	db.Raw(`SELECT
		COUNT(*) as total,
		COUNT(*) FILTER (WHERE status = ?) as ongoing,
		COUNT(*) FILTER (WHERE status = ?) as published
	FROM competitions WHERE deleted_at IS NULL`, models.CompStatusOngoing, models.CompStatusPublished).Scan(&cc)

	// Batch remaining counts into one query
	type otherCounts struct {
		Teams        int64
		Awards       int64
		PrePlans     int64
		Evaluations  int64
		SettledAwards int64
	}
	var oc otherCounts
	db.Raw(`SELECT
		(SELECT COUNT(*) FROM teams WHERE deleted_at IS NULL) as teams,
		(SELECT COUNT(*) FROM awards WHERE deleted_at IS NULL) as awards,
		(SELECT COUNT(*) FROM pre_plans WHERE deleted_at IS NULL) as pre_plans,
		(SELECT COUNT(*) FROM student_evaluations WHERE deleted_at IS NULL) as evaluations,
		(SELECT COUNT(*) FROM awards WHERE status = ? AND deleted_at IS NULL) as settled_awards
	`, models.AwardStatusSettled).Scan(&oc)

	c.JSON(http.StatusOK, gin.H{
		"total_users":              uc.Total,
		"total_students":           uc.Students,
		"total_teachers":           uc.Teachers,
		"total_competitions":       cc.Total,
		"total_teams":              oc.Teams,
		"ongoing_competitions":     cc.Ongoing,
		"total_awards":             oc.Awards,
		"total_pre_plans":          oc.PrePlans,
		"total_evaluations":        oc.Evaluations,
		"published_competitions":   cc.Published,
		"settled_awards":           oc.SettledAwards,
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

	var stats []CompetitionStats
	if err := db.Raw(`SELECT
		c.id, c.title, c.status,
		(SELECT COUNT(*) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) as team_count,
		(SELECT COUNT(*) FROM awards WHERE competition_id = c.id AND deleted_at IS NULL) as award_count,
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND deleted_at IS NULL) as pre_plan_count
	FROM competitions c WHERE c.deleted_at IS NULL ORDER BY c.id`).Scan(&stats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competition stats"})
		return
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

	// Single query: get all teachers with their evaluation aggregates
	type teacherAgg struct {
		ID               uint    `json:"id"`
		Name             string  `json:"name"`
		EvaluationCount  int64   `json:"evaluation_count"`
		AvgTeaching      float64 `json:"avg_teaching"`
		AvgCommunication float64 `json:"avg_communication"`
		AvgAvailability  float64 `json:"avg_availability"`
		AvgOverall       float64 `json:"avg_overall"`
	}

	var stats []teacherAgg
	if err := db.Raw(`SELECT
		u.id, u.name,
		COUNT(se.id) as evaluation_count,
		COALESCE(AVG(se.teaching), 0) as avg_teaching,
		COALESCE(AVG(se.communication), 0) as avg_communication,
		COALESCE(AVG(se.availability), 0) as avg_availability,
		COALESCE(AVG(se.overall), 0) as avg_overall
	FROM users u
	LEFT JOIN student_evaluations se ON se.teacher_id = u.id AND se.deleted_at IS NULL
	WHERE u.role = ? AND u.deleted_at IS NULL
	GROUP BY u.id, u.name
	ORDER BY u.id`, models.RoleTeacher).Scan(&stats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teacher stats"})
		return
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

	type progressRow struct {
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
	}

	var rows []progressRow
	if err := db.Raw(`SELECT
		c.id, c.title, c.status, c.type,
		COALESCE(TO_CHAR(c.start_date, 'YYYY-MM-DD'), '') as start_date,
		COALESCE(TO_CHAR(c.end_date, 'YYYY-MM-DD'), '') as end_date,
		(SELECT COUNT(*) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) as team_count,
		(SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm
			JOIN teams t ON t.id = tm.team_id
			WHERE t.competition_id = c.id) as student_count,
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND deleted_at IS NULL) as pre_plan_count,
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND status IN ('reviewed','approved') AND deleted_at IS NULL) as reviewed_count,
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND status = 'approved' AND deleted_at IS NULL) as approved_count,
		(SELECT COUNT(*) FROM awards WHERE competition_id = c.id AND deleted_at IS NULL) as award_count,
		(SELECT COUNT(*) FROM awards WHERE competition_id = c.id AND status = ? AND deleted_at IS NULL) as settled_count,
		(SELECT COALESCE(SUM(prize_amount), 0) FROM awards WHERE competition_id = c.id AND status = ? AND deleted_at IS NULL) as total_prize
	FROM competitions c WHERE c.deleted_at IS NULL ORDER BY c.id`,
		models.AwardStatusSettled, models.AwardStatusSettled).Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch progress"})
		return
	}

	progress := make([]CompetitionProgress, len(rows))
	for i, r := range rows {
		var progressPct float64
		if r.TeamCount > 0 {
			progressPct += 20
		}
		if r.PrePlanCount > 0 {
			progressPct += 30
		}
		if r.ReviewedCount > 0 {
			progressPct += 20
		}
		if r.AwardCount > 0 {
			progressPct += 20
		}
		progressPct += 10
		if progressPct > 100 {
			progressPct = 100
		}

		progress[i] = CompetitionProgress{
			ID:            r.ID,
			Title:         r.Title,
			Status:        r.Status,
			Type:          r.Type,
			StartDate:     r.StartDate,
			EndDate:       r.EndDate,
			TeamCount:     r.TeamCount,
			StudentCount:  r.StudentCount,
			PrePlanCount:  r.PrePlanCount,
			ReviewedCount: r.ReviewedCount,
			ApprovedCount: r.ApprovedCount,
			AwardCount:    r.AwardCount,
			SettledCount:  r.SettledCount,
			TotalPrize:    r.TotalPrize,
			Progress:      progressPct,
		}
	}

	c.JSON(http.StatusOK, gin.H{"competitions": progress})
}

// ExportOverview handles GET /stats/export/overview — returns platform stats as CSV.
func (h *StatsHandler) ExportOverview(c *gin.Context) {
	db := database.GetDB()

	type overviewCounts struct {
		TotalUsers    int64
		Students      int64
		Teachers      int64
		TotalComps    int64
		OngoingComps  int64
		PublishedComps int64
		Teams         int64
		Awards        int64
		PrePlans      int64
		Evals         int64
	}
	var oc overviewCounts
	db.Raw(`SELECT
		(SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
		(SELECT COUNT(*) FROM users WHERE role = ? AND deleted_at IS NULL) as students,
		(SELECT COUNT(*) FROM users WHERE role = ? AND deleted_at IS NULL) as teachers,
		(SELECT COUNT(*) FROM competitions WHERE deleted_at IS NULL) as total_comps,
		(SELECT COUNT(*) FROM competitions WHERE status = ? AND deleted_at IS NULL) as ongoing_comps,
		(SELECT COUNT(*) FROM competitions WHERE status = ? AND deleted_at IS NULL) as published_comps,
		(SELECT COUNT(*) FROM teams WHERE deleted_at IS NULL) as teams,
		(SELECT COUNT(*) FROM awards WHERE deleted_at IS NULL) as awards,
		(SELECT COUNT(*) FROM pre_plans WHERE deleted_at IS NULL) as pre_plans,
		(SELECT COUNT(*) FROM student_evaluations WHERE deleted_at IS NULL) as evals
	`, models.RoleStudent, models.RoleTeacher, models.CompStatusOngoing, models.CompStatusPublished).Scan(&oc)

	filename := fmt.Sprintf("ssgl_stats_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"指标", "数值"})
	w.Write([]string{"总用户数", strconv.FormatInt(oc.TotalUsers, 10)})
	w.Write([]string{"学生数", strconv.FormatInt(oc.Students, 10)})
	w.Write([]string{"教师数", strconv.FormatInt(oc.Teachers, 10)})
	w.Write([]string{"赛事总数", strconv.FormatInt(oc.TotalComps, 10)})
	w.Write([]string{"进行中赛事", strconv.FormatInt(oc.OngoingComps, 10)})
	w.Write([]string{"已发布赛事", strconv.FormatInt(oc.PublishedComps, 10)})
	w.Write([]string{"团队总数", strconv.FormatInt(oc.Teams, 10)})
	w.Write([]string{"奖项总数", strconv.FormatInt(oc.Awards, 10)})
	w.Write([]string{"预案总数", strconv.FormatInt(oc.PrePlans, 10)})
	w.Write([]string{"评价总数", strconv.FormatInt(oc.Evals, 10)})
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

	type leaderboardRow struct {
		TeamID           uint    `json:"team_id"`
		TeamName         string  `json:"team_name"`
		LeaderName       string  `json:"leader_name"`
		CompetitionCount int64   `json:"competition_count"`
		AwardCount       int64   `json:"award_count"`
		PrePlanCount     int64   `json:"pre_plan_count"`
		Score            float64 `json:"score"`
		Rank             int     `json:"rank"`
	}

	var entries []leaderboardRow
	if err := db.Raw(`SELECT
		t.id as team_id,
		t.name as team_name,
		COALESCE(u.name, '') as leader_name,
		(SELECT COUNT(*) FROM teams WHERE name = t.name AND leader_id = t.leader_id AND deleted_at IS NULL) as competition_count,
		(SELECT COUNT(*) FROM awards WHERE team_id = t.id AND deleted_at IS NULL) as award_count,
		(SELECT COUNT(*) FROM pre_plans WHERE team_id = t.id AND deleted_at IS NULL) as pre_plan_count,
		(SELECT COUNT(*) FROM awards WHERE team_id = t.id AND deleted_at IS NULL) * 10.0 +
		(SELECT COUNT(*) FROM teams WHERE name = t.name AND leader_id = t.leader_id AND deleted_at IS NULL) * 3.0 +
		(SELECT COUNT(*) FROM pre_plans WHERE team_id = t.id AND deleted_at IS NULL) * 1.0 as score
	FROM teams t
	LEFT JOIN users u ON u.id = t.leader_id
	WHERE t.deleted_at IS NULL
	ORDER BY score DESC`).Scan(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch leaderboard"})
		return
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

	type exportRow struct {
		ID           uint   `json:"id"`
		Title        string `json:"title"`
		Type         string `json:"type"`
		Status       string `json:"status"`
		TeamCount    int64  `json:"team_count"`
		PrePlanCount int64  `json:"pre_plan_count"`
		AwardCount   int64  `json:"award_count"`
		StartDate    string `json:"start_date"`
		EndDate      string `json:"end_date"`
	}

	var rows []exportRow
	if err := db.Raw(`SELECT
		c.id, c.title, c.type, c.status,
		(SELECT COUNT(*) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) as team_count,
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND deleted_at IS NULL) as pre_plan_count,
		(SELECT COUNT(*) FROM awards WHERE competition_id = c.id AND deleted_at IS NULL) as award_count,
		COALESCE(TO_CHAR(c.start_date, 'YYYY-MM-DD'), '') as start_date,
		COALESCE(TO_CHAR(c.end_date, 'YYYY-MM-DD'), '') as end_date
	FROM competitions c WHERE c.deleted_at IS NULL ORDER BY c.id`).Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	filename := fmt.Sprintf("ssgl_competitions_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"ID", "赛事名称", "类型", "状态", "团队数", "预案数", "奖项数", "开始日期", "结束日期"})

	for _, r := range rows {
		w.Write([]string{
			strconv.FormatUint(uint64(r.ID), 10),
			r.Title,
			r.Type,
			r.Status,
			strconv.FormatInt(r.TeamCount, 10),
			strconv.FormatInt(r.PrePlanCount, 10),
			strconv.FormatInt(r.AwardCount, 10),
			r.StartDate,
			r.EndDate,
		})
	}
	w.Flush()
}

// ExportTeams handles GET /stats/export/teams — returns team data as CSV.
func (h *StatsHandler) ExportTeams(c *gin.Context) {
	db := database.GetDB()

	type teamExportRow struct {
		ID          uint   `json:"id"`
		Name        string `json:"name"`
		CompTitle   string `json:"comp_title"`
		LeaderName  string `json:"leader_name"`
		MemberCount int64  `json:"member_count"`
		Status      string `json:"status"`
		CreatedAt   string `json:"created_at"`
	}

	var rows []teamExportRow
	if err := db.Raw(`SELECT
		t.id, t.name,
		COALESCE(c.title, '') as comp_title,
		COALESCE(u.username, '') as leader_name,
		(SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
		t.status,
		COALESCE(TO_CHAR(t.created_at, 'YYYY-MM-DD'), '') as created_at
	FROM teams t
	LEFT JOIN competitions c ON c.id = t.competition_id
	LEFT JOIN users u ON u.id = t.leader_id
	WHERE t.deleted_at IS NULL ORDER BY t.id`).Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teams"})
		return
	}

	filename := fmt.Sprintf("ssgl_teams_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"ID", "团队名称", "所属赛事", "队长", "成员数", "状态", "创建日期"})

	for _, r := range rows {
		w.Write([]string{
			strconv.FormatUint(uint64(r.ID), 10),
			r.Name,
			r.CompTitle,
			r.LeaderName,
			strconv.FormatInt(r.MemberCount, 10),
			r.Status,
			r.CreatedAt,
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

	// Sort all activities by CreatedAt descending
	sort.Slice(activities, func(i, j int) bool {
		return activities[i].CreatedAt > activities[j].CreatedAt
	})

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

	type monthAgg struct {
		Month       string  `json:"month"`
		Count       int64   `json:"count"`
		PrizeAmount float64 `json:"prize_amount"`
	}

	// 5 queries total (one per table) instead of 5*months
	var compAggs []monthAgg
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count, 0 as prize_amount
		FROM competitions WHERE deleted_at IS NULL AND created_at >= ?
		GROUP BY month ORDER BY month`, startDate).Scan(&compAggs)

	var teamAggs []monthAgg
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count, 0 as prize_amount
		FROM teams WHERE deleted_at IS NULL AND created_at >= ?
		GROUP BY month ORDER BY month`, startDate).Scan(&teamAggs)

	var awardAggs []monthAgg
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count,
		COALESCE(SUM(prize_amount), 0) as prize_amount
		FROM awards WHERE deleted_at IS NULL AND created_at >= ?
		GROUP BY month ORDER BY month`, startDate).Scan(&awardAggs)

	var preplanAggs []monthAgg
	db.Raw(`SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count, 0 as prize_amount
		FROM pre_plans WHERE deleted_at IS NULL AND created_at >= ?
		GROUP BY month ORDER BY month`, startDate).Scan(&preplanAggs)

	// Build lookup maps
	compMap := make(map[string]int64, len(compAggs))
	for _, a := range compAggs {
		compMap[a.Month] = a.Count
	}
	teamMap := make(map[string]int64, len(teamAggs))
	for _, a := range teamAggs {
		teamMap[a.Month] = a.Count
	}
	awardMap := make(map[string]int64, len(awardAggs))
	prizeMap := make(map[string]float64, len(awardAggs))
	for _, a := range awardAggs {
		awardMap[a.Month] = a.Count
		prizeMap[a.Month] = a.PrizeAmount
	}
	preplanMap := make(map[string]int64, len(preplanAggs))
	for _, a := range preplanAggs {
		preplanMap[a.Month] = a.Count
	}

	// Build the full month series
	var points []TrendPoint
	cursor := startDate
	now := time.Now()
	for cursor.Before(now) || cursor.Format("2006-01") == now.Format("2006-01") {
		label := cursor.Format("2006-01")
		points = append(points, TrendPoint{
			Month:        label,
			Competitions: compMap[label],
			Teams:        teamMap[label],
			Awards:       awardMap[label],
			PrePlans:     preplanMap[label],
			PrizeAmount:  prizeMap[label],
		})
		cursor = cursor.AddDate(0, 1, 0)
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

	// Query 1: user & competition counts
	type engCounts struct {
		TotalStudents      int64
		StudentsWithTeams  int64
		TotalPrePlans      int64
		ReviewedPrePlans   int64
		AvgPrePlanScore    float64
		TotalCompetitions  int64
		PublishedComps     int64
		CompletedComps     int64
		TotalTeams         int64
		ActiveCompetitions int64
	}
	var ec engCounts
	db.Raw(`SELECT
		(SELECT COUNT(*) FROM users WHERE role = ? AND deleted_at IS NULL) as total_students,
		(SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm
			INNER JOIN users u ON u.id = tm.user_id AND u.role = 'student') as students_with_teams,
		(SELECT COUNT(*) FROM pre_plans WHERE deleted_at IS NULL) as total_pre_plans,
		(SELECT COUNT(*) FROM pre_plans WHERE ai_review_score IS NOT NULL AND ai_review_score > 0 AND deleted_at IS NULL) as reviewed_pre_plans,
		(SELECT COALESCE(AVG(ai_review_score), 0) FROM pre_plans WHERE ai_review_score IS NOT NULL AND ai_review_score > 0 AND deleted_at IS NULL) as avg_pre_plan_score,
		(SELECT COUNT(*) FROM competitions WHERE deleted_at IS NULL) as total_competitions,
		(SELECT COUNT(*) FROM competitions WHERE status IN (?, ?, 'completed') AND deleted_at IS NULL) as published_comps,
		(SELECT COUNT(*) FROM competitions WHERE status = 'completed' AND deleted_at IS NULL) as completed_comps,
		(SELECT COUNT(*) FROM teams WHERE deleted_at IS NULL) as total_teams,
		(SELECT COUNT(*) FROM competitions WHERE status = ? AND deleted_at IS NULL) as active_competitions
	`, models.RoleStudent, models.CompStatusPublished, models.CompStatusOngoing, models.CompStatusOngoing).Scan(&ec)

	// Query 2: average team size
	var avgTeamSize float64
	db.Raw(`SELECT COALESCE(AVG(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM team_members GROUP BY team_id) sub`).Scan(&avgTeamSize)

	teamFormationRate := float64(0)
	if ec.TotalStudents > 0 {
		teamFormationRate = float64(ec.StudentsWithTeams) / float64(ec.TotalStudents) * 100
	}

	aiReviewRate := float64(0)
	if ec.TotalPrePlans > 0 {
		aiReviewRate = float64(ec.ReviewedPrePlans) / float64(ec.TotalPrePlans) * 100
	}

	completionRate := float64(0)
	if ec.PublishedComps > 0 {
		completionRate = float64(ec.CompletedComps) / float64(ec.PublishedComps) * 100
	}

	c.JSON(http.StatusOK, EngagementStats{
		TotalStudents:      ec.TotalStudents,
		StudentsWithTeams:  ec.StudentsWithTeams,
		TeamFormationRate:  teamFormationRate,
		TotalPrePlans:      ec.TotalPrePlans,
		ReviewedPrePlans:   ec.ReviewedPrePlans,
		AIReviewRate:       aiReviewRate,
		AvgPrePlanScore:    ec.AvgPrePlanScore,
		TotalCompetitions:  ec.TotalCompetitions,
		PublishedComps:     ec.PublishedComps,
		CompletionRate:     completionRate,
		TotalTeams:         ec.TotalTeams,
		AvgTeamSize:        avgTeamSize,
		ActiveCompetitions: ec.ActiveCompetitions,
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

	type kanbanRow struct {
		ID           uint    `json:"id"`
		Title        string  `json:"title"`
		Type         string  `json:"type"`
		Status       string  `json:"status"`
		TeamCount    int     `json:"team_count"`
		StudentCount int     `json:"student_count"`
		PreplanCount int     `json:"preplan_count"`
		AwardCount   int     `json:"award_count"`
		StartDate    string  `json:"start_date"`
		EndDate      string  `json:"end_date"`
	}

	var rows []kanbanRow
	db.Raw(`SELECT
		c.id, c.title, c.type, c.status,
		(SELECT COUNT(*) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) as team_count,
		(SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = c.id) as student_count,
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND deleted_at IS NULL) as preplan_count,
		(SELECT COUNT(*) FROM awards WHERE competition_id = c.id AND deleted_at IS NULL) as award_count,
		COALESCE(TO_CHAR(c.start_date, 'YYYY-MM-DD'), '') as start_date,
		COALESCE(TO_CHAR(c.end_date, 'YYYY-MM-DD'), '') as end_date
	FROM competitions c WHERE c.deleted_at IS NULL ORDER BY c.start_date ASC`).Scan(&rows)

	// Group by status
	statusOrder := []struct {
		status string
		label  string
	}{
		{models.CompStatusDraft, "草稿"},
		{models.CompStatusPublished, "已发布"},
		{models.CompStatusOngoing, "进行中"},
		{models.CompStatusCompleted, "已完成"},
	}

	now := time.Now()
	columns := make([]KanbanColumn, 0, len(statusOrder))

	for _, stage := range statusOrder {
		cards := make([]KanbanCompetition, 0)
		for _, r := range rows {
			if r.Status != stage.status {
				continue
			}

			progress := float64(0)
			if stage.status == models.CompStatusCompleted {
				progress = 100
			} else if stage.status == models.CompStatusOngoing && r.StartDate != "" && r.EndDate != "" {
				start, _ := time.Parse("2006-01-02", r.StartDate)
				end, _ := time.Parse("2006-01-02", r.EndDate)
				total := end.Sub(start).Hours()
				elapsed := now.Sub(start).Hours()
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

			daysRemaining := 0
			if r.EndDate != "" {
				end, _ := time.Parse("2006-01-02", r.EndDate)
				if end.After(now) {
					daysRemaining = int(end.Sub(now).Hours() / 24)
				}
			}

			cards = append(cards, KanbanCompetition{
				ID:            r.ID,
				Title:         r.Title,
				Type:          r.Type,
				TeamCount:     r.TeamCount,
				StudentCount:  r.StudentCount,
				PreplanCount:  r.PreplanCount,
				AwardCount:    r.AwardCount,
				Progress:      progress,
				StartDate:     r.StartDate,
				EndDate:       r.EndDate,
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
	sort.Slice(items, func(i, j int) bool {
		pi, pj := phasePriority(items[i].Phase), phasePriority(items[j].Phase)
		if pi != pj {
			return pi < pj
		}
		return items[i].DaysUntilStart < items[j].DaysUntilStart
	})

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

	type popRow struct {
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

	var items []popRow
	if err := db.Raw(`SELECT
		c.id, c.title, c.type, c.status,
		(SELECT COUNT(*) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) as team_count,
		(SELECT COUNT(DISTINCT leader_id) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) as student_count,
		(SELECT COUNT(*) FROM competition_registrations WHERE competition_id = c.id AND deleted_at IS NULL) as registration_count,
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND deleted_at IS NULL) as preplan_count,
		(SELECT COUNT(*) FROM awards WHERE competition_id = c.id AND deleted_at IS NULL) as award_count,
		(SELECT COUNT(*) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) * 3.0 +
		(SELECT COUNT(DISTINCT leader_id) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) * 2.0 +
		(SELECT COUNT(*) FROM competition_registrations WHERE competition_id = c.id AND deleted_at IS NULL) * 1.5 +
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND deleted_at IS NULL) * 2.0 +
		(SELECT COUNT(*) FROM awards WHERE competition_id = c.id AND deleted_at IS NULL) * 4.0 as popularity_score
	FROM competitions c WHERE c.deleted_at IS NULL
	ORDER BY popularity_score DESC
	LIMIT ?`, limit).Scan(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch popularity"})
		return
	}

	for i := range items {
		items[i].Rank = i + 1
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
