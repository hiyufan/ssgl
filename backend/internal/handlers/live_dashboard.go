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

// LiveDashboardHandler serves the real-time competition dashboard.
type LiveDashboardHandler struct{}

func NewLiveDashboardHandler() *LiveDashboardHandler {
	return &LiveDashboardHandler{}
}

// LiveCompSummary is a summary of a single competition for the live dashboard.
type LiveCompSummary struct {
	ID             uint      `json:"id"`
	Title          string    `json:"title"`
	Type           string    `json:"type"`
	Status         string    `json:"status"`
	TeamCount      int       `json:"team_count"`
	StudentCount   int       `json:"student_count"`
	PreplanCount   int       `json:"preplan_count"`
	AwardCount     int       `json:"award_count"`
	RegCount       int       `json:"registration_count"`
	Phase          string    `json:"phase"`
	DaysRemaining  int       `json:"days_remaining"`
	Progress       float64   `json:"progress"`
	Deadline       time.Time `json:"deadline"`
	RecentActivity string    `json:"recent_activity"`
}

// LiveDashboardResponse is the JSON response for the live dashboard.
type LiveDashboardResponse struct {
	Summary         LiveDashSummary   `json:"summary"`
	Competitions    []LiveCompSummary `json:"competitions"`
	RecentEvents    []LiveDashEvent   `json:"recent_events"`
	TopTeams        []LiveDashTeam    `json:"top_teams"`
	HotCompetitions []LiveDashHot     `json:"hot_competitions"`
	Alerts          []LiveDashAlert   `json:"alerts"`
}

// LiveDashSummary is the overall platform summary.
type LiveDashSummary struct {
	TotalCompetitions  int     `json:"total_competitions"`
	ActiveCompetitions int     `json:"active_competitions"`
	TotalTeams         int     `json:"total_teams"`
	TotalStudents      int     `json:"total_students"`
	TotalPreplans      int     `json:"total_preplans"`
	TotalAwards        int     `json:"total_awards"`
	AIReviewRate       float64 `json:"ai_review_rate"`
	TeamFormationRate  float64 `json:"team_formation_rate"`
}

// LiveDashEvent represents a recent platform event.
type LiveDashEvent struct {
	Type      string `json:"type"`
	Summary   string `json:"summary"`
	Time      string `json:"time"`
	CompTitle string `json:"comp_title,omitempty"`
}

// LiveDashTeam is a team entry in the leaderboard.
type LiveDashTeam struct {
	ID            uint   `json:"id"`
	Name          string `json:"name"`
	CompTitle     string `json:"comp_title"`
	MemberCount   int    `json:"member_count"`
	AwardCount    int    `json:"award_count"`
	AchievePoints int    `json:"achievement_points"`
}

// LiveDashHot is a competition sorted by activity.
type LiveDashHot struct {
	ID        uint    `json:"id"`
	Title     string  `json:"title"`
	TeamCount int     `json:"team_count"`
	RegCount  int     `json:"registration_count"`
	HeatIndex float64 `json:"heat_index"`
	DaysLeft  int     `json:"days_left"`
}

// LiveDashAlert is an alert for the dashboard.
type LiveDashAlert struct {
	Level   string `json:"level"` // info, warning, critical
	Message string `json:"message"`
	CompID  uint   `json:"comp_id,omitempty"`
}

