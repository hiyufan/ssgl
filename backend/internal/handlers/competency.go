package handlers

import (
	"fmt"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"gorm.io/gorm"
)

// CompetencyHandler generates multi-dimensional student competency maps.
type CompetencyHandler struct{}

func NewCompetencyHandler() *CompetencyHandler {
	return &CompetencyHandler{}
}

// ── Response structures ────────────────────────────────────────────────────

// CompetencyMap is the top-level response.
type CompetencyMap struct {
	StudentID      uint                  `json:"student_id"`
	StudentName    string                `json:"student_name"`
	GeneratedAt    time.Time             `json:"generated_at"`
	OverallScore   float64               `json:"overall_score"`
	Grade          string                `json:"grade"` // S/A/B/C/D
	Dimensions     []CompetencyDimension `json:"dimensions"`
	Strengths      []string              `json:"strengths"`
	Weaknesses     []string              `json:"weaknesses"`
	Roadmap        []RoadmapStep         `json:"roadmap"`
	PeerComparison *PeerComparison       `json:"peer_comparison,omitempty"`
	Badges         []CompetencyBadge     `json:"badges"`
}

// CompetencyDimension is a single axis on the competency radar.
type CompetencyDimension struct {
	Name        string  `json:"name"`
	Score       float64 `json:"score"` // 0-100
	Level       string  `json:"level"` // "初学", "进阶", "熟练", "精通", "专家"
	Weight      float64 `json:"weight"`
	Description string  `json:"description"`
	Evidence    string  `json:"evidence"` // what contributed to this score
}

// RoadmapStep is one step in the improvement roadmap.
type RoadmapStep struct {
	Dimension string   `json:"dimension"`
	Target    float64  `json:"target"`
	Current   float64  `json:"current"`
	Gap       float64  `json:"gap"`
	Actions   []string `json:"actions"`
	Priority  int      `json:"priority"` // 1=highest
}

// PeerComparison shows how the student compares to peers.
type PeerComparison struct {
	Percentile     float64 `json:"percentile"` // 0-100
	Rank           int     `json:"rank"`
	TotalPeers     int     `json:"total_peers"`
	AvgPeerScore   float64 `json:"avg_peer_score"`
	BestDimension  string  `json:"best_dimension"`
	WorstDimension string  `json:"worst_dimension"`
}

// CompetencyBadge is an achievement badge.
type CompetencyBadge struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// ── Competency dimension definitions ───────────────────────────────────────

var competencyDimDefs = []struct {
	Name        string
	Key         string
	Weight      float64
	Description string
}{
	{"编程能力", "programming", 0.20, "算法、编程竞赛、技术实现能力"},
	{"创新思维", "innovation", 0.18, "创新赛事参与、项目创意和原创性"},
	{"商业素养", "business", 0.15, "商业计划、市场分析、商业模式设计"},
	{"团队协作", "teamwork", 0.15, "团队参与度、领导力、协作能力"},
	{"项目管理", "project_mgmt", 0.12, "预案质量、里程碑达成、进度管理"},
	{"学术研究", "research", 0.10, "研究型赛事、论文、学术能力"},
	{"AI应用", "ai_skill", 0.10, "AI相关赛事和工具使用、技术创新"},
}

// ── Handler ────────────────────────────────────────────────────────────────

