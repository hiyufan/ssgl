package handlers

import (
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// AnalyticsHandler provides deep competition analytics.
type AnalyticsHandler struct{}

// NewAnalyticsHandler creates a new AnalyticsHandler.
func NewAnalyticsHandler() *AnalyticsHandler {
	return &AnalyticsHandler{}
}

// CompetitionAnalytics is the deep analytics for a single competition.
type CompetitionAnalytics struct {
	CompetitionID      uint                   `json:"competition_id"`
	Title              string                 `json:"title"`
	Status             string                 `json:"status"`
	Type               string                 `json:"type"`
	Scores             AnalyticsScores        `json:"scores"`
	Registration       RegistrationAnalytics  `json:"registration"`
	Teams              TeamAnalytics          `json:"teams"`
	Timeline           []AnalyticsTimelineEvent `json:"timeline"`
	Prediction         PredictionData         `json:"prediction"`
	Recommendations    []string               `json:"recommendations"`
	GeneratedAt        string                 `json:"generated_at"`
}

// AnalyticsScores contains various performance scores.
type AnalyticsScores struct {
	Overall            float64 `json:"overall"`              // 0-100
	RegistrationHealth float64 `json:"registration_health"`  // 0-100
	TeamFormation      float64 `json:"team_formation"`       // 0-100
	PreplanCompletion  float64 `json:"preplan_completion"`   // 0-100
	Engagement         float64 `json:"engagement"`           // 0-100
	Timeliness         float64 `json:"timeliness"`           // 0-100
}

// RegistrationAnalytics has registration-related analytics.
type RegistrationAnalytics struct {
	Total            int     `json:"total"`
	TeamCount        int     `json:"team_count"`
	ConversionRate   float64 `json:"conversion_rate"`    // registrations -> teams
	DailyAverage     float64 `json:"daily_average"`
	PeakDay          string  `json:"peak_day"`
	PeakCount        int     `json:"peak_count"`
	GrowthTrend      string  `json:"growth_trend"`       // "rising", "stable", "declining"
	DaysRemaining    int     `json:"days_remaining"`
	ProjectedTotal   int     `json:"projected_total"`    // predicted final registrations
}

// TeamAnalytics has team-related analytics.
type TeamAnalytics struct {
	Total            int     `json:"total"`
	AvgSize          float64 `json:"avg_size"`
	MinSize          int     `json:"min_size"`
	MaxSize          int     `json:"max_size"`
	FullTeams        int     `json:"full_teams"`         // teams at max capacity
	EmptyTeams       int     `json:"empty_teams"`        // teams with only leader
	BalanceScore     float64 `json:"balance_score"`      // 0-100, how balanced team sizes are
}

// AnalyticsTimelineEvent is a key event in the competition lifecycle.
type AnalyticsTimelineEvent struct {
	Date        string `json:"date"`
	Event       string `json:"event"`
	Description string `json:"description"`
}

// PredictionData contains predictions for the competition.
type PredictionData struct {
	FinalRegistrationCount int     `json:"final_registration_count"`
	FinalTeamCount         int     `json:"final_team_count"`
	CompletionLikelihood   float64 `json:"completion_likelihood"` // 0-100
	RiskLevel              string  `json:"risk_level"`
	SuggestedActions       []string `json:"suggested_actions"`
}

// GetCompetitionAnalytics handles GET /competitions/:id/analytics — deep analytics for a competition.
func (h *AnalyticsHandler) GetCompetitionAnalytics(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}

	id := c.Param("id")
	var comp models.Competition
	if err := db.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	now := time.Now()
	analytics := CompetitionAnalytics{
		CompetitionID: comp.ID,
		Title:         comp.Title,
		Status:        comp.Status,
		Type:          comp.Type,
		GeneratedAt:   now.Format(time.RFC3339),
	}

	// Gather raw counts
	var teamCount, regCount, preplanCount, awardCount int64
	db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)
	db.Model(&models.CompetitionRegistration{}).Where("competition_id = ?", comp.ID).Count(&regCount)
	db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&preplanCount)
	db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

	var studentCount int64
	db.Raw("SELECT COUNT(DISTINCT user_id) FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ?", comp.ID).Scan(&studentCount)

	// Registration analytics
	analytics.Registration = h.buildRegistrationAnalytics(db, comp, int(regCount), int(teamCount), now)
	analytics.Teams = h.buildTeamAnalytics(db, comp, int(teamCount), int(studentCount))
	analytics.Timeline = h.buildTimeline(comp, int(teamCount), int(regCount), int(preplanCount), int(awardCount), now)
	analytics.Scores = h.calculateScores(comp, int(regCount), int(teamCount), int(preplanCount), int(studentCount), now)
	analytics.Prediction = h.buildPrediction(comp, int(regCount), int(teamCount), int(preplanCount), now)
	analytics.Recommendations = h.generateRecommendations(analytics)

	c.JSON(http.StatusOK, analytics)
}

