package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// HealthScoreHandler handles platform health score HTTP requests.
type HealthScoreHandler struct{}

// NewHealthScoreHandler creates a new HealthScoreHandler.
func NewHealthScoreHandler() *HealthScoreHandler {
	return &HealthScoreHandler{}
}

// HealthDimension represents a single dimension of the health score.
type HealthDimension struct {
	Name    string  `json:"name"`
	Score   float64 `json:"score"`
	Weight  float64 `json:"weight"`
	Details string  `json:"details"`
}

// HealthScoreResponse holds the full health score payload.
type HealthScoreResponse struct {
	OverallScore float64           `json:"overall_score"`
	Level        string            `json:"level"` // "excellent", "good", "fair", "needs_attention"
	Dimensions   []HealthDimension `json:"dimensions"`
	Summary      string            `json:"summary"`
	Timestamp    string            `json:"timestamp"`
}

// Score handles GET /stats/health-score — returns platform health score.
func (h *HealthScoreHandler) Score(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	var dims []HealthDimension

	// 1. Competition Activity (weight: 20%)
	var totalComp, activeComp, publishedComp int64
	db.Model(&models.Competition{}).Count(&totalComp)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusOngoing).Count(&activeComp)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusPublished).Count(&publishedComp)
	compScore := 50.0
	if totalComp > 0 {
		compScore = float64(activeComp+publishedComp) / float64(totalComp) * 100
	}
	if compScore > 100 {
		compScore = 100
	}
	dims = append(dims, HealthDimension{
		Name:    "赛事活跃度",
		Score:   compScore,
		Weight:  0.20,
		Details: "已发布/进行中赛事占比",
	})

	// 2. Team Formation Rate (weight: 20%)
	var totalStudents, studentsWithTeams int64
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
	db.Raw(`SELECT COUNT(DISTINCT user_id) FROM team_members`).Scan(&studentsWithTeams)
	teamScore := 0.0
	if totalStudents > 0 {
		teamScore = float64(studentsWithTeams) / float64(totalStudents) * 100
	}
	if teamScore > 100 {
		teamScore = 100
	}
	dims = append(dims, HealthDimension{
		Name:    "学生组队率",
		Score:   teamScore,
		Weight:  0.20,
		Details: "已组队学生占总学生数比例",
	})

	// 3. AI Review Rate (weight: 20%)
	var totalPrePlans, reviewedPrePlans int64
	db.Model(&models.PrePlan{}).Count(&totalPrePlans)
	db.Model(&models.PrePlan{}).Where("ai_score > 0").Count(&reviewedPrePlans)
	reviewScore := 0.0
	if totalPrePlans > 0 {
		reviewScore = float64(reviewedPrePlans) / float64(totalPrePlans) * 100
	}
	if reviewScore > 100 {
		reviewScore = 100
	}
	dims = append(dims, HealthDimension{
		Name:    "AI 评审覆盖率",
		Score:   reviewScore,
		Weight:  0.20,
		Details: "已AI评审预案占总预案比例",
	})

	// 4. Award Settlement Rate (weight: 15%)
	var totalAwards, settledAwards int64
	db.Model(&models.Award{}).Count(&totalAwards)
	db.Model(&models.Award{}).Where("status = ?", models.AwardStatusSettled).Count(&settledAwards)
	awardScore := 0.0
	if totalAwards > 0 {
		awardScore = float64(settledAwards) / float64(totalAwards) * 100
	}
	if awardScore > 100 {
		awardScore = 100
	}
	dims = append(dims, HealthDimension{
		Name:    "奖项结算率",
		Score:   awardScore,
		Weight:  0.15,
		Details: "已结算奖项占总奖项比例",
	})

	// 5. User Engagement (weight: 15%)
	var totalUsers, activeUsers int64
	db.Model(&models.User{}).Count(&totalUsers)
	db.Raw(`SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at > NOW() - INTERVAL '7 days'`).Scan(&activeUsers)
	engageScore := 0.0
	if totalUsers > 0 {
		engageScore = float64(activeUsers) / float64(totalUsers) * 100
	}
	if engageScore > 100 {
		engageScore = 100
	}
	dims = append(dims, HealthDimension{
		Name:    "用户活跃度",
		Score:   engageScore,
		Weight:  0.15,
		Details: "近7天活跃用户占总用户比例",
	})

	// 6. Data Completeness (weight: 10%)
	var compWithDesc, totalCompForDesc int64
	db.Model(&models.Competition{}).Count(&totalCompForDesc)
	db.Model(&models.Competition{}).Where("description != '' AND description IS NOT NULL").Count(&compWithDesc)
	dataScore := 0.0
	if totalCompForDesc > 0 {
		dataScore = float64(compWithDesc) / float64(totalCompForDesc) * 100
	}
	if dataScore > 100 {
		dataScore = 100
	}
	dims = append(dims, HealthDimension{
		Name:    "数据完整度",
		Score:   dataScore,
		Weight:  0.10,
		Details: "有描述的赛事占总赛事比例",
	})

	// Calculate overall score
	overall := 0.0
	for _, d := range dims {
		overall += d.Score * d.Weight
	}
	if overall > 100 {
		overall = 100
	}

	// Determine level
	level := "needs_attention"
	summary := "平台运行状况需要关注，多项指标低于预期"
	switch {
	case overall >= 80:
		level = "excellent"
		summary = "平台运行状况优秀，各项指标表现良好"
	case overall >= 60:
		level = "good"
		summary = "平台运行状况良好，部分指标仍有提升空间"
	case overall >= 40:
		level = "fair"
		summary = "平台运行状况一般，建议关注薄弱环节"
	}

	c.JSON(http.StatusOK, HealthScoreResponse{
		OverallScore: overall,
		Level:        level,
		Dimensions:   dims,
		Summary:      summary,
		Timestamp:    time.Now().Format(time.RFC3339),
	})
}