// GetCompetencyMap returns a comprehensive competency map for a student.
//
//	GET /api/v1/students/:id/competency
func (h *CompetencyHandler) GetCompetencyMap(c *gin.Context) {
	if _, exists := c.Get("user_id"); !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	studentID, err := parseUint(c.Param("id"))
	if err != nil || studentID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
		return
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	var student models.User
	if err := db.First(&student, studentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
		return
	}

	result := CompetencyMap{
		StudentID:   studentID,
		StudentName: student.Name,
		GeneratedAt: time.Now(),
	}

	// ── Gather raw data ─────────────────────────────────────────────────
	var registrations []models.CompetitionRegistration
	db.Where("user_id = ?", studentID).Preload("Competition").Find(&registrations)

	var teamMembers []models.TeamMember
	db.Where("user_id = ?", studentID).Preload("Team").Find(&teamMembers)

	var awards []models.Award
	db.Joins("JOIN teams ON teams.id = awards.team_id").
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ?", studentID).
		Preload("Competition").
		Group("awards.id").
		Find(&awards)

	var preplans []models.PrePlan
	db.Joins("JOIN teams ON teams.id = pre_plans.team_id").
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ?", studentID).
		Group("pre_plans.id").
		Find(&preplans)

	// ── Build type-based stats ──────────────────────────────────────────
	typeStats := map[string]compTypeStat{}

	for _, reg := range registrations {
		ts := typeStats[reg.Competition.Type]
		ts.count++
		typeStats[reg.Competition.Type] = ts
	}

	for _, tm := range teamMembers {
		if tm.Team.CompetitionID > 0 {
			var comp models.Competition
			if err := db.First(&comp, tm.Team.CompetitionID).Error; err == nil {
				ts := typeStats[comp.Type]
				ts.teams++
				typeStats[comp.Type] = ts
			}
		}
	}

	for _, a := range awards {
		ts := typeStats[a.Competition.Type]
		ts.awards++
		typeStats[a.Competition.Type] = ts
	}

	_ = preplans // used for project_mgmt dimension

	// ── Score each dimension ────────────────────────────────────────────
	dimScores := map[string]float64{}

	dimScores["programming"] = calcDimScore(typeStats["hackathon"], typeStats["programming"], typeStats["data_science"])
	dimScores["innovation"] = calcDimScore(typeStats["innovation"], typeStats["hackathon"], compTypeStat{})
	dimScores["business"] = calcDimScore(typeStats["business_plan"], compTypeStat{}, compTypeStat{})

	// Teamwork: based on team count and leadership
	leadershipCount := 0
	for _, tm := range teamMembers {
		if tm.Role == "leader" || tm.Role == "captain" {
			leadershipCount++
		}
	}
	dimScores["teamwork"] = math.Min(float64(len(teamMembers)*15+leadershipCount*10), 100)

	// Project management: based on preplans and milestones
	var milestoneDone int64
	db.Model(&models.Milestone{}).
		Joins("JOIN competitions ON competitions.id = milestones.competition_id").
		Joins("JOIN teams ON teams.competition_id = competitions.id").
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ? AND milestones.status = ?", studentID, "completed").
		Group("milestones.id").
		Count(&milestoneDone)

	dimScores["project_mgmt"] = math.Min(float64(len(preplans)*20+int(milestoneDone)*10), 100)
	dimScores["research"] = calcDimScore(typeStats["research"], compTypeStat{}, compTypeStat{})
	dimScores["ai_skill"] = calcDimScore(typeStats["ai_innovation"], typeStats["ai"], compTypeStat{})

	// Bonus: awards boost all dimensions
	totalAwards := len(awards)
	if totalAwards > 0 {
		boost := math.Min(float64(totalAwards)*5, 20)
		for k := range dimScores {
			dimScores[k] = math.Min(dimScores[k]+boost, 100)
		}
	}

	// ── Build dimension list ────────────────────────────────────────────
	var totalWeighted, totalWeight float64

	for _, def := range competencyDimDefs {
		score := dimScores[def.Key]
		level := compLevel(score)

		dim := CompetencyDimension{
			Name:        def.Name,
			Score:       math.Round(score*10) / 10,
			Level:       level,
			Weight:      def.Weight,
			Description: def.Description,
			Evidence:    buildCompEvidence(def.Key, typeStats, len(registrations), totalAwards, len(teamMembers)),
		}
		result.Dimensions = append(result.Dimensions, dim)

		totalWeighted += score * def.Weight
		totalWeight += def.Weight
	}

	if totalWeight > 0 {
		result.OverallScore = math.Round(totalWeighted/totalWeight*10) / 10
	}
	result.Grade = compGrade(result.OverallScore)

	// Sort by score descending for strengths/weaknesses
	sort.Slice(result.Dimensions, func(i, j int) bool {
		return result.Dimensions[i].Score > result.Dimensions[j].Score
	})

	for i, dim := range result.Dimensions {
		if i < 2 && dim.Score >= 50 {
			result.Strengths = append(result.Strengths, dim.Name)
		}
		if i >= len(result.Dimensions)-2 && dim.Score < 60 {
			result.Weaknesses = append(result.Weaknesses, dim.Name)
		}
	}

	result.Roadmap = buildCompRoadmap(result.Dimensions)
	result.PeerComparison = calcPeerComparison(db, studentID, result.OverallScore)
	result.Badges = buildCompBadges(result, totalAwards, len(registrations), len(teamMembers))

	c.JSON(http.StatusOK, result)
}

