package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// TeamAnalysisHandler handles team capability analysis HTTP requests.
type TeamAnalysisHandler struct{}

// NewTeamAnalysisHandler creates a new TeamAnalysisHandler.
func NewTeamAnalysisHandler() *TeamAnalysisHandler {
	return &TeamAnalysisHandler{}
}

// TeamMemberAnalysis holds analysis data for a single team member.
type TeamMemberAnalysis struct {
	UserID       uint    `json:"user_id"`
	Name         string  `json:"name"`
	Dept         string  `json:"dept"`
	Role         string  `json:"role"`
	TeamCount    int64   `json:"team_count"`
	AwardCount   int64   `json:"award_count"`
	PrePlanCount int64   `json:"pre_plan_count"`
	EvalScore    float64 `json:"eval_score"`
	Experience   string  `json:"experience"` // "novice", "intermediate", "expert"
}

// TeamAnalysis holds the full team analysis result.
type TeamAnalysis struct {
	TeamID          uint                `json:"team_id"`
	TeamName        string              `json:"team_name"`
	CompetitionID   uint                `json:"competition_id"`
	CompTitle       string              `json:"comp_title"`
	MemberCount     int                 `json:"member_count"`
	AvgExperience   float64             `json:"avg_experience"`
	DeptDiversity   int                 `json:"dept_diversity"`
	DeptBreakdown   map[string]int      `json:"dept_breakdown"`
	ExperienceDist  map[string]int      `json:"experience_dist"`
	Strengths       []string            `json:"strengths"`
	Gaps            []string            `json:"gaps"`
	Recommendations []string            `json:"recommendations"`
	Members         []TeamMemberAnalysis `json:"members"`
	OverallScore    float64             `json:"overall_score"`
}

