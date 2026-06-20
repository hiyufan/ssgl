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

// CompetitionBriefHandler generates AI-powered competition strategic briefs.
type CompetitionBriefHandler struct{}

func NewCompetitionBriefHandler() *CompetitionBriefHandler {
	return &CompetitionBriefHandler{}
}

// CompetitionBrief is a comprehensive strategic brief for a competition.
type CompetitionBrief struct {
	CompetitionID    uint              `json:"competition_id"`
	Title            string            `json:"title"`
	Type             string            `json:"type"`
	Level            string            `json:"level"`
	Status           string            `json:"status"`
	GeneratedAt      time.Time         `json:"generated_at"`
	Overview         BriefOverview     `json:"overview"`
	Difficulty       BriefDifficulty   `json:"difficulty"`
	TeamStrategy     BriefTeamStrategy `json:"team_strategy"`
	Timeline         []BriefPhase      `json:"timeline"`
	SuccessFactors   []string          `json:"success_factors"`
	CommonPitfalls   []string          `json:"common_pitfalls"`
	Resources        []BriefResource   `json:"resources"`
	CompetitorInsight BriefCompetitor   `json:"competitor_insight"`
	ReadinessScore   float64           `json:"readiness_score"`
	ActionPlan       []BriefAction     `json:"action_plan"`
}

// BriefOverview provides a high-level summary.
type BriefOverview struct {
	Description     string  `json:"description"`
	DaysUntilStart  int     `json:"days_until_start"`
	DaysUntilEnd    int     `json:"days_until_end"`
	TeamCount       int     `json:"team_count"`
	StudentCount    int     `json:"student_count"`
	RegistrationCount int   `json:"registration_count"`
	PreplanCount    int     `json:"preplan_count"`
	AwardCount      int     `json:"award_count"`
	ParticipationRate float64 `json:"participation_rate"`
}

// BriefDifficulty provides a multi-dimensional difficulty assessment.
type BriefDifficulty struct {
	OverallScore    float64            `json:"overall_score"` // 1-5
	Level           string             `json:"level"`         // easy, medium, hard, expert
	Dimensions      []DifficultyDim    `json:"dimensions"`
	Description     string             `json:"description"`
}

// DifficultyDim is a single difficulty dimension.
type DifficultyDim struct {
	Name  string  `json:"name"`
	Score float64 `json:"score"`
	Notes string  `json:"notes"`
}

// BriefTeamStrategy provides team formation recommendations.
type BriefTeamStrategy struct {
	RecommendedSize   int      `json:"recommended_size"`
	MinSize           int      `json:"min_size"`
	MaxSize           int      `json:"max_size"`
	RecommendedSkills []string `json:"recommended_skills"`
	TeamComposition   string   `json:"team_composition"`
	CollaborationTips []string `json:"collaboration_tips"`
}

// BriefPhase is a phase in the competition timeline.
type BriefPhase struct {
	Name        string `json:"name"`
	StartOffset int    `json:"start_offset_days"` // days from now
	Duration    int    `json:"duration_days"`
	Description string `json:"description"`
	Tasks       []string `json:"tasks"`
}

// BriefResource is a recommended resource.
type BriefResource struct {
	Type        string `json:"type"` // tool, guide, template, dataset
	Name        string `json:"name"`
	Description string `json:"description"`
}

// BriefCompetitor provides competitor analysis.
type BriefCompetitor struct {
	TotalTeams       int     `json:"total_teams"`
	AvgTeamSize      float64 `json:"avg_team_size"`
	TopTeamNames     []string `json:"top_team_names"`
	CompetitionLevel string  `json:"competition_level"` // low, medium, high
}

// BriefAction is an action item.
type BriefAction struct {
	Priority    string `json:"priority"` // high, medium, low
	Deadline    string `json:"deadline"`
	Description string `json:"description"`
	Category    string `json:"category"` // preparation, team, submission, review
}