// ── Helper types and functions ─────────────────────────────────────────────

type compTypeStat struct {
	count  int
	awards int
	teams  int
}

func calcDimScore(primary, secondary, tertiary compTypeStat) float64 {
	score := 0.0
	score += float64(primary.count) * 15
	score += float64(primary.awards) * 20
	score += float64(primary.teams) * 5
	score += float64(secondary.count) * 8
	score += float64(secondary.awards) * 12
	score += float64(tertiary.count) * 5
	score += float64(tertiary.awards) * 8
	return math.Min(score, 100)
}

func compLevel(score float64) string {
	switch {
	case score >= 90:
		return "专家"
	case score >= 75:
		return "精通"
	case score >= 55:
		return "熟练"
	case score >= 30:
		return "进阶"
	default:
		return "初学"
	}
}

func compGrade(score float64) string {
	switch {
	case score >= 90:
		return "S"
	case score >= 75:
		return "A"
	case score >= 55:
		return "B"
	case score >= 35:
		return "C"
	default:
		return "D"
	}
}

func buildCompEvidence(key string, typeStats map[string]compTypeStat, totalComps, totalAwards, totalTeams int) string {
	switch key {
	case "programming":
		ts := typeStats["hackathon"]
		ts2 := typeStats["programming"]
		return fmt.Sprintf("编程/黑客松赛事 %d 项，获奖 %d 项", ts.count+ts2.count, ts.awards+ts2.awards)
	case "innovation":
		ts := typeStats["innovation"]
		return fmt.Sprintf("创新赛事 %d 项", ts.count)
	case "business":
		ts := typeStats["business_plan"]
		return fmt.Sprintf("商业赛事 %d 项", ts.count)
	case "teamwork":
		return fmt.Sprintf("参与团队 %d 个", totalTeams)
	case "project_mgmt":
		return "提交预案并管理项目进度"
	case "research":
		ts := typeStats["research"]
		return fmt.Sprintf("科研赛事 %d 项", ts.count)
	case "ai_skill":
		ts := typeStats["ai_innovation"]
		ts2 := typeStats["ai"]
		return fmt.Sprintf("AI赛事 %d 项", ts.count+ts2.count)
	default:
		return ""
	}
}

func buildCompRoadmap(dims []CompetencyDimension) []RoadmapStep {
	var roadmap []RoadmapStep
	priority := 1

	sorted := make([]CompetencyDimension, len(dims))
	copy(sorted, dims)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Score < sorted[j].Score
	})

	for _, dim := range sorted {
		if dim.Score >= 80 {
			continue
		}
		target := math.Min(dim.Score+25, 95)
		gap := target - dim.Score

		step := RoadmapStep{
			Dimension: dim.Name,
			Target:    math.Round(target*10) / 10,
			Current:   dim.Score,
			Gap:       math.Round(gap*10) / 10,
			Priority:  priority,
			Actions:   compRoadmapActions(dim.Name, dim.Score),
		}
		roadmap = append(roadmap, step)
		priority++
		if priority > 3 {
			break
		}
	}
	return roadmap
}

