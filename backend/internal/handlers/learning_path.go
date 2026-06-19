package handlers

import (
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// LearningPathHandler generates personalized learning paths for students.
type LearningPathHandler struct{}

func NewLearningPathHandler() *LearningPathHandler {
	return &LearningPathHandler{}
}

// ── Response structures ────────────────────────────────────────────────────

type LearningPath struct {
	StudentID    uint              `json:"student_id"`
	StudentName  string            `json:"student_name"`
	GeneratedAt  time.Time         `json:"generated_at"`
	OverallLevel string            `json:"overall_level"` // beginner, intermediate, advanced, expert
	TotalPoints  int               `json:"total_points"`
	CurrentPhase string            `json:"current_phase"`
	Phases       []PathPhase       `json:"phases"`
	SkillRadar   []SkillDimension  `json:"skill_radar"`
	Goals        []LearningGoal    `json:"goals"`
	Resources    []LearningResource `json:"resources"`
}

type PathPhase struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      string    `json:"status"` // completed, current, upcoming
	Progress    float64   `json:"progress"`
	Tasks       []PathTask `json:"tasks"`
	EstDuration string    `json:"est_duration"`
}

type PathTask struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Type        string `json:"type"` // competition, skill, project, study
	Status      string `json:"status"` // done, in_progress, pending
	Description string `json:"description"`
	Priority    string `json:"priority"` // high, medium, low
}

type SkillDimension struct {
	Name      string  `json:"name"`
	Current   float64 `json:"current"`
	Target    float64 `json:"target"`
	Level     string  `json:"level"`
}

type LearningGoal struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Category    string    `json:"category"`
	TargetDate  string    `json:"target_date"`
	Progress    float64   `json:"progress"`
	Description string    `json:"description"`
}

type LearningResource struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Type     string `json:"type"` // article, video, course, tool
	Category string `json:"category"`
	URL      string `json:"url,omitempty"`
	Duration string `json:"duration"`
}

// ── Handler ────────────────────────────────────────────────────────────────

// GetLearningPath returns a personalized learning path for a student.
//
//	GET /api/v1/students/:id/learning-path
func (h *LearningPathHandler) GetLearningPath(c *gin.Context) {
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

	// Gather student data
	var registrations []models.CompetitionRegistration
	db.Where("user_id = ?", studentID).Preload("Competition").Find(&registrations)

	var awards []models.Award
	db.Joins("JOIN teams ON teams.id = awards.team_id").
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ?", studentID).
		Preload("Competition").
		Group("awards.id").
		Find(&awards)

	var teamMembers []models.TeamMember
	db.Where("user_id = ?", studentID).Find(&teamMembers)

	var preplanCount int64
	db.Model(&models.PrePlan{}).
		Joins("JOIN teams ON teams.id = pre_plans.team_id").
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ?", studentID).
		Group("pre_plans.id").
		Count(&preplanCount)

	// Points
	var totalPoints int64
	db.Model(&models.AchievementPoint{}).Where("user_id = ?", studentID).Select("COALESCE(SUM(points),0)").Scan(&totalPoints)

	// Analyze skill dimensions
	compTypeCounts := map[string]int{}
	for _, reg := range registrations {
		compTypeCounts[reg.Competition.Type]++
	}

	typeSkillMap := map[string]string{
		"hackathon":   "创新实践",
		"programming": "编程能力",
		"business":    "商业思维",
		"design":      "设计能力",
		"research":    "科研能力",
		"ai":          "人工智能",
		"innovation":  "创新创业",
	}

	// Build skill radar
	allSkills := []string{"编程能力", "创新实践", "商业思维", "设计能力", "科研能力", "人工智能", "团队协作", "项目管理"}
	skillScores := map[string]float64{}
	for compType, cnt := range compTypeCounts {
		skillName := typeSkillMap[compType]
		if skillName == "" {
			skillName = compType
		}
		skillScores[skillName] = math.Min(100, float64(cnt)*25)
	}
	// Team collaboration score from team count
	if len(teamMembers) > 0 {
		skillScores["团队协作"] = math.Min(100, float64(len(teamMembers))*20)
	}
	// Project management from preplans
	if preplanCount > 0 {
		skillScores["项目管理"] = math.Min(100, float64(preplanCount)*30)
	}

	var skillRadar []SkillDimension
	for _, name := range allSkills {
		current := skillScores[name]
		target := math.Min(100, current+30)
		if current < 20 {
			target = 50
		}
		level := "入门"
		if current >= 80 {
			level = "精通"
		} else if current >= 60 {
			level = "熟练"
		} else if current >= 40 {
			level = "进阶"
		}
		skillRadar = append(skillRadar, SkillDimension{
			Name:    name,
			Current: current,
			Target:  target,
			Level:   level,
		})
	}

	// Determine overall level
	avgScore := 0.0
	for _, s := range skillRadar {
		avgScore += s.Current
	}
	if len(skillRadar) > 0 {
		avgScore /= float64(len(skillRadar))
	}

	overallLevel := "beginner"
	currentPhase := "基础夯实"
	if avgScore >= 75 {
		overallLevel = "expert"
		currentPhase = "冲刺突破"
	} else if avgScore >= 50 {
		overallLevel = "advanced"
		currentPhase = "能力进阶"
	} else if avgScore >= 25 {
		overallLevel = "intermediate"
		currentPhase = "技能拓展"
	}

	// Build phases based on student level
	phases := buildLearningPathPhases(overallLevel, compTypeCounts, int(preplanCount), len(awards), len(registrations))

	// Build goals
	goals := buildLearningGoals(overallLevel, len(registrations), len(awards), int(totalPoints))

	// Build resources
	resources := buildLearningResources(overallLevel, compTypeCounts)

	path := LearningPath{
		StudentID:    studentID,
		StudentName:  student.Name,
		GeneratedAt:  time.Now(),
		OverallLevel: overallLevel,
		TotalPoints:  int(totalPoints),
		CurrentPhase: currentPhase,
		Phases:       phases,
		SkillRadar:   skillRadar,
		Goals:        goals,
		Resources:    resources,
	}

	c.JSON(http.StatusOK, path)
}