// GenerateBrief handles GET /api/v1/competitions/:id/brief
func (h *CompetitionBriefHandler) GenerateBrief(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	id := c.Param("id")
	var comp models.Competition
	if err := db.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	now := time.Now()
	brief := CompetitionBrief{
		CompetitionID: comp.ID,
		Title:         comp.Title,
		Type:          comp.Type,
		Level:         comp.Level,
		Status:        comp.Status,
		GeneratedAt:   now,
	}

	// ── Overview ──────────────────────────────────────────────────
	var teamCount, regCount, preplanCount, awardCount int64
	var studentCount int64
	db.Model(&models.Team{}).Where("competition_id = ? AND deleted_at IS NULL", comp.ID).Count(&teamCount)
	db.Model(&models.CompetitionRegistration{}).Where("competition_id = ? AND deleted_at IS NULL", comp.ID).Count(&regCount)
	db.Model(&models.PrePlan{}).Where("competition_id = ? AND deleted_at IS NULL", comp.ID).Count(&preplanCount)
	db.Model(&models.Award{}).Where("competition_id = ? AND deleted_at IS NULL", comp.ID).Count(&awardCount)
	db.Raw("SELECT COUNT(DISTINCT user_id) FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ? AND t.deleted_at IS NULL", comp.ID).Scan(&studentCount)

	daysUntilStart := 0
	daysUntilEnd := 0
	if !comp.StartDate.IsZero() {
		daysUntilStart = int(comp.StartDate.Sub(now).Hours() / 24)
	}
	if !comp.EndDate.IsZero() {
		daysUntilEnd = int(comp.EndDate.Sub(now).Hours() / 24)
	}

	partRate := 0.0
	if comp.MaxTeamSize > 0 && teamCount > 0 {
		maxCap := float64(comp.MaxTeamSize) * float64(teamCount)
		partRate = math.Round(float64(studentCount)/maxCap*10000) / 100
	}

	brief.Overview = BriefOverview{
		Description:       generateBriefDescription(comp),
		DaysUntilStart:    daysUntilStart,
		DaysUntilEnd:      daysUntilEnd,
		TeamCount:         int(teamCount),
		StudentCount:      int(studentCount),
		RegistrationCount: int(regCount),
		PreplanCount:      int(preplanCount),
		AwardCount:        int(awardCount),
		ParticipationRate: partRate,
	}

	// ── Difficulty ────────────────────────────────────────────────
	brief.Difficulty = assessBriefDifficulty(comp, teamCount, regCount)

	// ── Team Strategy ─────────────────────────────────────────────
	brief.TeamStrategy = generateTeamStrategy(comp)

	// ── Timeline ──────────────────────────────────────────────────
	brief.Timeline = generateBriefTimeline(comp, now)

	// ── Success Factors ───────────────────────────────────────────
	brief.SuccessFactors = generateSuccessFactors(comp)

	// ── Common Pitfalls ───────────────────────────────────────────
	brief.CommonPitfalls = generateCommonPitfalls(comp)

	// ── Resources ─────────────────────────────────────────────────
	brief.Resources = generateBriefResources(comp)

	// ── Competitor Insight ────────────────────────────────────────
	var avgTeamSize float64
	if teamCount > 0 {
		db.Raw("SELECT COALESCE(AVG(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.competition_id = ? AND t.deleted_at IS NULL GROUP BY tm.team_id) sub", comp.ID).Scan(&avgTeamSize)
	}

	var topTeams []string
	db.Model(&models.Team{}).Where("competition_id = ? AND deleted_at IS NULL", comp.ID).
		Order("created_at DESC").Limit(3).Pluck("name", &topTeams)

	compLevel := "medium"
	if teamCount > 20 {
		compLevel = "high"
	} else if teamCount < 5 {
		compLevel = "low"
	}

	brief.CompetitorInsight = BriefCompetitor{
		TotalTeams:       int(teamCount),
		AvgTeamSize:      math.Round(avgTeamSize*10) / 10,
		TopTeamNames:     topTeams,
		CompetitionLevel: compLevel,
	}

	// ── Readiness Score ──────────────────────────────────────────
	brief.ReadinessScore = calculateReadinessScore(comp, teamCount, regCount, preplanCount, now)

	// ── Action Plan ──────────────────────────────────────────────
	brief.ActionPlan = generateActionPlan(comp, now, teamCount, preplanCount)

	c.JSON(http.StatusOK, brief)
}