func compRoadmapActions(dimension string, currentScore float64) []string {
	switch dimension {
	case "编程能力":
		actions := []string{"参加编程类赛事积累实战经验", "使用AI工具箱中的技术路线工具辅助学习"}
		if currentScore < 30 {
			actions = append(actions, "从校级编程赛事起步")
		}
		return actions
	case "创新思维":
		return []string{"参加创新创业类赛事", "使用AI工具箱生成创新方案", "学习设计思维方法论"}
	case "商业素养":
		return []string{"参加商业计划书赛事", "使用商业计划AI工具辅助撰写", "学习商业模式画布"}
	case "团队协作":
		return []string{"主动加入或创建团队", "使用队友匹配功能寻找互补伙伴", "尝试担任团队队长"}
	case "项目管理":
		return []string{"提交高质量预案", "使用里程碑功能追踪项目进度", "学习敏捷项目管理方法"}
	case "学术研究":
		return []string{"参加科研类赛事", "使用知识库查阅文献", "学习学术写作规范"}
	case "AI应用":
		return []string{"参加AI创新赛事", "多使用AI工具箱和答辩教练", "学习机器学习基础知识"}
	default:
		return []string{"多参与赛事积累经验"}
	}
}

func calcPeerComparison(db *gorm.DB, studentID uint, score float64) *PeerComparison {
	// Count all students who have participated in competitions
	var totalPeers int64
	db.Model(&models.CompetitionRegistration{}).
		Distinct("user_id").
		Count(&totalPeers)

	if totalPeers <= 1 {
		return nil
	}

	// Count students with fewer registrations (simplified rank)
	var lowerCount int64
	db.Model(&models.CompetitionRegistration{}).
		Select("user_id, count(*) as cnt").
		Group("user_id").
		Having("count(*) < (SELECT count(*) FROM competition_registrations WHERE user_id = ?)", studentID).
		Count(&lowerCount)

	percentile := float64(lowerCount) / float64(totalPeers) * 100
	rank := int(totalPeers - lowerCount)

	return &PeerComparison{
		Percentile: math.Round(percentile*10) / 10,
		Rank:       rank,
		TotalPeers: int(totalPeers),
	}
}

func buildCompBadges(result CompetencyMap, totalAwards, totalComps, totalTeams int) []CompetencyBadge {
	var badges []CompetencyBadge

	if totalComps >= 1 {
		badges = append(badges, CompetencyBadge{Name: "初出茅庐", Description: "首次参加赛事", Icon: "🌱"})
	}
	if totalComps >= 5 {
		badges = append(badges, CompetencyBadge{Name: "赛场老手", Description: "参加5项以上赛事", Icon: "🏆"})
	}
	if totalComps >= 10 {
		badges = append(badges, CompetencyBadge{Name: "赛事达人", Description: "参加10项以上赛事", Icon: "⭐"})
	}
	if totalAwards >= 1 {
		badges = append(badges, CompetencyBadge{Name: "首战告捷", Description: "首次获奖", Icon: "🥇"})
	}
	if totalAwards >= 3 {
		badges = append(badges, CompetencyBadge{Name: "获奖常客", Description: "获得3项以上奖项", Icon: "🎖️"})
	}
	if totalTeams >= 3 {
		badges = append(badges, CompetencyBadge{Name: "社交达人", Description: "加入3个以上团队", Icon: "👥"})
	}
	if result.Grade == "S" {
		badges = append(badges, CompetencyBadge{Name: "全能王者", Description: "综合能力达到S级", Icon: "👑"})
	}
	if result.Grade == "A" {
		badges = append(badges, CompetencyBadge{Name: "精英选手", Description: "综合能力达到A级", Icon: "💎"})
	}
	for _, dim := range result.Dimensions {
		if dim.Score >= 90 {
			badges = append(badges, CompetencyBadge{Name: dim.Name + "专家", Description: dim.Name + "维度达到专家级", Icon: "🔥"})
		}
	}
	return badges
}
