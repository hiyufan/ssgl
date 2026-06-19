package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// LifecycleHandler provides competition lifecycle tracking.
type LifecycleHandler struct{}

func NewLifecycleHandler() *LifecycleHandler {
	return &LifecycleHandler{}
}

// Stage represents one phase in a competition's lifecycle.
type Stage struct {
	Name        string  `json:"name"`
	Label       string  `json:"label"`
	Status      string  `json:"status"` // "completed", "active", "pending"
	Count       int     `json:"count"`
	Target      int     `json:"target,omitempty"`
	Progress    float64 `json:"progress"`
	Description string  `json:"description"`
}

// LifecycleResponse is the full lifecycle view of a competition.
type LifecycleResponse struct {
	CompetitionID   uint     `json:"competition_id"`
	Title           string   `json:"title"`
	Type            string   `json:"type"`
	Status          string   `json:"status"`
	OverallProgress float64  `json:"overall_progress"`
	Stages          []Stage  `json:"stages"`
	TeamCount       int      `json:"team_count"`
	StudentCount    int      `json:"student_count"`
	PreplanCount    int      `json:"preplan_count"`
	AwardCount      int      `json:"award_count"`
	RegistrationCount int    `json:"registration_count"`
	MilestoneCount  int      `json:"milestone_count"`
	CompletionRate  float64  `json:"completion_rate"`
	DaysRemaining   int      `json:"days_remaining"`
	RiskLevel       string   `json:"risk_level"`
}

// GetLifecycle returns the full lifecycle of a competition.
//
//	GET /api/v1/competitions/:id/lifecycle
func (h *LifecycleHandler) GetLifecycle(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not available"})
		return
	}

	// Load competition.
	var comp models.Competition
	if err := db.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	// Count related entities.
	var regCount int64
	db.Model(&models.CompetitionRegistration{}).Where("competition_id = ?", id).Count(&regCount)

	var teamCount int64
	db.Model(&models.Team{}).Where("competition_id = ?", id).Count(&teamCount)

	// Count unique students in teams for this competition.
	var studentCount int64
	db.Model(&models.TeamMember{}).
		Joins("JOIN teams ON teams.id = team_members.team_id").
		Where("teams.competition_id = ?", id).
		Distinct("team_members.user_id").
		Count(&studentCount)

	var preplanCount int64
	db.Model(&models.PrePlan{}).Where("competition_id = ?", id).Count(&preplanCount)

	var awardCount int64
	db.Model(&models.Award{}).Where("competition_id = ?", id).Count(&awardCount)

	var milestoneCount int64
	db.Model(&models.Milestone{}).Where("competition_id = ?", id).Count(&milestoneCount)

	// Count approved preplans for completion rate.
	var approvedPreplans int64
	db.Model(&models.PrePlan{}).Where("competition_id = ? AND status = ?", id, "approved").Count(&approvedPreplans)

	// Build stages.
	stages := buildLifecycleStages(
		int(regCount), int(teamCount), int(studentCount),
		int(preplanCount), int(approvedPreplans), int(awardCount), int(milestoneCount),
	)

	// Calculate overall progress (average of non-pending stages).
	activeStages := 0
	totalProgress := 0.0
	for _, s := range stages {
		if s.Status != "pending" {
			activeStages++
			totalProgress += s.Progress
		}
	}
	overallProgress := 0.0
	if activeStages > 0 {
		overallProgress = totalProgress / float64(activeStages)
	}

	// Completion rate: awards per team.
	completionRate := 0.0
	if teamCount > 0 {
		completionRate = float64(awardCount) / float64(teamCount) * 100
	}

	// Days remaining.
	daysRemaining := 0
	riskLevel := "low"
	if comp.EndDate.After(comp.StartDate) {
		now := comp.EndDate // Use end date as reference
		_ = now
		daysRemaining = int(comp.EndDate.Sub(comp.StartDate).Hours() / 24)
		if daysRemaining < 7 {
			riskLevel = "high"
		} else if daysRemaining < 30 {
			riskLevel = "medium"
		}
	}

	resp := LifecycleResponse{
		CompetitionID:     comp.ID,
		Title:             comp.Title,
		Type:              comp.Type,
		Status:            comp.Status,
		OverallProgress:   overallProgress,
		Stages:            stages,
		TeamCount:         int(teamCount),
		StudentCount:      int(studentCount),
		PreplanCount:      int(preplanCount),
		AwardCount:        int(awardCount),
		RegistrationCount: int(regCount),
		MilestoneCount:    int(milestoneCount),
		CompletionRate:    completionRate,
		DaysRemaining:     daysRemaining,
		RiskLevel:         riskLevel,
	}

	c.JSON(http.StatusOK, resp)
}

func buildLifecycleStages(regCount, teamCount, studentCount, preplanCount, approvedPreplans, awardCount, milestoneCount int) []Stage {
	stages := []Stage{
		{
			Name:        "registration",
			Label:       "报名阶段",
			Count:       regCount,
			Description: "学生报名参赛",
		},
		{
			Name:        "team_formation",
			Label:       "组队阶段",
			Count:       teamCount,
			Description: "组建参赛团队",
		},
		{
			Name:        "preplan",
			Label:       "预案提交",
			Count:       preplanCount,
			Target:      teamCount,
			Description: "团队提交参赛预案",
		},
		{
			Name:        "review",
			Label:       "AI 评审",
			Count:       approvedPreplans,
			Target:      preplanCount,
			Description: "AI 评审 + 教师审核",
		},
		{
			Name:        "milestone",
			Label:       "里程碑执行",
			Count:       milestoneCount,
			Description: "项目里程碑跟踪",
		},
		{
			Name:        "award",
			Label:       "奖项评定",
			Count:       awardCount,
			Target:      teamCount,
			Description: "评定获奖团队",
		},
	}

	// Determine status and progress for each stage.
	for i := range stages {
		s := &stages[i]
		if s.Count > 0 {
			s.Status = "active"
			if s.Target > 0 {
				s.Progress = float64(s.Count) / float64(s.Target) * 100
				if s.Progress > 100 {
					s.Progress = 100
				}
				if s.Progress >= 100 {
					s.Status = "completed"
				}
			} else {
				s.Progress = 100 // No target means presence = done
			}
		} else {
			s.Status = "pending"
			s.Progress = 0
		}
	}

	return stages
}
