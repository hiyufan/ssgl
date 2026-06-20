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

// DifficultyHandler handles competition difficulty assessment HTTP requests.
type DifficultyHandler struct{}

// NewDifficultyHandler creates a new DifficultyHandler.
func NewDifficultyHandler() *DifficultyHandler {
	return &DifficultyHandler{}
}

// DifficultyDimension represents a single factor in difficulty assessment.
type DifficultyDimension struct {
	Name    string  `json:"name"`
	Score   float64 `json:"score"`   // 0-100
	Weight  float64 `json:"weight"`
	Details string  `json:"details"`
}

// DifficultyResponse holds the full difficulty assessment payload.
type DifficultyResponse struct {
	CompetitionID   uint                 `json:"competition_id"`
	Title           string               `json:"title"`
	OverallScore    float64              `json:"overall_score"` // 1-5
	Level           string               `json:"level"`        // "入门", "进阶", "挑战", "精英", "极限"
	Dimensions      []DifficultyDimension `json:"dimensions"`
	Summary         string               `json:"summary"`
	Tips            []string             `json:"tips"`
	RecommendedTeamSize int              `json:"recommended_team_size"`
	EstimatedPrepWeeks  int              `json:"estimated_prep_weeks"`
	Timestamp       string               `json:"timestamp"`
}

// AssessDifficulty handles GET /competitions/:id/difficulty — returns difficulty assessment.
func (h *DifficultyHandler) AssessDifficulty(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	compID := c.Param("id")

	// Load competition
	var comp models.Competition
	if err := db.First(&comp, compID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	var dims []DifficultyDimension

	// 1. Competition Scale (weight: 25%) — more teams = harder
	var teamCount int64
	db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)
	scaleScore := math.Min(float64(teamCount)/50.0*100, 100)
	dims = append(dims, DifficultyDimension{
		Name:    "参赛规模",
		Score:   scaleScore,
		Weight:  0.25,
		Details: "注册团队数: " + formatInt(teamCount),
	})

	// 2. Award Selectivity (weight: 25%) — lower award rate = harder
	var awardCount int64
	db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)
	awardRate := 0.0
	if teamCount > 0 {
		awardRate = float64(awardCount) / float64(teamCount) * 100
	}
	selectivityScore := 100 - math.Min(awardRate*2, 100) // Lower award rate → higher difficulty
	dims = append(dims, DifficultyDimension{
		Name:    "获奖难度",
		Score:   selectivityScore,
		Weight:  0.25,
		Details: "获奖率: " + formatFloat(awardRate) + "%",
	})

	// 3. Competition Level (weight: 20%) — national > provincial > school
	levelScore := 50.0
	switch comp.Level {
	case "national":
		levelScore = 90
	case "provincial":
		levelScore = 65
	case "school":
		levelScore = 35
	case "international":
		levelScore = 100
	default:
		levelScore = 50
	}
	dims = append(dims, DifficultyDimension{
		Name:    "赛事级别",
		Score:   levelScore,
		Weight:  0.20,
		Details: "级别: " + comp.Level,
	})

	// 4. Competition Type Complexity (weight: 15%)
	typeScore := typeComplexity(comp.Type)
	dims = append(dims, DifficultyDimension{
		Name:    "赛制复杂度",
		Score:   typeScore,
		Weight:  0.15,
		Details: "赛制: " + comp.Type,
	})

	// 5. Time Pressure (weight: 15%) — shorter duration = harder
	durationScore := 50.0
	if !comp.StartDate.IsZero() && !comp.EndDate.IsZero() {
		durationDays := comp.EndDate.Sub(comp.StartDate).Hours() / 24
		if durationDays > 0 {
			// Shorter competitions are harder (less prep time)
			durationScore = math.Max(0, math.Min(100, 100-math.Log2(durationDays)*10))
		}
	}
	dims = append(dims, DifficultyDimension{
		Name:    "时间压力",
		Score:   durationScore,
		Weight:  0.15,
		Details: "赛事周期: " + formatFloat(comp.EndDate.Sub(comp.StartDate).Hours()/24) + " 天",
	})

	// Calculate overall score (1-5 scale)
	totalScore := 0.0
	for _, d := range dims {
		totalScore += d.Score * d.Weight
	}
	overallScore := math.Round(totalScore/20*10) / 10 // Convert 0-100 to 1-5
	if overallScore < 1 {
		overallScore = 1
	}
	if overallScore > 5 {
		overallScore = 5
	}

	level := difficultyLevel(overallScore)
	tips := generateDifficultyTips(overallScore, comp.Type, comp.Level)
	recTeamSize := recommendedTeamSize(comp.MaxTeamSize, overallScore)
	prepWeeks := estimatedPrepWeeks(overallScore)

	c.JSON(http.StatusOK, DifficultyResponse{
		CompetitionID:       comp.ID,
		Title:               comp.Title,
		OverallScore:        overallScore,
		Level:               level,
		Dimensions:          dims,
		Summary:             generateDifficultySummary(comp.Title, overallScore, level),
		Tips:                tips,
		RecommendedTeamSize: recTeamSize,
		EstimatedPrepWeeks:  prepWeeks,
		Timestamp:           time.Now().Format(time.RFC3339),
	})
}

func typeComplexity(compType string) float64 {
	switch compType {
	case "hackathon":
		return 75
	case "ai_innovation":
		return 85
	case "data_science":
		return 80
	case "research":
		return 70
	case "business_plan":
		return 55
	case "innovation":
		return 60
	default:
		return 50
	}
}

func difficultyLevel(score float64) string {
	switch {
	case score < 1.5:
		return "入门"
	case score < 2.5:
		return "进阶"
	case score < 3.5:
		return "挑战"
	case score < 4.5:
		return "精英"
	default:
		return "极限"
	}
}

func generateDifficultySummary(title string, score float64, level string) string {
	return title + " 的综合难度评分为 " + formatFloat(score) + "/5，属于「" + level + "」级别赛事。"
}

func generateDifficultyTips(score float64, compType, compLevel string) []string {
	var tips []string

	if score >= 3.5 {
		tips = append(tips, "建议组建经验丰富的团队，成员技能互补")
		tips = append(tips, "提前2-3个月开始准备，制定详细的备赛计划")
	}
	if score >= 2.5 {
		tips = append(tips, "利用AI工具生成商业计划书和技术路线图")
		tips = append(tips, "参考往届优秀项目，学习评审标准和获奖规律")
	}
	tips = append(tips, "使用平台的答辩教练功能进行模拟训练")

	if compType == "hackathon" || compType == "ai_innovation" {
		tips = append(tips, "重点关注技术实现的创新性和完成度")
	}
	if compLevel == "national" {
		tips = append(tips, "国家级赛事竞争激烈，注重项目的社会价值和商业潜力")
	}

	return tips
}

func recommendedTeamSize(maxSize int, difficulty float64) int {
	if difficulty >= 4 {
		if maxSize >= 5 {
			return 5
		}
		return maxSize
	}
	if difficulty >= 3 {
		if maxSize >= 4 {
			return 4
		}
		return maxSize
	}
	if maxSize >= 3 {
		return 3
	}
	return maxSize
}

func estimatedPrepWeeks(difficulty float64) int {
	switch {
	case difficulty >= 4.5:
		return 12
	case difficulty >= 3.5:
		return 8
	case difficulty >= 2.5:
		return 6
	case difficulty >= 1.5:
		return 4
	default:
		return 2
	}
}

func formatInt(n int64) string {
	return fmt.Sprintf("%d", n)
}

func formatFloat(f float64) string {
	return fmt.Sprintf("%.1f", f)
}
