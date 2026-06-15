package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

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

	var totalAwards int64
	db.Model(&models.Award{}).Count(&totalAwards)

	var totalPrePlans int64
	db.Model(&models.PrePlan{}).Count(&totalPrePlans)

	var totalEvaluations int64
	db.Model(&models.StudentEvaluation{}).Count(&totalEvaluations)

	var publishedCompetitions int64
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusPublished).Count(&publishedCompetitions)

	var settledAwards int64
	db.Model(&models.Award{}).Where("status = ?", models.AwardStatusSettled).Count(&settledAwards)

	c.JSON(http.StatusOK, gin.H{
		"total_users":              totalUsers,
		"total_students":           totalStudents,
		"total_teachers":           totalTeachers,
		"total_competitions":       totalCompetitions,
		"total_teams":              totalTeams,
		"ongoing_competitions":     ongoingCompetitions,
		"total_awards":             totalAwards,
		"total_pre_plans":          totalPrePlans,
		"total_evaluations":        totalEvaluations,
		"published_competitions":   publishedCompetitions,
		"settled_awards":           settledAwards,
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

// ExportOverview handles GET /stats/export/overview — returns platform stats as CSV.
func (h *StatsHandler) ExportOverview(c *gin.Context) {
	db := database.GetDB()

	var totalUsers, totalStudents, totalTeachers int64
	db.Model(&models.User{}).Count(&totalUsers)
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
	db.Model(&models.User{}).Where("role = ?", models.RoleTeacher).Count(&totalTeachers)

	var totalCompetitions, ongoingComp, publishedComp int64
	db.Model(&models.Competition{}).Count(&totalCompetitions)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusOngoing).Count(&ongoingComp)
	db.Model(&models.Competition{}).Where("status = ?", models.CompStatusPublished).Count(&publishedComp)

	var totalTeams, totalAwards, totalPrePlans, totalEvals int64
	db.Model(&models.Team{}).Count(&totalTeams)
	db.Model(&models.Award{}).Count(&totalAwards)
	db.Model(&models.PrePlan{}).Count(&totalPrePlans)
	db.Model(&models.StudentEvaluation{}).Count(&totalEvals)

	filename := fmt.Sprintf("ssgl_stats_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"指标", "数值"})
	w.Write([]string{"总用户数", strconv.FormatInt(totalUsers, 10)})
	w.Write([]string{"学生数", strconv.FormatInt(totalStudents, 10)})
	w.Write([]string{"教师数", strconv.FormatInt(totalTeachers, 10)})
	w.Write([]string{"赛事总数", strconv.FormatInt(totalCompetitions, 10)})
	w.Write([]string{"进行中赛事", strconv.FormatInt(ongoingComp, 10)})
	w.Write([]string{"已发布赛事", strconv.FormatInt(publishedComp, 10)})
	w.Write([]string{"团队总数", strconv.FormatInt(totalTeams, 10)})
	w.Write([]string{"奖项总数", strconv.FormatInt(totalAwards, 10)})
	w.Write([]string{"预案总数", strconv.FormatInt(totalPrePlans, 10)})
	w.Write([]string{"评价总数", strconv.FormatInt(totalEvals, 10)})
	w.Flush()
}

// ExportCompetitions handles GET /stats/export/competitions — returns per-competition stats as CSV.
func (h *StatsHandler) ExportCompetitions(c *gin.Context) {
	db := database.GetDB()

	var competitions []models.Competition
	if err := db.Order("id ASC").Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	filename := fmt.Sprintf("ssgl_competitions_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"ID", "赛事名称", "类型", "状态", "团队数", "预案数", "奖项数", "开始日期", "结束日期"})

	for _, comp := range competitions {
		var teamCount, prePlanCount, awardCount int64
		db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamCount)
		db.Model(&models.PrePlan{}).Where("competition_id = ?", comp.ID).Count(&prePlanCount)
		db.Model(&models.Award{}).Where("competition_id = ?", comp.ID).Count(&awardCount)

		startStr := ""
		if !comp.StartDate.IsZero() {
			startStr = comp.StartDate.Format("2006-01-02")
		}
		endStr := ""
		if !comp.EndDate.IsZero() {
			endStr = comp.EndDate.Format("2006-01-02")
		}

		w.Write([]string{
			strconv.FormatUint(uint64(comp.ID), 10),
			comp.Title,
			comp.Type,
			comp.Status,
			strconv.FormatInt(teamCount, 10),
			strconv.FormatInt(prePlanCount, 10),
			strconv.FormatInt(awardCount, 10),
			startStr,
			endStr,
		})
	}
	w.Flush()
}