// generateBriefDescription generates a natural language description.
func generateBriefDescription(comp models.Competition) string {
	desc := fmt.Sprintf("「%s」是一场", comp.Title)
	switch comp.Type {
	case "hackathon":
		desc += "黑客马拉松类型的创新竞赛"
	case "programming":
		desc += "编程能力类竞赛"
	case "business":
		desc += "商业策划类竞赛"
	case "design":
		desc += "设计类竞赛"
	case "research":
		desc += "科研学术类竞赛"
	case "ai":
		desc += "人工智能类竞赛"
	default:
		desc += "综合性竞赛"
	}
	if comp.Level != "" {
		desc += "，级别为" + comp.Level
	}
	desc += "。"
	return desc
}

// assessBriefDifficulty evaluates competition difficulty.
func assessBriefDifficulty(comp models.Competition, teamCount, regCount int64) BriefDifficulty {
	dims := []DifficultyDim{}
	totalScore := 0.0

	// Competition type difficulty
	typeScore := 3.0
	typeNotes := "中等难度"
	switch comp.Type {
	case "hackathon":
		typeScore = 4.0
		typeNotes = "需要快速创新和原型开发"
	case "ai":
		typeScore = 4.5
		typeNotes = "需要深厚的AI技术背景"
	case "research":
		typeScore = 4.0
		typeNotes = "需要学术研究能力"
	case "business":
		typeScore = 3.0
		typeNotes = "需要商业分析和策划能力"
	case "programming":
		typeScore = 3.5
		typeNotes = "需要扎实的编程基础"
	}
	dims = append(dims, DifficultyDim{Name: "技术难度", Score: typeScore, Notes: typeNotes})
	totalScore += typeScore

	// Team size requirement
	teamScore := 2.0
	teamNotes := "单人或小组即可完成"
	if comp.MaxTeamSize > 3 {
		teamScore = 3.5
		teamNotes = "需要较大团队协作"
	} else if comp.MaxTeamSize > 1 {
		teamScore = 2.5
		teamNotes = "需要团队协作"
	}
	dims = append(dims, DifficultyDim{Name: "团队要求", Score: teamScore, Notes: teamNotes})
	totalScore += teamScore

	// Competition level
	levelScore := 3.0
	switch comp.Level {
	case "国家级", "national":
		levelScore = 4.5
	case "省级", "provincial":
		levelScore = 3.5
	case "校级", "school":
		levelScore = 2.0
	}
	dims = append(dims, DifficultyDim{Name: "赛事级别", Score: levelScore, Notes: fmt.Sprintf("%s赛事", comp.Level)})
	totalScore += levelScore

	// Competition intensity (based on registrations)
	intensityScore := 2.0
	intensityNotes := "竞争压力较小"
	if regCount > 50 {
		intensityScore = 4.5
		intensityNotes = "竞争非常激烈"
	} else if regCount > 20 {
		intensityScore = 3.5
		intensityNotes = "竞争较激烈"
	} else if regCount > 10 {
		intensityScore = 2.5
		intensityNotes = "竞争中等"
	}
	dims = append(dims, DifficultyDim{Name: "竞争强度", Score: intensityScore, Notes: intensityNotes})
	totalScore += intensityScore

	// Time pressure
	timeScore := 2.0
	timeNotes := "时间充裕"
	if !comp.StartDate.IsZero() && !comp.EndDate.IsZero() {
		duration := comp.EndDate.Sub(comp.StartDate).Hours() / 24
		if duration < 7 {
			timeScore = 4.5
			timeNotes = "赛程非常紧凑"
		} else if duration < 30 {
			timeScore = 3.0
			timeNotes = "赛程适中"
		} else {
			timeScore = 2.0
			timeNotes = "赛程较长，时间充裕"
		}
	}
	dims = append(dims, DifficultyDim{Name: "时间压力", Score: timeScore, Notes: timeNotes})
	totalScore += timeScore

	overall := math.Round(totalScore/float64(len(dims))*10) / 10
	level := "medium"
	desc := "中等难度赛事"
	switch {
	case overall >= 4.0:
		level = "expert"
		desc = "高难度赛事，需要充分准备和强大团队"
	case overall >= 3.5:
		level = "hard"
		desc = "较高难度赛事，建议提前规划和训练"
	case overall >= 2.5:
		level = "medium"
		desc = "中等难度赛事，正常准备即可应对"
	default:
		level = "easy"
		desc = "入门级赛事，适合新手参与"
	}

	return BriefDifficulty{
		OverallScore: overall,
		Level:        level,
		Dimensions:   dims,
		Description:  desc,
	}
}