// GetPlatformAnalytics handles GET /stats/analytics — platform-wide analytics summary.
func (h *AnalyticsHandler) GetPlatformAnalytics(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}

	now := time.Now()
	var totalComps, activeComps, totalTeams, totalStudents, totalPreplans, totalAwards int64
	db.Model(&models.Competition{}).Count(&totalComps)
	db.Model(&models.Competition{}).Where("status = ?", "published").Count(&activeComps)
	db.Model(&models.Team{}).Count(&totalTeams)
	db.Raw("SELECT COUNT(DISTINCT user_id) FROM team_members").Scan(&totalStudents)
	db.Model(&models.PrePlan{}).Count(&totalPreplans)
	db.Model(&models.Award{}).Count(&totalAwards)

	// Registration velocity (last 7 days vs previous 7 days)
	weekAgo := now.AddDate(0, 0, -7)
	twoWeeksAgo := now.AddDate(0, 0, -14)
	var thisWeek, lastWeek int64
	db.Model(&models.CompetitionRegistration{}).Where("created_at >= ?", weekAgo).Count(&thisWeek)
	db.Model(&models.CompetitionRegistration{}).Where("created_at >= ? AND created_at < ?", twoWeeksAgo, weekAgo).Count(&lastWeek)

	velocity := float64(0)
	if lastWeek > 0 {
		velocity = float64(thisWeek-lastWeek) / float64(lastWeek) * 100
	} else if thisWeek > 0 {
		velocity = 100
	}

	// Competition type distribution
	type typeCount struct {
		Type  string
		Count int64
	}
	var typeDists []typeCount
	db.Model(&models.Competition{}).Select("type, count(*) as count").Group("type").Scan(&typeDists)

	typeDistribution := make(map[string]int64)
	for _, td := range typeDists {
		typeDistribution[td.Type] = td.Count
	}

	// Status distribution
	var draftCount, publishedCount, closedCount int64
	db.Model(&models.Competition{}).Where("status = ?", "draft").Count(&draftCount)
	db.Model(&models.Competition{}).Where("status = ?", "published").Count(&publishedCount)
	db.Model(&models.Competition{}).Where("status = ?", "closed").Count(&closedCount)

	// Overall health score (weighted average)
	healthScore := float64(0)
	if totalComps > 0 {
		teamRate := float64(totalTeams) / float64(totalComps)
		preplanRate := float64(totalPreplans) / float64(max64(totalComps, 1))
		awardRate := float64(totalAwards) / float64(max64(totalComps, 1))
		healthScore = math.Min((teamRate*30+preplanRate*30+awardRate*20+velocity*0.2+20), 100)
		healthScore = math.Round(healthScore*100) / 100
	}

	c.JSON(http.StatusOK, gin.H{
		"summary": gin.H{
			"total_competitions": totalComps,
			"active_competitions": activeComps,
			"total_teams":       totalTeams,
			"total_students":    totalStudents,
			"total_preplans":    totalPreplans,
			"total_awards":      totalAwards,
		},
		"velocity": gin.H{
			"this_week":     thisWeek,
			"last_week":     lastWeek,
			"change_rate":   velocity,
			"trend":         velocityTrend(velocity),
		},
		"type_distribution": typeDistribution,
		"status_distribution": gin.H{
			"draft":     draftCount,
			"published": publishedCount,
			"closed":    closedCount,
		},
		"health_score": healthScore,
		"generated_at": now.Format(time.RFC3339),
	})
}

