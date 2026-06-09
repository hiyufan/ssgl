package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// StatsHandler handles statistics HTTP requests.
type StatsHandler struct{}

// NewStatsHandler creates a new StatsHandler.
func NewStatsHandler() *StatsHandler {
	return &StatsHandler{}
}

// Overview handles GET /stats/overview — returns high-level platform stats.
func (h *StatsHandler) Overview(c *gin.Context) {
	db := database.GetDB()

	var totalUsers int64
	db.Model(&models.User{}).Count(&totalUsers)

	var totalStudents int64
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)

	var totalTeachers int64
	db.Model(&models.User{}).Where("role = ?", models.RoleTeacher).Count(&totalTeachers)

	var totalCompetitions int64
	db.Model(&models.Competition{}).Count(&totalCompetitions)

	var totalTeams int64
	db.Model(&models.Team{}).Count(&totalTeams)

	var ongoingCompetitions int64
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusOngoing).Count(&ongoingCompetitions)

	c.JSON(http.StatusOK, gin.H{
		"total_users":           totalUsers,
		"total_students":        totalStudents,
		"total_teachers":        totalTeachers,
		"total_competitions":    totalCompetitions,
		"total_teams":           totalTeams,
		"ongoing_competitions":  ongoingCompetitions,
	})
}

// CompetitionStats holds per-competition statistics.
type CompetitionStats struct {
	ID          uint   `json:"id"`
	Title       string `json:"title"`
	Status      string `json:"status"`
	TeamCount   int64  `json:"team_count"`
	AwardCount  int64  `json:"award_count"`
	PrePlanCount int64 `json:"pre_plan_count"`
}

// Competitions handles GET /stats/competitions — returns per-competition stats.
func (h *StatsHandler) Competitions(c *gin.Context) {
	db := database.GetDB()

	var competitions []models.Competition
	if err := db.Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	stats := make([]CompetitionStats, len(competitions))
	for i, comp := range competitions {
		var teamCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)

		var awardCount int64
		db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

		var prePlanCount int64
		db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&prePlanCount)

		stats[i] = CompetitionStats{
			ID:           comp.ID,
			Title:        comp.Title,
			Status:       comp.Status,
			TeamCount:    teamCount,
			AwardCount:   awardCount,
			PrePlanCount: prePlanCount,
		}
	}

	c.JSON(http.StatusOK, gin.H{"competitions": stats})
}

// TeacherStats holds per-teacher evaluation statistics.
type TeacherStats struct {
	ID               uint    `json:"id"`
	Name             string  `json:"name"`
	EvaluationCount  int64   `json:"evaluation_count"`
	AvgTeaching      float64 `json:"avg_teaching"`
	AvgCommunication float64 `json:"avg_communication"`
	AvgAvailability  float64 `json:"avg_availability"`
	AvgOverall       float64 `json:"avg_overall"`
}

// Teachers handles GET /stats/teachers — returns per-teacher evaluation aggregates.
func (h *StatsHandler) Teachers(c *gin.Context) {
	db := database.GetDB()

	var teachers []models.User
	if err := db.Where("role = ?", models.RoleTeacher).Find(&teachers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teachers"})
		return
	}

	stats := make([]TeacherStats, len(teachers))
	for i, teacher := range teachers {
		var count int64
		db.Model(&models.StudentEvaluation{}).Where("teacher_id = ?", teacher.ID).Count(&count)

		var avgTeaching, avgCommunication, avgAvailability, avgOverall float64
		if count > 0 {
			db.Model(&models.StudentEvaluation{}).
				Where("teacher_id = ?", teacher.ID).
				Select("COALESCE(AVG(teaching), 0)").
				Row().Scan(&avgTeaching)
			db.Model(&models.StudentEvaluation{}).
				Where("teacher_id = ?", teacher.ID).
				Select("COALESCE(AVG(communication), 0)").
				Row().Scan(&avgCommunication)
			db.Model(&models.StudentEvaluation{}).
				Where("teacher_id = ?", teacher.ID).
				Select("COALESCE(AVG(availability), 0)").
				Row().Scan(&avgAvailability)
			db.Model(&models.StudentEvaluation{}).
				Where("teacher_id = ?", teacher.ID).
				Select("COALESCE(AVG(overall), 0)").
				Row().Scan(&avgOverall)
		}

		stats[i] = TeacherStats{
			ID:               teacher.ID,
			Name:             teacher.Name,
			EvaluationCount:  count,
			AvgTeaching:      avgTeaching,
			AvgCommunication: avgCommunication,
			AvgAvailability:  avgAvailability,
			AvgOverall:       avgOverall,
		}
	}

	c.JSON(http.StatusOK, gin.H{"teachers": stats})
}
