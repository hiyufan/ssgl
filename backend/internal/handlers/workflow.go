package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
	"gorm.io/gorm"
)

// WorkflowHandler handles approval workflow HTTP requests.
type WorkflowHandler struct {
	workflowService *services.WorkflowService
}

// NewWorkflowHandler creates a new WorkflowHandler.
func NewWorkflowHandler(workflowService *services.WorkflowService) *WorkflowHandler {
	return &WorkflowHandler{workflowService: workflowService}
}

// ApproveRequest is the payload for approving a workflow step.
type ApproveRequest struct {
	Comment string `json:"comment"`
}

// RejectRequest is the payload for rejecting a workflow step.
type RejectRequest struct {
	Comment string `json:"comment" binding:"required"`
}

// List handles GET /workflows — lists workflows filtered by tab and role.
func (h *WorkflowHandler) List(c *gin.Context) {
	db := database.GetDB()

	// Parse pagination params.
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	userIDVal, _ := c.Get("user_id")
	uid := userIDVal.(uint)
	tab := c.DefaultQuery("tab", "pending")

	var workflows []models.ApprovalWorkflow
	var total int64

	if tab == "pending" {
		// Pending: workflows where the current user is the approver of the current pending step.
		query := db.Model(&models.ApprovalWorkflow{}).
			Where("approval_workflows.status = ?", models.WorkflowStatusPending).
			Joins("INNER JOIN approval_steps ON approval_steps.workflow_id = approval_workflows.id AND approval_steps.step_order = approval_workflows.current_step").
			Where("approval_steps.approver_id = ?", uid).
			Where("approval_steps.action = ?", models.StepActionPending)

		query.Count(&total)

		if err := query.
			Preload("Submitter").
			Preload("Steps", func(db *gorm.DB) *gorm.DB {
				return db.Order("step_order ASC")
			}).
			Preload("Steps.Approver").
			Offset((page - 1) * pageSize).
			Limit(pageSize).
			Order("approval_workflows.created_at DESC").
			Find(&workflows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch workflows"})
			return
		}
	} else {
		// Done: workflows the user has acted on (approved or rejected steps).
		query := db.Model(&models.ApprovalWorkflow{}).
			Where("approval_workflows.status IN ?", []string{models.WorkflowStatusApproved, models.WorkflowStatusRejected}).
			Joins("INNER JOIN approval_steps ON approval_steps.workflow_id = approval_workflows.id").
			Where("approval_steps.approver_id = ?", uid).
			Where("approval_steps.action IN ?", []string{models.StepActionApproved, models.StepActionRejected}).
			Group("approval_workflows.id")

		// Count with a subquery.
		db.Model(&models.ApprovalWorkflow{}).
			Where("approval_workflows.status IN ?", []string{models.WorkflowStatusApproved, models.WorkflowStatusRejected}).
			Joins("INNER JOIN approval_steps ON approval_steps.workflow_id = approval_workflows.id").
			Where("approval_steps.approver_id = ?", uid).
			Where("approval_steps.action IN ?", []string{models.StepActionApproved, models.StepActionRejected}).
			Distinct("approval_workflows.id").
			Count(&total)

		if err := query.
			Preload("Submitter").
			Preload("Steps", func(db *gorm.DB) *gorm.DB {
				return db.Order("step_order ASC")
			}).
			Preload("Steps.Approver").
			Offset((page - 1) * pageSize).
			Limit(pageSize).
			Order("approval_workflows.created_at DESC").
			Find(&workflows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch workflows"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"workflows": workflows,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Get handles GET /workflows/:id with all preloads.
func (h *WorkflowHandler) Get(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workflow id"})
		return
	}

	var workflow models.ApprovalWorkflow
	if err := db.Preload("Submitter").
		Preload("Steps", func(db *gorm.DB) *gorm.DB {
			return db.Order("step_order ASC")
		}).
		Preload("Steps.Approver").
		First(&workflow, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "workflow not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch workflow"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"workflow": workflow})
}

// Approve handles POST /workflows/:id/approve.
func (h *WorkflowHandler) Approve(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workflow id"})
		return
	}

	var req ApproveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDVal, _ := c.Get("user_id")
	uid := userIDVal.(uint)

	workflow, err := h.workflowService.Approve(uint(id), uid, req.Comment)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"workflow": workflow})
}

// Reject handles POST /workflows/:id/reject.
func (h *WorkflowHandler) Reject(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workflow id"})
		return
	}

	var req RejectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDVal, _ := c.Get("user_id")
	uid := userIDVal.(uint)

	workflow, err := h.workflowService.Reject(uint(id), uid, req.Comment)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"workflow": workflow})
}