// generateTeamStrategy produces team formation recommendations.
func generateTeamStrategy(comp models.Competition) BriefTeamStrategy {
	minSize := comp.MinTeamSize
	if minSize < 1 {
		minSize = 1
	}
	maxSize := comp.MaxTeamSize
	if maxSize < minSize {
		maxSize = minSize
	}
	recSize := minSize
	if maxSize > minSize {
		recSize = minSize + (maxSize-minSize)/2
	}

	skills := []string{}
	composition := ""
	tips := []string{}

	switch comp.Type {
	case "hackathon":
		skills = []string{"全栈开发", "UI/UX设计", "产品思维", "快速原型", "演讲展示"}
		composition = "建议包含1名全栈开发者、1名设计师和1名产品经理/演讲者"
		tips = []string{"分工明确但保持灵活", "使用Git进行版本控制", "优先实现核心功能", "预留时间准备演示"}
	case "programming":
		skills = []string{"算法设计", "数据结构", "编程语言", "调试优化", "团队协作"}
		composition = "建议包含算法能力强的选手和善于调试的选手"
		tips = []string{"赛前练习经典算法题", "熟悉竞赛平台的评测系统", "合理分配编码和测试时间"}
	case "business":
		skills = []string{"市场分析", "财务规划", "商业模式", "演讲表达", "PPT设计"}
		composition = "建议包含1名分析型选手、1名创意型选手和1名演讲选手"
		tips = []string{"深入调研目标市场", "数据支撑每个论点", "制作专业的演示文稿", "准备应对评委提问"}
	case "design":
		skills = []string{"视觉设计", "用户研究", "交互设计", "原型工具", "设计思维"}
		composition = "建议包含视觉设计师和交互设计师"
		tips = []string{"充分理解设计需求", "多做用户测试", "展示设计思路和迭代过程"}
	case "ai":
		skills = []string{"机器学习", "数据处理", "模型调优", "工程部署", "论文阅读"}
		composition = "建议包含1名ML工程师和1名数据工程师"
		tips = []string{"选择合适的基线模型", "注重数据质量", "记录实验过程", "准备技术报告"}
	default:
		skills = []string{"项目管理", "技术实现", "文档撰写", "团队协作"}
		composition = "根据赛事具体需求合理分配角色"
		tips = []string{"明确分工", "定期同步进度", "提前准备材料"}
	}

	return BriefTeamStrategy{
		RecommendedSize:   recSize,
		MinSize:           minSize,
		MaxSize:           maxSize,
		RecommendedSkills: skills,
		TeamComposition:   composition,
		CollaborationTips: tips,
	}
}