func (h *AnalyticsHandler) buildRegistrationAnalytics(db interface{}, comp models.Competition, regCount, teamCount int, now time.Time) RegistrationAnalytics {
	ra := RegistrationAnalytics{
		Total:     regCount,
		TeamCount: teamCount,
	}

	if regCount > 0 {
		ra.ConversionRate = math.Round(float64(teamCount)/float64(regCount)*10000) / 100
	}

	// Calculate days since creation and remaining
	created := comp.CreatedAt
	totalDays := int(comp.EndDate.Sub(created).Hours() / 24)
	elapsed := int(now.Sub(created).Hours() / 24)
	ra.DaysRemaining = int(comp.EndDate.Sub(now).Hours() / 24)
	if ra.DaysRemaining < 0 {
		ra.DaysRemaining = 0
	}

	if elapsed > 0 {
		ra.DailyAverage = math.Round(float64(regCount)/float64(elapsed)*100) / 100
	}

	// Projected total
	if elapsed > 0 && totalDays > 0 {
		dailyRate := float64(regCount) / float64(elapsed)
		ra.ProjectedTotal = int(dailyRate * float64(totalDays))
	}

	// Growth trend
	if elapsed >= 7 {
		// Simple: compare last 7 days to previous 7 days
		recentDays := min(7, elapsed/2)
		if recentDays > 0 {
			recentRate := float64(regCount) / float64(elapsed)
			// If competition has been running for a while, estimate trend
			if recentRate > 0 {
				ra.GrowthTrend = "stable"
				// Estimate based on position in lifecycle
				phase := float64(elapsed) / float64(totalDays)
				if phase < 0.3 {
					ra.GrowthTrend = "rising"
				} else if phase > 0.8 {
					ra.GrowthTrend = "declining"
				}
			}
		}
	} else {
		ra.GrowthTrend = "rising"
	}

	return ra
}

func (h *AnalyticsHandler) buildTeamAnalytics(db interface{}, comp models.Competition, teamCount, studentCount int) TeamAnalytics {
	ta := TeamAnalytics{
		Total: teamCount,
	}

	if teamCount > 0 && studentCount > 0 {
		ta.AvgSize = math.Round(float64(studentCount)/float64(teamCount)*100) / 100
	}

	// Get actual min/max team sizes from DB
	gormDB := database.GetDB()
	if gormDB != nil && teamCount > 0 {
		var maxSize, minSize int
		gormDB.Raw("SELECT COALESCE(MAX(cnt),0) FROM (SELECT COUNT(*) as cnt FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ? GROUP BY tm.team_id) sub", comp.ID).Scan(&maxSize)
		gormDB.Raw("SELECT COALESCE(MIN(cnt),1) FROM (SELECT COUNT(*) as cnt FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ? GROUP BY tm.team_id) sub", comp.ID).Scan(&minSize)
		ta.MaxSize = maxSize
		ta.MinSize = minSize

		// Count full and empty teams
		maxTeamSize := comp.MaxTeamSize
		if maxTeamSize > 0 {
			gormDB.Raw("SELECT COUNT(*) FROM (SELECT COUNT(*) as cnt FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ? GROUP BY tm.team_id) sub WHERE cnt >= ?", comp.ID, maxTeamSize).Scan(&ta.FullTeams)
		}
		gormDB.Raw("SELECT COUNT(*) FROM (SELECT COUNT(*) as cnt FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ? GROUP BY tm.team_id) sub WHERE cnt <= 1", comp.ID).Scan(&ta.EmptyTeams)

		// Balance score: 100 = perfectly balanced, 0 = extremely imbalanced
		if maxSize > 0 && minSize > 0 {
			ratio := float64(maxSize) / float64(minSize)
			if ratio <= 1.5 {
				ta.BalanceScore = 100
			} else if ratio <= 2 {
				ta.BalanceScore = 80
			} else if ratio <= 3 {
				ta.BalanceScore = 60
			} else {
				ta.BalanceScore = math.Max(0, 100-ratio*10)
			}
		} else {
			ta.BalanceScore = 100
		}
	}

	return ta
}

