package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ReportHandler handles competition achievement report requests.
type ReportHandler struct{}

// NewReportHandler creates a new ReportHandler.
func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

// CompetitionReport represents a comprehensive competition report.
type CompetitionReport struct {
	// Basic info
	CompetitionID uint      `json:"competition_id"`
	Title         string    `json:"title"`
	Type          string    `json:"type"`
	Status        string    `json:"status"`
	Level         string    `json:"level"`
	Organizer     string    `json:"organizer"`
	StartDate     time.Time `json:"start_date"`
	EndDate       time.Time `json:"end_date"`
	Location      string    `json:"location"`

	// Registration stats
	RegistrationStats RegistrationStats `json:"registration_stats"`

	// Team stats
	TeamStats TeamStats `json:"team_stats"`

	// Preplan stats
	PrePlanStats PrePlanStats `json:"preplan_stats"`

	// Award stats
	AwardStats AwardStats `json:"award_stats"`

	// Milestone stats
	MilestoneStats MilestoneStats `json:"milestone_stats"`

	// Engagement metrics
	Engagement EngagementMetrics `json:"engagement"`

	// Timeline events
	Timeline []TimelineEvent `json:"timeline"`

	// Generated at
	GeneratedAt time.Time `json:"generated_at"`
}

type RegistrationStats struct {
	Total      int64   `json:"total"`
	Approved   int64   `json:"approved"`
	Pending    int64   `json:"pending"`
	Rejected   int64   `json:"rejected"`
	Cancelled  int64   `json:"cancelled"`
	ApprovalRate float64 `json:"approval_rate"`
}

type TeamStats struct {
	TotalTeams    int64   `json:"total_teams"`
	TotalMembers  int64   `json:"total_members"`
	AvgTeamSize   float64 `json:"avg_team_size"`
	TeamsWithPlan int64   `json:"teams_with_plan"`
	PlanCoverage  float64 `json:"plan_coverage"`
}

type PrePlanStats struct {
	Total       int64   `json:"total"`
	Draft       int64   `json:"draft"`
	Submitted   int64   `json:"submitted"`
	Reviewed    int64   `json:"reviewed"`
	Approved    int64   `json:"approved"`
	Rejected    int64   `json:"rejected"`
	AvgAIScore  float64 `json:"avg_ai_score"`
	ApprovalRate float64 `json:"approval_rate"`
}

type AwardStats struct {
	TotalAwards  int64   `json:"total_awards"`
	Settled      int64   `json:"settled"`
	Pending      int64   `json:"pending"`
	TotalPrize   float64 `json:"total_prize"`
	AvgPrize     float64 `json:"avg_prize"`
	SettlementRate float64 `json:"settlement_rate"`
}

type MilestoneStats struct {
	Total       int64   `json:"total"`
	Completed   int64   `json:"completed"`
	InProgress  int64   `json:"in_progress"`
	Pending     int64   `json:"pending"`
	Progress    float64 `json:"progress"`
}

type EngagementMetrics struct {
	ParticipationRate float64 `json:"participation_rate"`
	TeamFormationRate float64 `json:"team_formation_rate"`
	PreplanSubmitRate float64 `json:"preplan_submit_rate"`
	AwardRate         float64 `json:"award_rate"`
}