// generateBriefTimeline creates a preparation timeline.
func generateBriefTimeline(comp models.Competition, now time.Time) []BriefPhase {
	phases := []BriefPhase{}

	daysUntilStart := 0
	if !comp.StartDate.IsZero() {
		daysUntilStart = int(comp.StartDate.Sub(now).Hours() / 24)
	}
	daysUntilEnd := 0
	if !comp.EndDate.IsZero() {
		daysUntilEnd = int(comp.EndDate.Sub(now).Hours() / 24)
	}

	if daysUntilStart > 0 {
		// Pre-competition phases
		phases = append(phases, BriefPhase{
			Name:        "了解赛事",
			StartOffset: 0,
			Duration:    int(math.Min(float64(daysUntilStart), 3)),
			Description: "深入了解赛事规则、评分标准和历届获奖项目",
			Tasks:       []string{"阅读赛事章程", "研究往届获奖作品", "评估自身能力与赛事匹配度"},
		})

		if daysUntilStart > 7 {
			phases = append(phases, BriefPhase{
				Name:        "组建团队",
				StartOffset: 3,
				Duration:    int(math.Min(float64(daysUntilStart-7), 7)),
				Description: "寻找合适的队友，明确分工",
				Tasks:       []string{"使用队友匹配功能", "确定团队角色分工", "建立沟通机制"},
			})
		}

		if daysUntilStart > 14 {
			phases = append(phases, BriefPhase{
				Name:        "技能准备",
				StartOffset: int(math.Max(10, float64(daysUntilStart-21))),
				Duration:    int(math.Min(14, float64(daysUntilStart-10))),
				Description: "针对赛事所需技能进行专项训练",
				Tasks:       []string{"学习相关技术/知识", "完成练手项目", "参加相关培训"},
			})
		}
	}

	// Competition period
	if daysUntilEnd > 0 {
		phases = append(phases, BriefPhase{
			Name:        "正式参赛",
			StartOffset: int(math.Max(0, float64(daysUntilStart))),
			Duration:    daysUntilEnd,
			Description: "提交作品、完成答辩",
			Tasks:       []string{"完成项目开发", "撰写预案/报告", "使用AI工具优化", "准备答辩"},
		})
	}

	return phases
}

// generateSuccessFactors lists key success factors.
func generateSuccessFactors(comp models.Competition) []string {
	factors := []string{
		"充分理解赛事评分标准和评审偏好",
		"提前组建多元化能力互补的团队",
	}

	switch comp.Type {
	case "hackathon":
		factors = append(factors, "注重创新性和实用性结合")
		factors = append(factors, "快速原型验证想法的可行性")
		factors = append(factors, "演示效果和讲故事能力很关键")
	case "business":
		factors = append(factors, "数据驱动的市场分析")
		factors = append(factors, "清晰可行的商业模式")
		factors = append(factors, "专业的财务预测")
	case "ai":
		factors = append(factors, "选择合适的技术路线")
		factors = append(factors, "数据质量和特征工程")
		factors = append(factors, "实验记录和技术文档完整")
	case "programming":
		factors = append(factors, "算法和数据结构基础扎实")
		factors = append(factors, "代码质量和运行效率")
		factors = append(factors, "边界条件处理完善")
	}

	factors = append(factors, "善用AI辅助工具提升效率")
	factors = append(factors, "按时提交高质量的预案文档")

	return factors
}

// generateCommonPitfalls lists common mistakes.
func generateCommonPitfalls(comp models.Competition) []string {
	pitfalls := []string{
		"忽视赛事规则和评分标准细节",
		"团队分工不明确导致效率低下",
		"临近截止才开始准备，时间不足",
	}

	switch comp.Type {
	case "hackathon":
		pitfalls = append(pitfalls, "过度追求技术复杂度，忽略用户价值")
		pitfalls = append(pitfalls, "没有预留演示准备时间")
	case "business":
		pitfalls = append(pitfalls, "市场分析缺乏数据支撑")
		pitfalls = append(pitfalls, "财务预测过于乐观不切实际")
	case "ai":
		pitfalls = append(pitfalls, "模型选择不当或过拟合")
		pitfalls = append(pitfalls, "忽视数据预处理和清洗")
	}

	return pitfalls
}

