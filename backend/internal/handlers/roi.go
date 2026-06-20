package handlers

import (
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ROIHandler handles competition ROI calculation requests.
type ROIHandler struct{}

// NewROIHandler creates a new ROIHandler.
func NewROIHandler() *ROIHandler {
	return &ROIHandler{}
}

// CompetitionROI represents the return-on-investment analysis for a competition.
type CompetitionROI struct {
	CompetitionID   uint    `json:"competition_id"`
	CompetitionName string  `json:"competition_name"`
	ROIScore        float64 `json:"roi_score"`     // 0-100 composite score
	TimeInvestment  string  `json:"time_investment"` // low/medium/high
	RewardPotential string  `json:"reward_potential"` // low/medium/high
	DifficultyLevel string  `json:"difficulty_level"` // easy/medium/hard
	TeamCount       int     `json:"team_count"`
	StudentCount    int     `json:"student_count"`
	AwardCount      int     `json:"award_count"`
	PreplanCount    int     `json:"preplan_count"`
	AvgTeamSize     float64 `json:"avg_team_size"`
	WinRate         float64 `json:"win_rate"`       // percentage
	PreplanRate     float64 `json:"preplan_rate"`   // percentage of teams with preplans
	Factors         []ROIFactor `json:"factors"`
	Recommendation  string  `json:"recommendation"`
}

// ROIFactor represents one factor in the ROI calculation.
type ROIFactor struct {
	Name    string  `json:"name"`
	Score   float64 `json:"score"`   // 0-100
	Weight  float64 `json:"weight"`  // 0-1
	Detail  string  `json:"detail"`
}

// CalculateROI handles GET /competitions/:id/roi — calculates competition ROI analysis.
func (h *ROIHandler) CalculateROI(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()

	var comp models.Competition
	if err := db.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	// Count related entities
	var teamCount int64
	db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)

	var studentCount int64
	db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).
		Select("COALESCE(SUM(member_count), 0)").Scan(&studentCount)

	var awardCount int64
	db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

	var preplanCount int64
	db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&preplanCount)

	var registrationCount int64
	db.Model(&models.CompetitionRegistration{}).Where("competition_id = ?", comp.ID).Count(&registrationCount)

	// Calculate derived metrics
	avgTeamSize := 0.0
	if teamCount > 0 {
		avgTeamSize = float64(studentCount) / float64(teamCount)
	}

	winRate := 0.0
	if teamCount > 0 {
		winRate = float64(awardCount) / float64(teamCount) * 100
	}

	preplanRate := 0.0
	if teamCount > 0 {
		preplanRate = float64(preplanCount) / float64(teamCount) * 100
	}

	// Calculate ROI factors
	factors := make([]ROIFactor, 0, 5)

	// Factor 1: Participation Popularity (30% weight)
	// More teams = more competitive, but also more valuable experience
	popScore := math.Min(float64(teamCount)/5.0*100, 100)
	factors = append(factors, ROIFactor{
		Name:   "参与热度",
		Score:  popScore,
		Weight: 0.30,
		Detail: "基于参赛团队数评估赛事热度与竞争程度",
	})

	// Factor 2: Award Opportunity (25% weight)
	// Higher win rate = better ROI
	awardScore := math.Min(winRate*2, 100)
	if teamCount == 0 {
		awardScore = 50 // neutral if no data
	}
	factors = append(factors, ROIFactor{
		Name:   "获奖机会",
		Score:  awardScore,
		Weight: 0.25,
		Detail: "基于历史获奖率评估获奖可能性",
	})

	// Factor 3: Preparation Support (20% weight)
	// Preplan rate indicates how much preparation support exists
	prepScore := math.Min(preplanRate*1.5, 100)
	if teamCount == 0 {
		prepScore = 50
	}
	factors = append(factors, ROIFactor{
		Name:   "备赛支持",
		Score:  prepScore,
		Weight: 0.20,
		Detail: "基于预案提交率评估备赛资源与支持力度",
	})

	// Factor 4: Experience Value (15% weight)
	// Team size diversity and registration numbers
	expScore := math.Min(float64(registrationCount)/10.0*100, 100)
	factors = append(factors, ROIFactor{
		Name:   "经验值",
		Score:  expScore,
		Weight: 0.15,
		Detail: "基于报名人数评估赛事影响力与经验价值",
	})

	// Factor 5: Accessibility (10% weight)
	// Smaller avg team size = easier to participate
	accessScore := 100.0
	if avgTeamSize > 5 {
		accessScore = 60
	} else if avgTeamSize > 3 {
		accessScore = 80
	}
	if teamCount == 0 {
		accessScore = 70
	}
	factors = append(factors, ROIFactor{
		Name:   "参与门槛",
		Score:  accessScore,
		Weight: 0.10,
		Detail: "基于平均团队规模评估参与难度",
	})

	// Calculate composite ROI score
	roiScore := 0.0
	for _, f := range factors {
		roiScore += f.Score * f.Weight
	}

	// Classify time investment based on competition type
	timeInvestment := "medium"
	switch comp.Type {
	case "编程", "算法", "软件":
		timeInvestment = "high"
	case "创新创业", "商业":
		timeInvestment = "high"
	case "设计", "艺术":
		timeInvestment = "medium"
	default:
		timeInvestment = "medium"
	}

	// Classify reward potential
	rewardPotential := "medium"
	if awardCount > 5 {
		rewardPotential = "high"
	} else if awardCount <= 1 {
		rewardPotential = "low"
	}

	// Classify difficulty
	difficultyLevel := "medium"
	if teamCount > 10 {
		difficultyLevel = "hard"
	} else if teamCount <= 3 {
		difficultyLevel = "easy"
	}

	// Generate recommendation
	recommendation := generateROIRecommendation(roiScore, winRate, teamCount, preplanRate)

	c.JSON(http.StatusOK, CompetitionROI{
		CompetitionID:   comp.ID,
		CompetitionName: comp.Title,
		ROIScore:        math.Round(roiScore*10) / 10,
		TimeInvestment:  timeInvestment,
		RewardPotential: rewardPotential,
		DifficultyLevel: difficultyLevel,
		TeamCount:       int(teamCount),
		StudentCount:    int(studentCount),
		AwardCount:      int(awardCount),
		PreplanCount:    int(preplanCount),
		AvgTeamSize:     math.Round(avgTeamSize*10) / 10,
		WinRate:         math.Round(winRate*10) / 10,
		PreplanRate:     math.Round(preplanRate*10) / 10,
		Factors:         factors,
		Recommendation:  recommendation,
	})
}

