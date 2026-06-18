package handlers

import (
	"net/http"
	"strconv"
	"time"

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

// UpdateEvaluationRequest is the payload for updating an evaluation.
type UpdateEvaluationRequest struct {
	Teaching      *int   `json:"teaching" binding:"omitempty,min=1,max=5"`
	Communication *int   `json:"communication" binding:"omitempty,min=1,max=5"`
	Availability  *int   `json:"availability" binding:"omitempty,min=1,max=5"`
	Overall       *int   `json:"overall" binding:"omitempty,min=1,max=5"`
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

	now := time.Now()
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
		SubmittedAt:   &now,
	}

	if err := db.Create(&evaluation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create evaluation"})
		return
	}

	db.Preload("Student").Preload("Teacher").Preload("Competition").First(&evaluation, evaluation.ID)

	c.JSON(http.StatusCreated, gin.H{"evaluation": evaluation})
}

// Update handles PUT /evaluations/:id — only the original student can update their own evaluation.
func (h *EvaluationHandler) Update(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid evaluation id"})
		return
	}

	var evaluation models.StudentEvaluation
	if err := db.First(&evaluation, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "evaluation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch evaluation"})
		return
	}

	// Only the original student can update.
	userIDVal, _ := c.Get("user_id")
	if evaluation.StudentID != userIDVal.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only update your own evaluations"})
		return
	}

	// Cannot update if already approved/rejected.
	if evaluation.Status == models.EvalStatusApproved || evaluation.Status == models.EvalStatusRejected {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot update an evaluation that has been reviewed"})
		return
	}

	var req UpdateEvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Teaching != nil {
		updates["teaching"] = *req.Teaching
	}
	if req.Communication != nil {
		updates["communication"] = *req.Communication
	}
	if req.Availability != nil {
		updates["availability"] = *req.Availability
	}
	if req.Overall != nil {
		updates["overall"] = *req.Overall
	}
	if req.Feedback != "" {
		updates["feedback"] = req.Feedback
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	if err := db.Model(&evaluation).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update evaluation"})
		return
	}

	db.Preload("Student").Preload("Teacher").Preload("Competition").First(&evaluation, evaluation.ID)
	c.JSON(http.StatusOK, gin.H{"evaluation": evaluation})
}

// Delete handles DELETE /evaluations/:id — soft delete by student or admin.
func (h *EvaluationHandler) Delete(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid evaluation id"})
		return
	}

	var evaluation models.StudentEvaluation
	if err := db.First(&evaluation, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "evaluation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch evaluation"})
		return
	}

	// Only the student who wrote it or an admin can delete.
	userIDVal, _ := c.Get("user_id")
	roleVal, _ := c.Get("role")
	if evaluation.StudentID != userIDVal.(uint) && roleVal.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own evaluations"})
		return
	}

	if err := db.Delete(&evaluation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete evaluation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "evaluation deleted"})
}

// Moderate handles POST /evaluations/:id/moderate — teacher/admin can approve or reject.
func (h *EvaluationHandler) Moderate(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid evaluation id"})
		return
	}

	var evaluation models.StudentEvaluation
	if err := db.First(&evaluation, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "evaluation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch evaluation"})
		return
	}

	var req struct {
		Action string `json:"action" binding:"required,oneof=approve reject"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newStatus := models.EvalStatusApproved
	if req.Action == "reject" {
		newStatus = models.EvalStatusRejected
	}

	if err := db.Model(&evaluation).Update("status", newStatus).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to moderate evaluation"})
		return
	}

	db.Preload("Student").Preload("Teacher").Preload("Competition").First(&evaluation, evaluation.ID)
	c.JSON(http.StatusOK, gin.H{"evaluation": evaluation, "action": req.Action})
}
