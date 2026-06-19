package handlers

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// InsightsHandler handles AI-powered platform insights.
type InsightsHandler struct{}

// NewInsightsHandler creates a new InsightsHandler.
func NewInsightsHandler() *InsightsHandler {
	return &InsightsHandler{}
}

// InsightItem represents a single insight.
type InsightItem struct {
	Category    string  `json:"category"` // "trend", "risk", "opportunity", "recommendation"
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Severity    string  `json:"severity"` // "info", "warning", "critical"
	Metric      float64 `json:"metric,omitempty"`
	Action      string  `json:"action,omitempty"`
}

// CompetitionBurst represents a period of high competition activity.
type CompetitionBurst struct {
	Period       string   `json:"period"`
	Count        int      `json:"count"`
	Competitions []string `json:"competitions"`
}

// PlatformInsights is the full insights response.
type PlatformInsights struct {
	Summary         string             `json:"summary"`
	OverallHealth   string             `json:"overall_health"`
	Insights        []InsightItem      `json:"insights"`
	TrendAnalysis   TrendAnalysis      `json:"trend_analysis"`
	RiskMatrix      []RiskItem         `json:"risk_matrix"`
	Recommendations []InsightItem      `json:"recommendations"`
	ActivityBursts  []CompetitionBurst `json:"activity_bursts"`
	GeneratedAt     string             `json:"generated_at"`
}

// TrendAnalysis holds trend data.
type TrendAnalysis struct {
	CompetitionsGrowth float64 `json:"competitions_growth"`
	TeamsGrowth        float64 `json:"teams_growth"`
	AwardsGrowth       float64 `json:"awards_growth"`
	ActiveCompetitions int     `json:"active_competitions"`
	CompletionRate     float64 `json:"completion_rate"`
	AIAuditRate        float64 `json:"ai_audit_rate"`
}

// RiskItem represents a risk factor.
type RiskItem struct {
	Factor     string  `json:"factor"`
	Impact     string  `json:"impact"`     // "low", "medium", "high"
	Likelihood string  `json:"likelihood"` // "low", "medium", "high"
	Score      float64 `json:"score"`
	Mitigation string  `json:"mitigation"`
}