type TimelineEvent struct {
	Date        time.Time `json:"date"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
}

// GenerateReport handles GET /competitions/:id/report — generates a comprehensive competition report.
func (h *ReportHandler) GenerateReport(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()

	// Fetch competition
	var comp models.Competition
	if err := db.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	// Fetch organizer
	var organizer models.User
	db.First(&organizer, comp.OrganizerID)

	report := CompetitionReport{
		CompetitionID: comp.ID,
		Title:         comp.Title,
		Type:          comp.Type,
		Status:        comp.Status,
		Level:         comp.Level,
		Organizer:     organizer.Username,
		StartDate:     comp.StartDate,
		EndDate:       comp.EndDate,
		Location:      comp.Location,
		GeneratedAt:   time.Now(),
	}

	// Registration stats
	var regs []models.CompetitionRegistration
	db.Where("competition_id = ?", comp.ID).Find(&regs)
	report.RegistrationStats.Total = int64(len(regs))
	for _, r := range regs {
		switch r.Status {
		case models.RegStatusApproved:
			report.RegistrationStats.Approved++
		case models.RegStatusPending:
			report.RegistrationStats.Pending++
		case models.RegStatusRejected:
			report.RegistrationStats.Rejected++
		case models.RegStatusCancelled:
			report.RegistrationStats.Cancelled++
		}
	}
	if report.RegistrationStats.Total > 0 {
		report.RegistrationStats.ApprovalRate = float64(report.RegistrationStats.Approved) / float64(report.RegistrationStats.Total) * 100
	}

	// Team stats
	var teams []models.Team
	db.Where("competition_id = ?", comp.ID).Find(&teams)
	report.TeamStats.TotalTeams = int64(len(teams))
	totalMembers := 0
	teamsWithPlan := 0
	for _, t := range teams {
		var memberCount int64
		db.Model(&models.TeamMember{}).Where("team_id = ?", t.ID).Count(&memberCount)
		totalMembers += int(memberCount)

		var planCount int64
		db.Model(&models.PrePlan{}).Where("team_id = ? AND competition_id = ?", t.ID, comp.ID).Count(&planCount)
		if planCount > 0 {
			teamsWithPlan++
		}
	}
	report.TeamStats.TotalMembers = int64(totalMembers)
	if report.TeamStats.TotalTeams > 0 {
		report.TeamStats.AvgTeamSize = float64(totalMembers) / float64(report.TeamStats.TotalTeams)
		report.TeamStats.TeamsWithPlan = int64(teamsWithPlan)
		report.TeamStats.PlanCoverage = float64(teamsWithPlan) / float64(report.TeamStats.TotalTeams) * 100
	}

	// Preplan stats
	var preplans []models.PrePlan
	db.Where("competition_id = ?", comp.ID).Find(&preplans)
	report.PrePlanStats.Total = int64(len(preplans))
	scoreSum := 0
	scoreCount := 0
	for _, p := range preplans {
		switch p.Status {
		case models.PrePlanStatusDraft:
			report.PrePlanStats.Draft++
		case models.PrePlanStatusSubmitted:
			report.PrePlanStats.Submitted++
		case models.PrePlanStatusReviewed:
			report.PrePlanStats.Reviewed++
		case models.PrePlanStatusApproved:
			report.PrePlanStats.Approved++
		case models.PrePlanStatusRejected:
			report.PrePlanStats.Rejected++
		}
		if p.AIReviewScore != nil {
			scoreSum += *p.AIReviewScore
			scoreCount++
		}
	}
	if scoreCount > 0 {
		report.PrePlanStats.AvgAIScore = float64(scoreSum) / float64(scoreCount)
	}
	reviewedTotal := report.PrePlanStats.Approved + report.PrePlanStats.Rejected
	if reviewedTotal > 0 {
		report.PrePlanStats.ApprovalRate = float64(report.PrePlanStats.Approved) / float64(reviewedTotal) * 100
	}

	// Award stats
	var awards []models.Award
	db.Where("competition_id = ?", comp.ID).Find(&awards)
	report.AwardStats.TotalAwards = int64(len(awards))
	for _, a := range awards {
		report.AwardStats.TotalPrize += a.PrizeAmount
		if a.Status == models.AwardStatusSettled {
			report.AwardStats.Settled++
		} else {
			report.AwardStats.Pending++
		}
	}
	if report.AwardStats.TotalAwards > 0 {
		report.AwardStats.AvgPrize = report.AwardStats.TotalPrize / float64(report.AwardStats.TotalAwards)
		report.AwardStats.SettlementRate = float64(report.AwardStats.Settled) / float64(report.AwardStats.TotalAwards) * 100
	}

	// Milestone stats
	var milestones []models.Milestone
	db.Where("competition_id = ?", comp.ID).Order("sort_order ASC").Find(&milestones)
	report.MilestoneStats.Total = int64(len(milestones))
	for _, m := range milestones {
		switch m.Status {
		case models.MilestoneStatusCompleted:
			report.MilestoneStats.Completed++
		case models.MilestoneStatusInProgress:
			report.MilestoneStats.InProgress++
		case models.MilestoneStatusPending:
			report.MilestoneStats.Pending++
		}
	}
	if report.MilestoneStats.Total > 0 {
		report.MilestoneStats.Progress = float64(report.MilestoneStats.Completed) / float64(report.MilestoneStats.Total) * 100
	}

	// Engagement metrics
	var totalStudents int64
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
	if totalStudents > 0 {
		uniqueRegistrants := int64(len(regs))
		report.Engagement.ParticipationRate = float64(uniqueRegistrants) / float64(totalStudents) * 100
	}
	if report.RegistrationStats.Total > 0 {
		report.Engagement.TeamFormationRate = float64(report.TeamStats.TotalTeams) / float64(report.RegistrationStats.Total) * 100
		report.Engagement.PreplanSubmitRate = float64(report.PrePlanStats.Total) / float64(report.RegistrationStats.Total) * 100
	}
	if report.TeamStats.TotalTeams > 0 {
		report.Engagement.AwardRate = float64(report.AwardStats.TotalAwards) / float64(report.TeamStats.TotalTeams) * 100
	}

	// Timeline — merge milestones + competition dates
	report.Timeline = []TimelineEvent{}
	if !comp.StartDate.IsZero() {
		report.Timeline = append(report.Timeline, TimelineEvent{
			Date:  comp.StartDate,
			Type:  "competition",
			Title: "赛事开始",
		})
	}
	if !comp.EndDate.IsZero() {
		report.Timeline = append(report.Timeline, TimelineEvent{
			Date:  comp.EndDate,
			Type:  "competition",
			Title: "赛事结束",
		})
	}
	for _, m := range milestones {
		report.Timeline = append(report.Timeline, TimelineEvent{
			Date:        m.DueDate,
			Type:        m.Type,
			Title:       m.Title,
			Description: m.Description,
		})
	}
	for _, a := range awards {
		report.Timeline = append(report.Timeline, TimelineEvent{
			Date:  a.NominatedAt,
			Type:  "award",
			Title: "奖项提名: " + a.PrizeName,
		})
	}

	c.JSON(http.StatusOK, report)
}
