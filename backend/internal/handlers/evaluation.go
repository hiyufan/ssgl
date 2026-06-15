package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"gorm.io/gorm"
)

// EvaluationHandler handles student evaluation HTTP requests.
type EvaluationHandler struct{}

// NewEvaluationHandler creates a new EvaluationHandler.
func NewEvaluationHandler() *EvaluationHandler {
	return &EvaluationHandler{}
}

// CreateEvaluationRequest is the payload for creating an evaluation.
type CreateEvaluationRequest struct {
	TeacherID     uint   `json:"teacher_id" binding:"required"`
	CompetitionID uint   `json:"competition_id" binding:"required"`
	Teaching      int    `json:"teaching" binding:"required,min=1,max=5"`
	Communication int    `json:"communication" binding:"required,min=1,max=5"`
	Availability  int    `json:"availability" binding:"required,min=1,max=5"`
	Overall       int    `json:"overall" binding:"required,min=1,max=5"`
	Feedback      string `json:"feedback"`
}

// List handles GET /evaluations with optional teacher_id, competition_id, and student_id filters.
func (h *EvaluationHandler) List(c *gin.Context) {
	db := database.GetDB()

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := db.Model(&models.StudentEvaluation{}).
		Preload("Student").
		Preload("Teacher").
		Preload("Competition")

	if teacherID := c.Query("teacher_id"); teacherID != "" {
		query = query.Where("teacher_id = ?", teacherID)
	}
	if compID := c.Query("competition_id"); compID != "" {
		query = query.Where("competition_id = ?", compID)
	}
	if studentID := c.Query("student_id"); studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var evaluations []models.StudentEvaluation
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&evaluations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch evaluations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"evaluations": evaluations,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
	})
}

// Get handles GET /evaluations/:id.
func (h *EvaluationHandler) Get(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid evaluation id"})
		return
	}

	var evaluation models.StudentEvaluation
	if err := db.Preload("Student").Preload("Teacher").Preload("Competition").First(&evaluation, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "evaluation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch evaluation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"evaluation": evaluation})
}

// Create handles POST /evaluations.
func (h *EvaluationHandler) Create(c *gin.Context) {
	db := database.GetDB()

	var req CreateEvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDVal, _ := c.Get("user_id")
	studentID := userIDVal.(uint)

	// Verify the teacher exists and has the teacher role.
	var teacher models.User
	if err := db.First(&teacher, req.TeacherID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "teacher not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teacher"})
		return
	}
	if teacher.Role != models.RoleTeacher {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target user is not a teacher"})
		return
	}

	// Check the student hasn't already evaluated this teacher for this competition.
	var existingCount int64
	db.Model(&models.StudentEvaluation{}).
		Where("student_id = ? AND teacher_id = ? AND competition_id = ?", studentID, req.TeacherID, req.CompetitionID).
		Count(&existingCount)
	if existingCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you have already evaluated this teacher for this competition"})
		return
	}

	evaluation := models.StudentEvaluation{
		StudentID:     studentID,
		TeacherID:     req.TeacherID,
		CompetitionID: req.CompetitionID,
		Teaching:      req.Teaching,
		Communication: req.Communication,
		Availability:  req.Availability,
		Overall:       req.Overall,
		Feedback:      req.Feedback,
		Status:        models.EvalStatusSubmitted,
	}

	if err := db.Create(&evaluation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create evaluation"})
		return
	}

	db.Preload("Student").Preload("Teacher").Preload("Competition").First(&evaluation, evaluation.ID)

	c.JSON(http.StatusCreated, gin.H{"evaluation": evaluation})
}