func (h *AnalyticsHandler) buildTimeline(comp models.Competition, teamCount, regCount, preplanCount, awardCount int, now time.Time) []AnalyticsTimelineEvent {
	events := []AnalyticsTimelineEvent{}

	if !comp.CreatedAt.IsZero() {
		events = append(events, AnalyticsTimelineEvent{
			Date:        comp.CreatedAt.Format("2006-01-02"),
			Event:       "created",
			Description: "赛事创建",
		})
	}

	if comp.Status == "published" || comp.Status == "closed" {
		events = append(events, AnalyticsTimelineEvent{
			Date:        comp.UpdatedAt.Format("2006-01-02"),
			Event:       "published",
			Description: "赛事发布",
		})
	}

	if regCount > 0 {
		events = append(events, AnalyticsTimelineEvent{
			Date:        now.Format("2006-01-02"),
			Event:       "registration_milestone",
			Description: "报名人数达到 " + intToStr(regCount),
		})
	}

	if teamCount > 0 {
		events = append(events, AnalyticsTimelineEvent{
			Date:        now.Format("2006-01-02"),
			Event:       "team_formation",
			Description: "已组建 " + intToStr(teamCount) + " 支团队",
		})
	}

	if preplanCount > 0 {
		events = append(events, AnalyticsTimelineEvent{
			Date:        now.Format("2006-01-02"),
			Event:       "preplan_submitted",
			Description: "已提交 " + intToStr(preplanCount) + " 份预案",
		})
	}

	if awardCount > 0 {
		events = append(events, AnalyticsTimelineEvent{
			Date:        now.Format("2006-01-02"),
			Event:       "awards_granted",
			Description: "已颁发 " + intToStr(awardCount) + " 个奖项",
		})
	}

	if !comp.EndDate.IsZero() && comp.EndDate.Before(now) {
		events = append(events, AnalyticsTimelineEvent{
			Date:        comp.EndDate.Format("2006-01-02"),
			Event:       "ended",
			Description: "赛事结束",
		})
	}

	return events
}

func (h *AnalyticsHandler) calculateScores(comp models.Competition, regCount, teamCount, preplanCount, studentCount int, now time.Time) AnalyticsScores {
	scores := AnalyticsScores{}

	// Registration health: based on registration count relative to expectations
	if regCount >= 50 {
		scores.RegistrationHealth = 100
	} else if regCount >= 20 {
		scores.RegistrationHealth = 80
	} else if regCount >= 10 {
		scores.RegistrationHealth = 60
	} else if regCount >= 5 {
		scores.RegistrationHealth = 40
	} else {
		scores.RegistrationHealth = math.Max(0, float64(regCount)*15)
	}

	// Team formation: ratio of teams to registrations
	if regCount > 0 {
		formationRate := float64(teamCount) / float64(regCount) * 100
		scores.TeamFormation = math.Min(formationRate*2.5, 100)
	}

	// Preplan completion: ratio of preplans to teams
	if teamCount > 0 {
		completionRate := float64(preplanCount) / float64(teamCount) * 100
		scores.PreplanCompletion = math.Min(completionRate, 100)
	}

	// Engagement: based on student count and activity
	if teamCount > 0 && studentCount > 0 {
		avgPerTeam := float64(studentCount) / float64(teamCount)
		scores.Engagement = math.Min(avgPerTeam*25, 100)
	}

	// Timeliness: how well the competition is progressing
	if !comp.EndDate.IsZero() && !comp.StartDate.IsZero() {
		totalDuration := comp.EndDate.Sub(comp.StartDate).Hours()
		elapsed := now.Sub(comp.StartDate).Hours()
		if totalDuration > 0 {
			progress := elapsed / totalDuration
			expectedProgress := progress * 100
			// Score based on whether milestones are being met
			actualMilestones := 0
			if regCount > 0 {
				actualMilestones++
			}
			if teamCount > 0 {
				actualMilestones++
			}
			if preplanCount > 0 {
				actualMilestones++
			}
			expectedMilestones := expectedProgress / 33.33
			if expectedMilestones > 0 {
				scores.Timeliness = math.Min(float64(actualMilestones)/expectedMilestones*100, 100)
			} else {
				scores.Timeliness = 100
			}
		}
	} else {
		scores.Timeliness = 50 // No dates set
	}

	// Overall: weighted average
	scores.Overall = math.Round((scores.RegistrationHealth*0.25+
		scores.TeamFormation*0.25+
		scores.PreplanCompletion*0.2+
		scores.Engagement*0.15+
		scores.Timeliness*0.15)*100) / 100

	return scores
}