// buildLearningPathPhases creates learning path phases based on student level.
func buildLearningPathPhases(level string, compTypes map[string]int, preplanCount, awardCount, regCount int) []PathPhase {
	phases := []PathPhase{
		{
			ID:          1,
			Title:       "基础夯实",
			Description: "掌握竞赛基础知识，完成首轮参赛体验",
			EstDuration: "1-2个月",
		},
		{
			ID:          2,
			Title:       "技能拓展",
			Description: "深入学习核心技能，参与多种类型赛事",
			EstDuration: "2-3个月",
		},
		{
			ID:          3,
			Title:       "能力进阶",
			Description: "提升项目质量，争取获奖突破",
			EstDuration: "3-4个月",
		},
		{
			ID:          4,
			Title:       "冲刺突破",
			Description: "挑战高级别赛事，打造标杆项目",
			EstDuration: "4-6个月",
		},
	}

	// Assign status based on current level
	levelOrder := map[string]int{"beginner": 0, "intermediate": 1, "advanced": 2, "expert": 3}
	currentIdx := levelOrder[level]

	for i := range phases {
		if i < currentIdx {
			phases[i].Status = "completed"
			phases[i].Progress = 100
		} else if i == currentIdx {
			phases[i].Status = "current"
			phases[i].Progress = calculatePhaseProgress(i, compTypes, preplanCount, awardCount, regCount)
		} else {
			phases[i].Status = "upcoming"
			phases[i].Progress = 0
		}
	}

	// Add tasks to each phase
	phases[0].Tasks = []PathTask{
		{ID: 1, Title: "了解竞赛类型与规则", Type: "study", Priority: "high"},
		{ID: 2, Title: "完成首次赛事报名", Type: "competition", Priority: "high"},
		{ID: 3, Title: "组建或加入一个团队", Type: "project", Priority: "high"},
		{ID: 4, Title: "学习使用AI工具箱", Type: "skill", Priority: "medium"},
	}
	phases[1].Tasks = []PathTask{
		{ID: 5, Title: "参加编程/创新类赛事", Type: "competition", Priority: "high"},
		{ID: 6, Title: "提交首份AI预案", Type: "project", Priority: "high"},
		{ID: 7, Title: "学习商业计划书撰写", Type: "skill", Priority: "medium"},
		{ID: 8, Title: "使用答辩教练练习", Type: "skill", Priority: "medium"},
	}
	phases[2].Tasks = []PathTask{
		{ID: 9, Title: "争取省级以上奖项", Type: "competition", Priority: "high"},
		{ID: 10, Title: "完成SWOT分析与改进", Type: "project", Priority: "high"},
		{ID: 11, Title: "参与跨学科赛事", Type: "competition", Priority: "medium"},
		{ID: 12, Title: "完善技术路线规划", Type: "skill", Priority: "medium"},
	}
	phases[3].Tasks = []PathTask{
		{ID: 13, Title: "挑战国家级/国际赛事", Type: "competition", Priority: "high"},
		{ID: 14, Title: "打造标杆项目案例", Type: "project", Priority: "high"},
		{ID: 15, Title: "指导低年级学生参赛", Type: "skill", Priority: "medium"},
		{ID: 16, Title: "积累成果展示素材", Type: "project", Priority: "low"},
	}

	// Mark tasks based on actual progress
	for pi := range phases {
		for ti := range phases[pi].Tasks {
			task := &phases[pi].Tasks[ti]
			switch task.Type {
			case "competition":
				if regCount > 0 && pi == 0 {
					task.Status = "done"
				} else if regCount > 2 && pi <= 1 {
					task.Status = "done"
				} else if pi == currentIdx {
					task.Status = "in_progress"
				}
			case "project":
				if preplanCount > 0 && pi <= 1 {
					task.Status = "done"
				} else if pi == currentIdx {
					task.Status = "in_progress"
				}
			case "skill":
				if len(compTypes) > 2 && pi <= 1 {
					task.Status = "done"
				} else if pi == currentIdx {
					task.Status = "in_progress"
				}
			case "study":
				if regCount > 0 && pi == 0 {
					task.Status = "done"
				}
			}
			if phases[pi].Status == "completed" {
				task.Status = "done"
			}
			if phases[pi].Status == "upcoming" {
				task.Status = "pending"
			}
		}
	}

	return phases
}