// Insights handles GET /stats/insights — returns AI-powered platform insights.
func (h *InsightsHandler) Insights(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	insights := []InsightItem{}
	risks := []RiskItem{}
	recommendations := []InsightItem{}
	bursts := []CompetitionBurst{}

	// Gather raw data
	var totalComps, publishedComps, ongoingComps, completedComps int64
	db.Model(&models.Competition{}).Count(&totalComps)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusPublished).Count(&publishedComps)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusOngoing).Count(&ongoingComps)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusCompleted).Count(&completedComps)

	var totalTeams, totalStudents, totalAwards, totalPrePlans, totalRegs int64
	db.Model(&models.Team{}).Count(&totalTeams)
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
	db.Model(&models.Award{}).Count(&totalAwards)
	db.Model(&models.PrePlan{}).Count(&totalPrePlans)
	db.Model(&models.CompetitionRegistration{}).Count(&totalRegs)

	var settledAwards int64
	db.Model(&models.Award{}).Where("status = ?", models.AwardStatusSettled).Count(&settledAwards)

	// AI-reviewed pre-plans
	var aiReviewed int64
	db.Model(&models.PrePlan{}).Where("ai_score > 0").Count(&aiReviewed)

	// Trend analysis — compare recent 30 days vs previous 30 days
	now := time.Now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)
	sixtyDaysAgo := now.AddDate(0, 0, -60)

	var recentComps, prevComps int64
	db.Model(&models.Competition{}).Where("created_at >= ?", thirtyDaysAgo).Count(&recentComps)
	db.Model(&models.Competition{}).Where("created_at >= ? AND created_at < ?", sixtyDaysAgo, thirtyDaysAgo).Count(&prevComps)

	var recentTeams, prevTeams int64
	db.Model(&models.Team{}).Where("created_at >= ?", thirtyDaysAgo).Count(&recentTeams)
	db.Model(&models.Team{}).Where("created_at >= ? AND created_at < ?", sixtyDaysAgo, thirtyDaysAgo).Count(&prevTeams)

	var recentAwards, prevAwards int64
	db.Model(&models.Award{}).Where("created_at >= ?", thirtyDaysAgo).Count(&recentAwards)
	db.Model(&models.Award{}).Where("created_at >= ? AND created_at < ?", sixtyDaysAgo, thirtyDaysAgo).Count(&prevAwards)

	compGrowth := growthRate(recentComps, prevComps)
	teamGrowth := growthRate(recentTeams, prevTeams)
	awardGrowth := growthRate(recentAwards, prevAwards)

	// Completion rate
	var completionRate float64
	if totalComps > 0 {
		completionRate = float64(completedComps) / float64(totalComps) * 100
	}

	// AI audit rate
	var aiAuditRate float64
	if totalPrePlans > 0 {
		aiAuditRate = float64(aiReviewed) / float64(totalPrePlans) * 100
	}

	trendAnalysis := TrendAnalysis{
		CompetitionsGrowth: compGrowth,
		TeamsGrowth:        teamGrowth,
		AwardsGrowth:       awardGrowth,
		ActiveCompetitions: int(ongoingComps),
		CompletionRate:     math.Round(completionRate*10) / 10,
		AIAuditRate:        math.Round(aiAuditRate*10) / 10,
	}

	// Generate insights based on data
	// 1. Competition participation insight
	if totalComps > 0 && totalTeams > 0 {
		avgTeamsPerComp := float64(totalTeams) / float64(totalComps)
		if avgTeamsPerComp < 3 {
			insights = append(insights, InsightItem{
				Category:    "opportunity",
				Title:       "赛事团队覆盖偏低",
				Description: "平均每场赛事仅 " + fmt.Sprintf("%.1f", avgTeamsPerComp) + " 支团队参与，建议加强赛事宣传和学生动员",
				Severity:    "warning",
				Metric:      avgTeamsPerComp,
				Action:      "增加赛事推荐频次、举办赛事宣讲会",
			})
		} else if avgTeamsPerComp > 10 {
			insights = append(insights, InsightItem{
				Category:    "trend",
				Title:       "赛事参与热度高",
				Description: "平均每场赛事有 " + fmt.Sprintf("%.1f", avgTeamsPerComp) + " 支团队参与，平台活跃度优秀",
				Severity:    "info",
				Metric:      avgTeamsPerComp,
			})
		}
	}

	// 2. AI adoption insight
	if aiAuditRate > 0 {
		if aiAuditRate < 30 {
			insights = append(insights, InsightItem{
				Category:    "opportunity",
				Title:       "AI 评审采用率有提升空间",
				Description: "仅 " + fmt.Sprintf("%.1f", aiAuditRate) + "% 的预案使用了 AI 评审，建议推广 AI 辅助评审功能",
				Severity:    "info",
				Metric:      aiAuditRate,
				Action:      "在预案提交页面增加 AI 评审引导",
			})
		} else {
			insights = append(insights, InsightItem{
				Category:    "trend",
				Title:       "AI 评审功能采用率良好",
				Description: fmt.Sprintf("%.1f", aiAuditRate) + "% 的预案使用了 AI 评审，学生接受度高",
				Severity:    "info",
				Metric:      aiAuditRate,
			})
		}
	}

	// 3. Completion rate insight
	if totalComps > 5 {
		if completionRate < 20 {
			insights = append(insights, InsightItem{
				Category:    "risk",
				Title:       "赛事完成率偏低",
				Description: "仅 " + fmt.Sprintf("%.1f", completionRate) + "% 的赛事已完结，存在赛事推进不力风险",
				Severity:    "warning",
				Metric:      completionRate,
				Action:      "检查长期未更新的赛事状态，推进赛事结项流程",
			})
			risks = append(risks, RiskItem{
				Factor:     "赛事推进延迟",
				Impact:     "medium",
				Likelihood: "high",
				Score:      6.0,
				Mitigation: "设置赛事状态自动提醒，临近截止日期自动通知管理员",
			})
		}
	}

	// 4. Department diversity insight
	var distinctDepts int64
	db.Model(&models.User{}).Where("role = ? AND dept != ''", models.RoleStudent).Distinct("dept").Count(&distinctDepts)
	if distinctDepts > 0 && totalStudents > 0 {
		avgStudentsPerDept := float64(totalStudents) / float64(distinctDepts)
		if avgStudentsPerDept > 20 {
			insights = append(insights, InsightItem{
				Category:    "recommendation",
				Title:       "跨学科组队可进一步加强",
				Description: "学生分布在 " + fmt.Sprintf("%d", distinctDepts) + " 个院系，平均每院系 " + fmt.Sprintf("%.1f", avgStudentsPerDept) + " 名参赛学生",
				Severity:    "info",
				Metric:      avgStudentsPerDept,
				Action:      "推广跨学科组队、设置跨院系组队奖励",
			})
		}
	}

	// 5. Award settlement insight
	if totalAwards > 0 {
		settleRate := float64(settledAwards) / float64(totalAwards) * 100
		if settleRate < 50 {
			insights = append(insights, InsightItem{
				Category:    "risk",
				Title:       "奖项结算进度滞后",
				Description: "仅 " + fmt.Sprintf("%.1f", settleRate) + "% 的奖项已完成结算，可能影响学生积极性",
				Severity:    "warning",
				Metric:      settleRate,
				Action:      "安排教师集中审核结算待处理奖项",
			})
			risks = append(risks, RiskItem{
				Factor:     "奖项结算延迟",
				Impact:     "medium",
				Likelihood: "medium",
				Score:      4.5,
				Mitigation: "设置奖项结算超时提醒，自动升级至管理员",
			})
		}
	}

	// 6. Growth trends
	if compGrowth > 20 {
		insights = append(insights, InsightItem{
			Category:    "trend",
			Title:       "赛事增长势头强劲",
			Description: "近30天赛事增长 " + fmt.Sprintf("%.1f", compGrowth) + "%，平台扩展加速",
			Severity:    "info",
			Metric:      compGrowth,
		})
	}

	if teamGrowth > 30 {
		insights = append(insights, InsightItem{
			Category:    "trend",
			Title:       "团队组建活跃",
			Description: "近30天新团队增长 " + fmt.Sprintf("%.1f", teamGrowth) + "%，学生参与热情高涨",
			Severity:    "info",
			Metric:      teamGrowth,
		})
	}

	// 7. Upcoming deadline risks
	var upcomingDeadlineComps int64
	sevenDaysLater := now.AddDate(0, 0, 7)
	db.Model(&models.Competition{}).
		Where("end_date BETWEEN ? AND ? AND status IN (?, ?)", now, sevenDaysLater, models.CompStatusPublished, models.CompStatusOngoing).
		Count(&upcomingDeadlineComps)
	if upcomingDeadlineComps > 0 {
		risks = append(risks, RiskItem{
			Factor:     "赛事截止日期临近",
			Impact:     "high",
			Likelihood: "high",
			Score:      8.0,
			Mitigation: "发送截止日期提醒通知，确保学生及时提交作品",
		})
	}

	// 8. Recommendations
	if totalStudents > 0 && totalRegs > 0 {
		avgRegsPerStudent := float64(totalRegs) / float64(totalStudents)
		if avgRegsPerStudent < 1.5 {
			recommendations = append(recommendations, InsightItem{
				Category:    "recommendation",
				Title:       "提高学生参赛覆盖面",
				Description: "平均每位学生报名 " + fmt.Sprintf("%.1f", avgRegsPerStudent) + " 场赛事，可通过赛事推荐算法提升参赛率",
				Severity:    "info",
				Action:      "优化推荐算法，增加个性化赛事推荐",
			})
		}
	}

	recommendations = append(recommendations, InsightItem{
		Category:    "recommendation",
		Title:       "持续优化 AI 工具箱",
		Description: "建议定期更新 RAG 知识库内容，确保 AI 工具基于最新赛事数据提供建议",
		Severity:    "info",
		Action:      "每月导入最新赛事资料和获奖项目数据",
	})

	if totalTeams > 10 {
		recommendations = append(recommendations, InsightItem{
			Category:    "recommendation",
			Title:       "建立团队能力评估体系",
			Description: "已有 " + fmt.Sprintf("%d", totalTeams) + " 支团队，建议定期使用团队分析功能评估团队能力",
			Severity:    "info",
			Action:      "推广团队能力分析报告，帮助学生发现短板",
		})
	}

	// 9. Activity bursts — find months with high competition creation
	type monthCount struct {
		Month string
		Count int
	}
	var monthlyData []monthCount
	db.Model(&models.Competition{}).
		Select("TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count").
		Group("month").
		Order("count DESC").
		Limit(3).
		Scan(&monthlyData)

	for _, m := range monthlyData {
		if m.Count >= 3 {
			// Get competition names for that month
			var compNames []string
			db.Model(&models.Competition{}).
				Where("TO_CHAR(created_at, 'YYYY-MM') = ?", m.Month).
				Pluck("title", &compNames)
			if len(compNames) > 5 {
				compNames = compNames[:5]
			}
			bursts = append(bursts, CompetitionBurst{
				Period:       m.Month,
				Count:        m.Count,
				Competitions: compNames,
			})
		}
	}

	// Overall health
	healthLevel := "good"
	if len(risks) > 2 {
		healthLevel = "needs_attention"
	} else if len(insights) == 0 {
		healthLevel = "excellent"
	}

	// Summary
	summary := fmt.Sprintf(
		"平台共运营 %d 场赛事，%d 支团队，%d 名学生参与。赛事完成率 %.1f%%，AI 评审覆盖率 %.1f%%。共发现 %d 条洞察",
		totalComps, totalTeams, totalStudents, completionRate, aiAuditRate, len(insights),
	)
	if len(risks) > 0 {
		summary += fmt.Sprintf("、%d 项风险", len(risks))
	}
	summary += "。"

	result := PlatformInsights{
		Summary:         summary,
		OverallHealth:   healthLevel,
		Insights:        insights,
		TrendAnalysis:   trendAnalysis,
		RiskMatrix:      risks,
		Recommendations: recommendations,
		ActivityBursts:  bursts,
		GeneratedAt:     now.Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, result)
}

// growthRate calculates growth percentage between recent and previous period.
func growthRate(recent, prev int64) float64 {
	if prev == 0 {
		if recent > 0 {
			return 100
		}
		return 0
	}
	return math.Round((float64(recent-prev)/float64(prev)*100)*10) / 10
}