// generateBriefResources recommends preparation resources.
func generateBriefResources(comp models.Competition) []BriefResource {
	return []BriefResource{
		{Type: "tool", Name: "AI工具箱", Description: "商业计划书生成、市场分析、技术路线图、改进方案、资源匹配"},
		{Type: "tool", Name: "AI答辩教练", Description: "模拟答辩训练、雷达图评分和详细反馈报告"},
		{Type: "guide", Name: "知识库搜索", Description: "检索相关赛事资料和获奖案例，获取灵感和参考"},
		{Type: "template", Name: "预案模板", Description: "参考优秀预案模板，快速构建高质量方案"},
	}
}

// calculateReadinessScore computes a readiness score (0-100).
func calculateReadinessScore(comp models.Competition, teamCount, regCount, preplanCount int64, now time.Time) float64 {
	score := 50.0 // baseline

	// Team formation bonus
	if teamCount > 0 {
		score += math.Min(float64(teamCount)*3, 15)
	}

	// Preplan submission bonus
	if preplanCount > 0 {
		score += math.Min(float64(preplanCount)*5, 15)
	}

	// Registration momentum
	if regCount > 10 {
		score += 10
	} else if regCount > 5 {
		score += 5
	}

	// Time factor
	if !comp.StartDate.IsZero() {
		daysUntil := comp.StartDate.Sub(now).Hours() / 24
		if daysUntil < 0 {
			// Already started
			score += 5
		} else if daysUntil > 30 {
			score += 5 // Plenty of time
		}
	}

	// Status factor
	switch comp.Status {
	case "published":
		score += 5
	case "ongoing":
		score += 10
	}

	return math.Min(math.Round(score*10)/10, 100)
}

// generateActionPlan produces actionable steps.
func generateActionPlan(comp models.Competition, now time.Time, teamCount, preplanCount int64) []BriefAction {
	actions := []BriefAction{}

	daysUntilEnd := 0
	if !comp.EndDate.IsZero() {
		daysUntilEnd = int(comp.EndDate.Sub(now).Hours() / 24)
	}

	// Always recommend these
	actions = append(actions, BriefAction{
		Priority:    "high",
		Deadline:    "立即",
		Description: "详细阅读赛事章程和评分标准",
		Category:    "preparation",
	})

	if teamCount == 0 {
		actions = append(actions, BriefAction{
			Priority:    "high",
			Deadline:    "3天内",
			Description: "使用队友匹配功能组建团队",
			Category:    "team",
		})
	}

	if preplanCount == 0 && daysUntilEnd > 7 {
		actions = append(actions, BriefAction{
			Priority:    "high",
			Deadline:    "1周内",
			Description: "撰写并提交预案文档",
			Category:    "submission",
		})
	}

	actions = append(actions, BriefAction{
		Priority:    "medium",
		Deadline:    "持续进行",
		Description: "使用AI工具箱优化项目方案",
		Category:    "review",
	})

	if daysUntilEnd > 0 && daysUntilEnd <= 14 {
		actions = append(actions, BriefAction{
			Priority:    "high",
			Deadline:    fmt.Sprintf("距截止还有%d天", daysUntilEnd),
			Description: "加紧完成项目并进行最终检查",
			Category:    "submission",
		})
	}

	actions = append(actions, BriefAction{
		Priority:    "medium",
		Deadline:    "提交前",
		Description: "使用AI答辩教练进行模拟答辩训练",
		Category:    "review",
	})

	return actions
}