func (h *AnalyticsHandler) buildPrediction(comp models.Competition, regCount, teamCount, preplanCount int, now time.Time) PredictionData {
	pred := PredictionData{
		RiskLevel:        "low",
		SuggestedActions: []string{},
	}

	if !comp.EndDate.IsZero() && !comp.CreatedAt.IsZero() {
		totalDays := comp.EndDate.Sub(comp.CreatedAt).Hours() / 24
		elapsed := now.Sub(comp.CreatedAt).Hours() / 24
		remaining := comp.EndDate.Sub(now).Hours() / 24

		if elapsed > 0 && totalDays > 0 {
			dailyRate := float64(regCount) / float64(elapsed)
			pred.FinalRegistrationCount = int(dailyRate * float64(totalDays))

			teamRate := float64(teamCount) / float64(elapsed)
			pred.FinalTeamCount = int(teamRate * float64(totalDays))
		}

		// Completion likelihood based on current progress
		phase := elapsed / totalDays
		if phase > 0.5 && preplanCount == 0 {
			pred.CompletionLikelihood = 30
			pred.RiskLevel = "high"
		} else if phase > 0.3 && teamCount == 0 {
			pred.CompletionLikelihood = 40
			pred.RiskLevel = "medium"
		} else if remaining < 7 && preplanCount < teamCount/2 {
			pred.CompletionLikelihood = 50
			pred.RiskLevel = "medium"
		} else {
			pred.CompletionLikelihood = math.Min(70+float64(regCount)*0.5+float64(teamCount)*2, 95)
		}

		// Suggested actions
		if remaining > 0 && remaining < 14 && preplanCount < teamCount {
			pred.SuggestedActions = append(pred.SuggestedActions, "发送预案提交提醒")
		}
		if regCount > 0 && teamCount == 0 {
			pred.SuggestedActions = append(pred.SuggestedActions, "开放组队匹配功能")
		}
		if regCount < 10 && comp.Status == "published" {
			pred.SuggestedActions = append(pred.SuggestedActions, "加大赛事宣传力度")
		}
	}

	if len(pred.SuggestedActions) == 0 {
		pred.SuggestedActions = append(pred.SuggestedActions, "当前进展良好，继续保持")
	}

	return pred
}

func (h *AnalyticsHandler) generateRecommendations(a CompetitionAnalytics) []string {
	recs := []string{}

	if a.Scores.RegistrationHealth < 40 {
		recs = append(recs, "报名人数偏低，建议通过多渠道宣传提升报名量")
	}
	if a.Scores.TeamFormation < 50 {
		recs = append(recs, "组队率较低，建议推广队友匹配功能帮助学生组队")
	}
	if a.Scores.PreplanCompletion < 30 {
		recs = append(recs, "预案提交率不足，建议发送提醒通知或延长截止日期")
	}
	if a.Teams.BalanceScore < 60 {
		recs = append(recs, "团队规模差异较大，建议设置统一的团队人数要求")
	}
	if a.Registration.GrowthTrend == "declining" {
		recs = append(recs, "报名趋势下降，建议推出限时激励活动")
	}
	if a.Prediction.RiskLevel == "high" {
		recs = append(recs, "赛事风险较高，建议立即关注并采取措施")
	}

	if len(recs) == 0 {
		recs = append(recs, "赛事各项指标良好，建议继续保持当前策略")
	}

	return recs
}

// Helper functions
func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func intToStr(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	neg := false
	if n < 0 {
		neg = true
		n = -n
	}
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	if neg {
		s = "-" + s
	}
	return s
}

func velocityTrend(v float64) string {
	if v > 10 {
		return "accelerating"
	} else if v > 0 {
		return "growing"
	} else if v == 0 {
		return "stable"
	} else if v > -10 {
		return "slight_decline"
	}
	return "declining"
}