// Analyze handles GET /teams/:id/analysis — provides team capability analysis.
func (h *TeamAnalysisHandler) Analyze(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	teamID := c.Param("id")

	// Get team
	var team models.Team
	if err := db.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
		return
	}

	// Get competition
	var comp models.Competition
	db.First(&comp, team.CompetitionID)

	// Get team members with user info
	var members []models.TeamMember
	db.Preload("User").Where("team_id = ?", team.ID).Find(&members)

	if len(members) == 0 {
		c.JSON(http.StatusOK, TeamAnalysis{
			TeamID:          team.ID,
			TeamName:        team.Name,
			CompetitionID:   team.CompetitionID,
			CompTitle:       comp.Title,
			MemberCount:     0,
			Strengths:       []string{},
			Gaps:            []string{"团队暂无成员"},
			Recommendations: []string{"建议邀请成员加入团队"},
			Members:         []TeamMemberAnalysis{},
			DeptBreakdown:   map[string]int{},
			ExperienceDist:  map[string]int{},
		})
		return
	}

	// Analyze each member
	deptSet := make(map[string]bool)
	deptBreakdown := make(map[string]int)
	expDist := map[string]int{"novice": 0, "intermediate": 0, "expert": 0}
	memberAnalyses := make([]TeamMemberAnalysis, 0, len(members))
	totalExp := 0.0

	for _, m := range members {
		u := m.User
		if u.ID == 0 {
			continue
		}

		// Count team memberships
		var teamCount int64
		db.Model(&models.TeamMember{}).Where("user_id = ?", u.ID).Count(&teamCount)

		// Count awards
		var awardCount int64
		db.Raw(`SELECT COUNT(DISTINCT a.id) FROM awards a
			INNER JOIN team_members tm ON tm.team_id = a.team_id
			WHERE tm.user_id = ?`, u.ID).Scan(&awardCount)

		// Count pre-plans
		var prePlanCount int64
		db.Raw(`SELECT COUNT(DISTINCT pp.id) FROM pre_plans pp
			INNER JOIN team_members tm ON tm.team_id = pp.team_id
			WHERE tm.user_id = ?`, u.ID).Scan(&prePlanCount)

		// Average evaluation score
		var evalScore float64
		db.Raw(`SELECT COALESCE(AVG(overall), 0) FROM evaluations WHERE target_id = ?`, u.ID).Scan(&evalScore)

		// Determine experience level
		expScore := float64(teamCount)*2 + float64(awardCount)*5 + float64(prePlanCount)*1.5
		expLevel := "novice"
		if expScore >= 15 {
			expLevel = "expert"
		} else if expScore >= 5 {
			expLevel = "intermediate"
		}

		totalExp += expScore
		expDist[expLevel]++

		if u.Dept != "" {
			deptSet[u.Dept] = true
			deptBreakdown[u.Dept]++
		} else {
			deptBreakdown["未知"]++
		}

		memberAnalyses = append(memberAnalyses, TeamMemberAnalysis{
			UserID:       u.ID,
			Name:         u.Name,
			Dept:         u.Dept,
			Role:         m.Role,
			TeamCount:    teamCount,
			AwardCount:   awardCount,
			PrePlanCount: prePlanCount,
			EvalScore:    evalScore,
			Experience:   expLevel,
		})
	}

	avgExp := totalExp / float64(len(members))

	// Determine strengths and gaps
	strengths := []string{}
	gaps := []string{}
	recommendations := []string{}

	// Check experience distribution
	if expDist["expert"] > 0 {
		strengths = append(strengths, "拥有经验丰富的核心成员")
	}
	if expDist["novice"] > len(members)/2 {
		gaps = append(gaps, "团队整体经验不足，新手比例较高")
		recommendations = append(recommendations, "建议邀请有经验的同学加入，或加强赛前培训")
	}

	// Check department diversity
	if len(deptSet) >= 3 {
		strengths = append(strengths, "跨学科组合，有利于创新")
	} else if len(deptSet) == 1 {
		gaps = append(gaps, "团队学科背景单一")
		recommendations = append(recommendations, "建议邀请不同专业的同学，形成互补")
	}

	// Check team size
	if len(members) < 2 {
		gaps = append(gaps, "团队人数偏少")
		recommendations = append(recommendations, "建议补充成员以增强协作能力")
	} else if len(members) >= 4 {
		strengths = append(strengths, "团队规模合理，分工明确")
	}

	// Check award experience
	totalAwards := int64(0)
	for _, ma := range memberAnalyses {
		totalAwards += ma.AwardCount
	}
	if totalAwards > 0 {
		strengths = append(strengths, "有获奖经验的成员")
	} else {
		gaps = append(gaps, "缺乏获奖经验")
		recommendations = append(recommendations, "建议参考往届优秀作品，学习获奖经验")
	}

	// Check pre-plan count
	totalPrePlans := int64(0)
	for _, ma := range memberAnalyses {
		totalPrePlans += ma.PrePlanCount
	}
	if totalPrePlans == 0 {
		gaps = append(gaps, "缺乏预案撰写经验")
		recommendations = append(recommendations, "建议尽早完成预案撰写，利用AI工具辅助")
	}

	if len(strengths) == 0 {
		strengths = append(strengths, "团队组建完成")
	}
	if len(gaps) == 0 {
		gaps = append(gaps, "暂无明显短板")
	}
	if len(recommendations) == 0 {
		recommendations = append(recommendations, "团队配置良好，建议按计划推进项目")
	}

	// Overall score (0-100)
	overallScore := 50.0 // base
	overallScore += float64(len(deptSet)) * 8           // diversity bonus
	overallScore += float64(expDist["expert"]) * 10      // expert bonus
	overallScore -= float64(expDist["novice"]) * 3       // novice penalty
	overallScore += float64(totalAwards) * 5             // award bonus
	overallScore += float64(totalPrePlans) * 2           // planning bonus
	if overallScore > 100 {
		overallScore = 100
	}
	if overallScore < 0 {
		overallScore = 0
	}

	c.JSON(http.StatusOK, TeamAnalysis{
		TeamID:          team.ID,
		TeamName:        team.Name,
		CompetitionID:   team.CompetitionID,
		CompTitle:       comp.Title,
		MemberCount:     len(members),
		AvgExperience:   avgExp,
		DeptDiversity:   len(deptSet),
		DeptBreakdown:   deptBreakdown,
		ExperienceDist:  expDist,
		Strengths:       strengths,
		Gaps:            gaps,
		Recommendations: recommendations,
		Members:         memberAnalyses,
		OverallScore:    overallScore,
	})
}
