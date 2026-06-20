package handlers

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"gorm.io/gorm"
)

// RiskAlertHandler provides competition risk assessment and early warning.
type RiskAlertHandler struct{}

func NewRiskAlertHandler() *RiskAlertHandler {
	return &RiskAlertHandler{}
}

// RiskLevel represents the severity of a risk.
type RiskLevel string

const (
	RiskLow      RiskLevel = "low"
	RiskMedium   RiskLevel = "medium"
	RiskHigh     RiskLevel = "high"
	RiskCritical RiskLevel = "critical"
)

// RiskAlert is a single risk finding for a competition.
type RiskAlert struct {
	Type        string    `json:"type"`
	Level       RiskLevel `json:"level"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Suggestion  string    `json:"suggestion"`
	Score       float64   `json:"score"` // 0-100, higher = more severe
}

// CompRiskReport is the full risk report for a competition.
type CompRiskReport struct {
	CompetitionID     uint        `json:"competition_id"`
	Title             string      `json:"title"`
	OverallRisk       RiskLevel   `json:"overall_risk"`
	RiskScore         float64     `json:"risk_score"` // 0-100
	Alerts            []RiskAlert `json:"alerts"`
	TeamCount         int         `json:"team_count"`
	StudentCount      int         `json:"student_count"`
	RegCount          int         `json:"registration_count"`
	PreplanCount      int         `json:"preplan_count"`
	DaysUntilStart    int         `json:"days_until_start"`
	DaysUntilEnd      int         `json:"days_until_end"`
	ParticipationRate float64     `json:"participation_rate"`
	CompletionRate    float64     `json:"completion_rate"`
}

// PlatformRiskSummary is the platform-wide risk summary.
type PlatformRiskSummary struct {
	TotalCompetitions int              `json:"total_competitions"`
	AtRisk            int              `json:"at_risk_count"`
	CriticalCount     int              `json:"critical_count"`
	HighCount         int              `json:"high_count"`
	MediumCount       int              `json:"medium_count"`
	LowCount          int              `json:"low_count"`
	AverageRiskScore  float64          `json:"average_risk_score"`
	TopRisks          []CompRiskReport `json:"top_risks"` // Top 5 highest risk
	Recommendations   []string         `json:"recommendations"`
}

// AssessCompetitionRisk analyzes a single competition for risks.
func (h *RiskAlertHandler) AssessCompetitionRisk(c *gin.Context) {
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

	report := analyzeCompetition(db, comp)
	c.JSON(http.StatusOK, report)
}

// GetPlatformRiskOverview provides a platform-wide risk assessment.
func (h *RiskAlertHandler) GetPlatformRiskOverview(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}

	var comps []models.Competition
	db.Find(&comps)

	summary := PlatformRiskSummary{
		TotalCompetitions: len(comps),
	}

	reports := make([]CompRiskReport, 0, len(comps))
	var totalScore float64

	for _, comp := range comps {
		report := analyzeCompetition(db, comp)
		reports = append(reports, report)
		totalScore += report.RiskScore

		switch report.OverallRisk {
		case RiskCritical:
			summary.CriticalCount++
			summary.AtRisk++
		case RiskHigh:
			summary.HighCount++
			summary.AtRisk++
		case RiskMedium:
			summary.MediumCount++
		case RiskLow:
			summary.LowCount++
		}
	}

	if len(comps) > 0 {
		summary.AverageRiskScore = math.Round(totalScore/float64(len(comps))*100) / 100
	}

	// Sort by risk score descending and take top 5
	for i := 0; i < len(reports)-1; i++ {
		for j := i + 1; j < len(reports); j++ {
			if reports[j].RiskScore > reports[i].RiskScore {
				reports[i], reports[j] = reports[j], reports[i]
			}
		}
	}
	limit := 5
	if len(reports) < limit {
		limit = len(reports)
	}
	summary.TopRisks = reports[:limit]

	// Generate platform-wide recommendations
	summary.Recommendations = generatePlatformRecommendations(summary)

	c.JSON(http.StatusOK, summary)
}

// analyzeCompetition performs risk analysis on a single competition.
func analyzeCompetition(db *gorm.DB, comp models.Competition) CompRiskReport {
	report := CompRiskReport{
		CompetitionID: comp.ID,
		Title:         comp.Title,
	}

	now := time.Now()

	// Count related entities
	var teamCount, regCount, preplanCount int64
	var studentCount int64
	db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)
	db.Model(&models.CompetitionRegistration{}).Where("competition_id = ?", comp.ID).Count(&regCount)
	db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&preplanCount)

	// Count distinct students in teams
	db.Raw("SELECT COUNT(DISTINCT user_id) FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ?", comp.ID).Scan(&studentCount)

	report.TeamCount = int(teamCount)
	report.RegCount = int(regCount)
	report.PreplanCount = int(preplanCount)
	report.StudentCount = int(studentCount)

	// Calculate time metrics (StartDate/EndDate are time.Time, check for zero value)
	if !comp.StartDate.IsZero() {
		report.DaysUntilStart = int(comp.StartDate.Sub(now).Hours() / 24)
	}
	if !comp.EndDate.IsZero() {
		report.DaysUntilEnd = int(comp.EndDate.Sub(now).Hours() / 24)
	}

	// Participation rate: students / (teams * max_team_size)
	if comp.MaxTeamSize > 0 && teamCount > 0 {
		maxCapacity := int64(comp.MaxTeamSize) * teamCount
		report.ParticipationRate = math.Round(float64(studentCount)/float64(maxCapacity)*10000) / 100
	}

	// Completion rate: preplans / teams
	if teamCount > 0 {
		report.CompletionRate = math.Round(float64(preplanCount)/float64(teamCount)*10000) / 100
	}

	// Analyze risks
	var alerts []RiskAlert
	var totalSeverity float64

	// Risk 1: Low registration count
	if regCount < 5 && comp.Status == "published" {
		score := math.Max(0, 80-float64(regCount)*15)
		alerts = append(alerts, RiskAlert{
			Type:        "low_registration",
			Level:       riskLevelFromScore(score),
			Title:       "报名人数过低",
			Description: fmt.Sprintf("赛事仅有 %d 人报名，低于平均水平", regCount),
			Suggestion:  "建议加大宣传力度，或降低参赛门槛",
			Score:       score,
		})
		totalSeverity += score
	}

	// Risk 2: No teams formed despite registrations
	if regCount > 0 && teamCount == 0 {
		score := 60.0
		alerts = append(alerts, RiskAlert{
			Type:        "no_teams",
			Level:       riskLevelFromScore(score),
			Title:       "尚未组队",
			Description: "已有报名但尚无队伍组建",
			Suggestion:  "建议开放组队匹配功能，或组织线下组队活动",
			Score:       score,
		})
		totalSeverity += score
	}

	// Risk 3: Low team formation rate
	if regCount > 10 && teamCount > 0 {
		minSize := comp.MinTeamSize
		if minSize < 2 {
			minSize = 2
		}
		expectedTeams := float64(regCount) / float64(minSize)
		actualRate := float64(teamCount) / expectedTeams
		if actualRate < 0.3 {
			score := 50.0
			alerts = append(alerts, RiskAlert{
				Type:        "low_team_formation",
				Level:       riskLevelFromScore(score),
				Title:       "组队率偏低",
				Description: fmt.Sprintf("组队率仅 %.0f%%，大量参赛者还未组队", actualRate*100),
				Suggestion:  "建议推荐队友匹配，降低最小团队人数",
				Score:       score,
			})
			totalSeverity += score
		}
	}

	// Risk 4: Deadline approaching with low preplans
	if !comp.EndDate.IsZero() && report.DaysUntilEnd > 0 && report.DaysUntilEnd <= 14 && teamCount > 0 {
		preplanRate := float64(preplanCount) / float64(teamCount)
		if preplanRate < 0.5 {
			score := 45.0
			alerts = append(alerts, RiskAlert{
				Type:        "low_preplan_rate",
				Level:       riskLevelFromScore(score),
				Title:       "预案提交不足",
				Description: fmt.Sprintf("距截止仅 %d 天，预案提交率 %.0f%%", report.DaysUntilEnd, preplanRate*100),
				Suggestion:  "建议发送提醒通知，延长预案提交截止时间",
				Score:       score,
			})
			totalSeverity += score
		}
	}

	// Risk 5: Competition not published
	if comp.Status == "draft" {
		score := 30.0
		alerts = append(alerts, RiskAlert{
			Type:        "not_published",
			Level:       riskLevelFromScore(score),
			Title:       "赛事未发布",
			Description: "赛事仍处于草稿状态",
			Suggestion:  "确认赛事信息后尽快发布",
			Score:       score,
		})
		totalSeverity += score
	}

	// Risk 6: Competition ended but no awards
	if !comp.EndDate.IsZero() && comp.EndDate.Before(now) && comp.Status == "closed" {
		var awardCount int64
		db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)
		if awardCount == 0 {
			score := 35.0
			alerts = append(alerts, RiskAlert{
				Type:        "no_awards",
				Level:       riskLevelFromScore(score),
				Title:       "未颁发奖项",
				Description: "赛事已结束但尚未颁发任何奖项",
				Suggestion:  "请尽快评定并颁发奖项，以激励参赛者",
				Score:       score,
			})
			totalSeverity += score
		}
	}

	// Risk 7: Team size imbalance
	if teamCount > 1 {
		var maxSize, minSize int
		db.Raw("SELECT COALESCE(MAX(cnt),0) FROM (SELECT COUNT(*) as cnt FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ? GROUP BY tm.team_id) sub", comp.ID).Scan(&maxSize)
		db.Raw("SELECT COALESCE(MIN(cnt),0) FROM (SELECT COUNT(*) as cnt FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ? GROUP BY tm.team_id) sub", comp.ID).Scan(&minSize)
		if maxSize > 0 && minSize > 0 && float64(maxSize)/float64(minSize) > 3 {
			score := 25.0
			alerts = append(alerts, RiskAlert{
				Type:        "team_imbalance",
				Level:       riskLevelFromScore(score),
				Title:       "团队规模差异大",
				Description: fmt.Sprintf("最大团队 %d 人，最小 %d 人，差异过大", maxSize, minSize),
				Suggestion:  "建议设置统一的团队规模要求",
				Score:       score,
			})
			totalSeverity += score
		}
	}

	report.Alerts = alerts

	// Calculate overall risk
	if len(alerts) > 0 {
		report.RiskScore = math.Min(totalSeverity/float64(len(alerts)), 100)
	}
	report.OverallRisk = riskLevelFromScore(report.RiskScore)

	return report
}

func generatePlatformRecommendations(summary PlatformRiskSummary) []string {
	recs := make([]string, 0)

	if summary.CriticalCount > 0 {
		recs = append(recs, fmt.Sprintf("有 %d 个赛事存在严重风险，需要立即关注", summary.CriticalCount))
	}
	if summary.HighCount > 0 {
		recs = append(recs, fmt.Sprintf("有 %d 个赛事存在高风险，建议优先处理", summary.HighCount))
	}
	if summary.AverageRiskScore > 50 {
		recs = append(recs, "平台整体风险偏高，建议加强赛事管理和宣传")
	}
	if summary.TotalCompetitions > 0 && summary.AtRisk > summary.TotalCompetitions/2 {
		recs = append(recs, "超过半数赛事存在风险，建议优化赛事组织流程")
	}
	if len(recs) == 0 {
		recs = append(recs, "平台赛事整体健康，继续保持")
	}
	return recs
}

func riskLevelFromScore(score float64) RiskLevel {
	switch {
	case score >= 70:
		return RiskCritical
	case score >= 50:
		return RiskHigh
	case score >= 30:
		return RiskMedium
	default:
		return RiskLow
	}
}