func calculatePhaseProgress(phaseIdx int, compTypes map[string]int, preplanCount, awardCount, regCount int) float64 {
	switch phaseIdx {
	case 0: // 基础夯实
		score := 0.0
		if regCount > 0 {
			score += 40
		}
		if len(compTypes) > 0 {
			score += 30
		}
		if preplanCount > 0 {
			score += 30
		}
		return math.Min(100, score)
	case 1: // 技能拓展
		score := 0.0
		if regCount >= 3 {
			score += 30
		}
		if len(compTypes) >= 2 {
			score += 30
		}
		if preplanCount >= 2 {
			score += 20
		}
		if awardCount > 0 {
			score += 20
		}
		return math.Min(100, score)
	case 2: // 能力进阶
		score := 0.0
		if awardCount >= 2 {
			score += 40
		}
		if regCount >= 5 {
			score += 30
		}
		if len(compTypes) >= 3 {
			score += 30
		}
		return math.Min(100, score)
	case 3: // 冲刺突破
		score := 0.0
		if awardCount >= 5 {
			score += 50
		}
		if regCount >= 10 {
			score += 50
		}
		return math.Min(100, score)
	}
	return 0
}

func buildLearningGoals(level string, regCount, awardCount, points int) []LearningGoal {
	goals := []LearningGoal{
		{ID: 1, Title: "完成3场不同类型赛事", Category: "参赛", TargetDate: "2026-09", Description: "拓展赛事经验，覆盖编程、创新、商业等方向"},
		{ID: 2, Title: "获得首个竞赛奖项", Category: "获奖", TargetDate: "2026-10", Description: "通过充分准备和AI工具辅助，争取获得奖项"},
		{ID: 3, Title: "积累500积分", Category: "积分", TargetDate: "2026-12", Description: "通过参赛、获奖、完成任务积累成就积分"},
		{ID: 4, Title: "掌握商业计划书撰写", Category: "技能", TargetDate: "2026-08", Description: "使用AI工具箱生成并优化商业计划书"},
		{ID: 5, Title: "完成模拟答辩训练", Category: "技能", TargetDate: "2026-09", Description: "使用答辩教练至少完成3轮完整模拟"},
	}

	// Adjust progress based on actual data
	for i := range goals {
		switch goals[i].Category {
		case "参赛":
			goals[i].Progress = math.Min(100, float64(regCount)/3*100)
		case "获奖":
			if awardCount > 0 {
				goals[i].Progress = 100
			}
		case "积分":
			goals[i].Progress = math.Min(100, float64(points)/500*100)
		}
	}

	return goals
}

func buildLearningResources(level string, compTypes map[string]int) []LearningResource {
	resources := []LearningResource{
		{ID: 1, Title: "AI工具箱使用指南", Type: "tool", Category: "基础", Duration: "30分钟"},
		{ID: 2, Title: "商业计划书模板与范例", Type: "article", Category: "写作", Duration: "1小时"},
		{ID: 3, Title: "答辩技巧与常见问题", Type: "video", Category: "答辩", Duration: "45分钟"},
		{ID: 4, Title: "团队协作最佳实践", Type: "article", Category: "团队", Duration: "30分钟"},
		{ID: 5, Title: "赛事规则解读方法", Type: "course", Category: "策略", Duration: "2小时"},
		{ID: 6, Title: "知识库检索技巧", Type: "tool", Category: "工具", Duration: "20分钟"},
	}

	// Add type-specific resources
	if _, ok := compTypes["programming"]; ok {
		resources = append(resources, LearningResource{
			ID: 7, Title: "算法竞赛训练计划", Type: "course", Category: "编程", Duration: "4周",
		})
	}
	if _, ok := compTypes["business"]; ok {
		resources = append(resources, LearningResource{
			ID: 8, Title: "商业模式画布实战", Type: "course", Category: "商业", Duration: "3周",
		})
	}
	if _, ok := compTypes["innovation"]; ok {
		resources = append(resources, LearningResource{
			ID: 9, Title: "创新思维方法论", Type: "video", Category: "创新", Duration: "1小时",
		})
	}

	sort.Slice(resources, func(i, j int) bool {
		return resources[i].ID < resources[j].ID
	})
	return resources
}