// BatchROI handles GET /competitions/roi/compare — compare ROI across multiple competitions.
func (h *ROIHandler) BatchROI(c *gin.Context) {
	ids := c.QueryArray("ids")
	if len(ids) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids parameter required"})
		return
	}

	db := database.GetDB()
	results := make([]CompetitionROI, 0, len(ids))

	for _, id := range ids {
		var comp models.Competition
		if err := db.First(&comp, id).Error; err != nil {
			continue
		}

		var teamCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)

		var awardCount int64
		db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

		winRate := 0.0
		if teamCount > 0 {
			winRate = float64(awardCount) / float64(teamCount) * 100
		}

		// Simplified ROI for batch comparison
		roiScore := math.Min(float64(teamCount)/5.0*50, 50) + math.Min(winRate, 50)

		results = append(results, CompetitionROI{
			CompetitionID:   comp.ID,
			CompetitionName: comp.Title,
			ROIScore:        math.Round(roiScore*10) / 10,
			TeamCount:       int(teamCount),
			AwardCount:      int(awardCount),
			WinRate:         math.Round(winRate*10) / 10,
			Recommendation:  generateROIRecommendation(roiScore, winRate, teamCount, 0),
		})
	}

	// Sort by ROI score descending
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].ROIScore > results[i].ROIScore {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"competitions": results,
		"count":        len(results),
	})
}

func generateROIRecommendation(roiScore, winRate float64, teamCount int64, preplanRate float64) string {
	if roiScore >= 75 {
		return "强烈推荐参赛：该赛事热度高、获奖机会大、备赛支持充足，性价比极高。"
	}
	if roiScore >= 55 {
		return "推荐参赛：该赛事具有较好的参赛价值，建议认真准备预案以提高获奖概率。"
	}
	if roiScore >= 35 {
		return "可以考虑：该赛事有一定参赛价值，但竞争较激烈或获奖率偏低，建议评估自身实力后决定。"
	}
	return "谨慎选择：该赛事ROI偏低，建议优先考虑其他更具性价比的赛事。"
}