// GetDashboard handles GET /live-dashboard — returns a real-time aggregated view.
func (h *LiveDashboardHandler) GetDashboard(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	now := time.Now()
	resp := LiveDashboardResponse{
		Competitions:    []LiveCompSummary{},
		RecentEvents:    []LiveDashEvent{},
		TopTeams:        []LiveDashTeam{},
		HotCompetitions: []LiveDashHot{},
		Alerts:          []LiveDashAlert{},
	}

	// 1. Overall summary
	var totalComp, activeComp, totalTeams, totalStudents, totalPreplans, totalAwards int64
	db.Model(&models.Competition{}).Where("deleted_at IS NULL").Count(&totalComp)
	db.Model(&models.Competition{}).Where("status IN ? AND deleted_at IS NULL", []string{"published", "ongoing"}).Count(&activeComp)
	db.Model(&models.Team{}).Where("deleted_at IS NULL").Count(&totalTeams)
	db.Model(&models.User{}).Where("role = ?", "student").Count(&totalStudents)
	db.Model(&models.PrePlan{}).Where("deleted_at IS NULL").Count(&totalPreplans)
	db.Model(&models.Award{}).Where("deleted_at IS NULL").Count(&totalAwards)

	// AI review rate
	var aiReviewed int64
	db.Model(&models.PrePlan{}).Where("ai_review_score > 0 AND deleted_at IS NULL").Count(&aiReviewed)
	aiReviewRate := 0.0
	if totalPreplans > 0 {
		aiReviewRate = float64(aiReviewed) / float64(totalPreplans) * 100
	}

	// Team formation rate (students who are in at least one team)
	var studentsWithTeam int64
	db.Raw(`SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm 
		JOIN users u ON u.id = tm.user_id AND u.role = 'student'`).Scan(&studentsWithTeam)
	teamFormationRate := 0.0
	if totalStudents > 0 {
		teamFormationRate = float64(studentsWithTeam) / float64(totalStudents) * 100
	}

	resp.Summary = LiveDashSummary{
		TotalCompetitions:  int(totalComp),
		ActiveCompetitions: int(activeComp),
		TotalTeams:         int(totalTeams),
		TotalStudents:      int(totalStudents),
		TotalPreplans:      int(totalPreplans),
		TotalAwards:        int(totalAwards),
		AIReviewRate:       aiReviewRate,
		TeamFormationRate:  teamFormationRate,
	}

	// 2. Active competition summaries — single aggregated query
	type compAggRow struct {
		ID           uint      `json:"id"`
		Title        string    `json:"title"`
		Type         string    `json:"type"`
		Status       string    `json:"status"`
		StartDate    time.Time `json:"start_date"`
		EndDate      time.Time `json:"end_date"`
		TeamCnt      int64     `json:"team_cnt"`
		RegCnt       int64     `json:"reg_cnt"`
		PreplanCnt   int64     `json:"preplan_cnt"`
		AwardCnt     int64     `json:"award_cnt"`
		StudentCnt   int64     `json:"student_cnt"`
		LatestTeam   string    `json:"latest_team"`
	}
	var compAggs []compAggRow
	db.Raw(`SELECT
		c.id, c.title, c.type, c.status, c.start_date, c.end_date,
		(SELECT COUNT(*) FROM teams WHERE competition_id = c.id AND deleted_at IS NULL) as team_cnt,
		(SELECT COUNT(*) FROM competition_registrations WHERE competition_id = c.id AND deleted_at IS NULL) as reg_cnt,
		(SELECT COUNT(*) FROM pre_plans WHERE competition_id = c.id AND deleted_at IS NULL) as preplan_cnt,
		(SELECT COUNT(*) FROM awards WHERE competition_id = c.id AND deleted_at IS NULL) as award_cnt,
		(SELECT COUNT(DISTINCT tm.user_id) FROM team_members tm
			JOIN teams t ON t.id = tm.team_id AND t.competition_id = c.id AND t.deleted_at IS NULL) as student_cnt,
		COALESCE((SELECT name FROM teams WHERE competition_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1), '') as latest_team
	FROM competitions c
	WHERE c.status IN ('published','ongoing','draft') AND c.deleted_at IS NULL
	ORDER BY c.created_at DESC LIMIT 20`).Scan(&compAggs)

	for _, agg := range compAggs {
		comp := models.Competition{
			ID: agg.ID, Title: agg.Title, Type: agg.Type, Status: agg.Status,
			StartDate: agg.StartDate, EndDate: agg.EndDate,
		}

		// Determine phase and days remaining
		phase := "draft"
		daysRemaining := 0
		progress := 0.0
		deadline := comp.EndDate

		switch comp.Status {
		case "draft":
			phase = "draft"
		case "published":
			if now.Before(comp.StartDate) {
				phase = "upcoming"
				daysRemaining = int(comp.StartDate.Sub(now).Hours() / 24)
				deadline = comp.StartDate
			} else {
				phase = "in_progress"
				if !comp.EndDate.IsZero() {
					total := comp.EndDate.Sub(comp.StartDate).Hours()
					elapsed := now.Sub(comp.StartDate).Hours()
					if total > 0 {
						progress = elapsed / total * 100
						if progress > 100 {
							progress = 100
						}
					}
					daysRemaining = int(comp.EndDate.Sub(now).Hours() / 24)
				}
			}
		case "ongoing":
			phase = "in_progress"
			if !comp.EndDate.IsZero() {
				total := comp.EndDate.Sub(comp.StartDate).Hours()
				elapsed := now.Sub(comp.StartDate).Hours()
				if total > 0 {
					progress = elapsed / total * 100
					if progress > 100 {
						progress = 100
					}
				}
				daysRemaining = int(comp.EndDate.Sub(now).Hours() / 24)
			}
		case "completed":
			phase = "completed"
			progress = 100
		}

		if daysRemaining < 0 {
			daysRemaining = 0
		}

		// Recent activity from pre-fetched data
		recentAct := ""
		if agg.LatestTeam != "" {
			recentAct = "团队「" + agg.LatestTeam + "」最近加入"
		}

		resp.Competitions = append(resp.Competitions, LiveCompSummary{
			ID:             comp.ID,
			Title:          comp.Title,
			Type:           comp.Type,
			Status:         comp.Status,
			TeamCount:      int(agg.TeamCnt),
			StudentCount:   int(agg.StudentCnt),
			PreplanCount:   int(agg.PreplanCnt),
			AwardCount:     int(agg.AwardCnt),
			RegCount:       int(agg.RegCnt),
			Phase:          phase,
			DaysRemaining:  daysRemaining,
			Progress:       progress,
			Deadline:       deadline,
			RecentActivity: recentAct,
		})
	}

	// 3. Recent events (last 15) — bulk fetch competition titles
	var recentTeams []models.Team
	db.Order("created_at DESC").Limit(5).Find(&recentTeams)

	var recentPreplans []models.PrePlan
	db.Order("created_at DESC").Limit(5).Find(&recentPreplans)

	var recentAwards []models.Award
	db.Order("created_at DESC").Limit(5).Find(&recentAwards)

	// Collect all competition IDs and fetch titles in one query
	compIDs := make(map[uint]bool)
	for _, t := range recentTeams {
		compIDs[t.CompetitionID] = true
	}
	for _, p := range recentPreplans {
		compIDs[p.CompetitionID] = true
	}
	for _, a := range recentAwards {
		compIDs[a.CompetitionID] = true
	}
	idList := make([]uint, 0, len(compIDs))
	for id := range compIDs {
		idList = append(idList, id)
	}
	compTitleMap := make(map[uint]string)
	if len(idList) > 0 {
		var compsForTitle []models.Competition
		db.Where("id IN ?", idList).Find(&compsForTitle)
		for _, ct := range compsForTitle {
			compTitleMap[ct.ID] = ct.Title
		}
	}

	for _, t := range recentTeams {
		resp.RecentEvents = append(resp.RecentEvents, LiveDashEvent{
			Type:      "team_create",
			Summary:   "新团队「" + t.Name + "」组建",
			Time:      t.CreatedAt.Format(time.RFC3339),
			CompTitle: compTitleMap[t.CompetitionID],
		})
	}

	for _, p := range recentPreplans {
		resp.RecentEvents = append(resp.RecentEvents, LiveDashEvent{
			Type:      "preplan_submit",
			Summary:   "预案「" + p.Title + "」提交",
			Time:      p.CreatedAt.Format(time.RFC3339),
			CompTitle: compTitleMap[p.CompetitionID],
		})
	}

	for _, a := range recentAwards {
		resp.RecentEvents = append(resp.RecentEvents, LiveDashEvent{
			Type:      "award",
			Summary:   "奖项「" + a.PrizeName + "」颁发",
			Time:      a.CreatedAt.Format(time.RFC3339),
			CompTitle: compTitleMap[a.CompetitionID],
		})
	}

	// Sort recent events by time descending
	sort.Slice(resp.RecentEvents, func(i, j int) bool {
		return resp.RecentEvents[i].Time > resp.RecentEvents[j].Time
	})
	if len(resp.RecentEvents) > 15 {
		resp.RecentEvents = resp.RecentEvents[:15]
	}

	// 4. Top teams (by achievement points)
	type teamRow struct {
		ID      uint
		Name    string
		CompID  uint
		Members int64
		Awards  int64
		Points  int64
	}
	var topTeamRows []teamRow
	db.Raw(`SELECT t.id, t.name, t.competition_id as comp_id,
		(SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as members,
		(SELECT COUNT(*) FROM awards a WHERE a.team_id = t.id AND a.deleted_at IS NULL) as awards,
		COALESCE((SELECT SUM(ap.points) FROM achievement_points ap 
			JOIN team_members tm2 ON tm2.user_id = ap.user_id WHERE tm2.team_id = t.id), 0) as points
		FROM teams t WHERE t.deleted_at IS NULL 
		ORDER BY points DESC, awards DESC LIMIT 10`).Scan(&topTeamRows)

	// Bulk fetch competition titles for top teams
	topCompIDs := make(map[uint]bool)
	for _, tr := range topTeamRows {
		topCompIDs[tr.CompID] = true
	}
	topIDList := make([]uint, 0, len(topCompIDs))
	for id := range topCompIDs {
		topIDList = append(topIDList, id)
	}
	topCompTitles := make(map[uint]string)
	if len(topIDList) > 0 {
		var topComps []models.Competition
		db.Where("id IN ?", topIDList).Find(&topComps)
		for _, tc := range topComps {
			topCompTitles[tc.ID] = tc.Title
		}
	}

	for _, tr := range topTeamRows {
		resp.TopTeams = append(resp.TopTeams, LiveDashTeam{
			ID:            tr.ID,
			Name:          tr.Name,
			CompTitle:     topCompTitles[tr.CompID],
			MemberCount:   int(tr.Members),
			AwardCount:    int(tr.Awards),
			AchievePoints: int(tr.Points),
		})
	}

	// 5. Hot competitions (by team count + registrations)
	type hotRow struct {
		ID      uint
		Title   string
		Teams   int64
		Regs    int64
		EndDate time.Time
	}
	var hotRows []hotRow
	db.Raw(`SELECT c.id, c.title,
		(SELECT COUNT(*) FROM teams t WHERE t.competition_id = c.id AND t.deleted_at IS NULL) as teams,
		(SELECT COUNT(*) FROM competition_registrations r WHERE r.competition_id = c.id AND r.deleted_at IS NULL) as regs,
		c.end_date
		FROM competitions c WHERE c.deleted_at IS NULL AND c.status IN ('published','ongoing')
		ORDER BY teams DESC, regs DESC LIMIT 10`).Scan(&hotRows)

	for _, hr := range hotRows {
		heatIndex := float64(hr.Teams)*3 + float64(hr.Regs)*1.5
		daysLeft := int(hr.EndDate.Sub(now).Hours() / 24)
		if daysLeft < 0 {
			daysLeft = 0
		}
		resp.HotCompetitions = append(resp.HotCompetitions, LiveDashHot{
			ID:        hr.ID,
			Title:     hr.Title,
			TeamCount: int(hr.Teams),
			RegCount:  int(hr.Regs),
			HeatIndex: heatIndex,
			DaysLeft:  daysLeft,
		})
	}

	// 6. Alerts
	for _, cs := range resp.Competitions {
		if cs.DaysRemaining > 0 && cs.DaysRemaining <= 7 {
			resp.Alerts = append(resp.Alerts, LiveDashAlert{
				Level:   "warning",
				Message: "赛事「" + cs.Title + "」距截止仅剩 " + fmt.Sprintf("%d", cs.DaysRemaining) + " 天",
				CompID:  cs.ID,
			})
		}
		if cs.Phase == "upcoming" && cs.TeamCount == 0 {
			resp.Alerts = append(resp.Alerts, LiveDashAlert{
				Level:   "info",
				Message: "赛事「" + cs.Title + "」暂无团队报名",
				CompID:  cs.ID,
			})
		}
	}

	c.JSON(http.StatusOK, resp)
}
