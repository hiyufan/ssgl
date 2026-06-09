package services

import (
	"errors"
	"time"

	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"gorm.io/gorm"
)

// WorkflowService provides approval workflow operations.
type WorkflowService struct{}

// NewWorkflowService creates a new WorkflowService.
func NewWorkflowService() *WorkflowService {
	return &WorkflowService{}
}

// CreateWorkflowInput defines the parameters for creating a workflow.
type CreateWorkflowInput struct {
	Type        string
	TargetID    uint
	SubmitterID uint
	ApproverIDs []uint // Ordered list of approver IDs, one per step.
}

// Create creates a new approval workflow with its steps in a transaction.
func (s *WorkflowService) Create(input CreateWorkflowInput) (*models.ApprovalWorkflow, error) {
	db := database.GetDB()

	if len(input.ApproverIDs) == 0 {
		return nil, errors.New("at least one approver is required")
	}

	workflow := &models.ApprovalWorkflow{
		Type:        input.Type,
		TargetID:    input.TargetID,
		CurrentStep: 1,
		TotalSteps:  len(input.ApproverIDs),
		Status:      models.WorkflowStatusPending,
		SubmitterID: input.SubmitterID,
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(workflow).Error; err != nil {
			return err
		}

		for i, approverID := range input.ApproverIDs {
			step := models.ApprovalStep{
				WorkflowID: workflow.ID,
				StepOrder:  i + 1,
				ApproverID: approverID,
				Action:     models.StepActionWaiting,
			}
			// First step is pending, the rest are waiting.
			if i == 0 {
				step.Action = models.StepActionPending
			}
			if err := tx.Create(&step).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Reload with relations.
	db.Preload("Submitter").Preload("Steps.Approver").First(workflow, workflow.ID)

	return workflow, nil
}

// Approve approves the current step of a workflow. If it is the last step,
// the workflow status is set to approved.
func (s *WorkflowService) Approve(workflowID, approverID uint, comment string) (*models.ApprovalWorkflow, error) {
	db := database.GetDB()

	var workflow models.ApprovalWorkflow
	if err := db.First(&workflow, workflowID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("workflow not found")
		}
		return nil, err
	}

	if workflow.Status != models.WorkflowStatusPending {
		return nil, errors.New("workflow is not pending")
	}

	// Find the current pending step for this approver.
	var step models.ApprovalStep
	err := db.Where("workflow_id = ? AND step_order = ? AND action = ?",
		workflowID, workflow.CurrentStep, models.StepActionPending).First(&step).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("no pending step found for current step order")
		}
		return nil, err
	}

	if step.ApproverID != approverID {
		return nil, errors.New("you are not the approver for this step")
	}

	now := time.Now()

	err = db.Transaction(func(tx *gorm.DB) error {
		// Mark current step as approved.
		if err := tx.Model(&step).Updates(map[string]interface{}{
			"action":   models.StepActionApproved,
			"comment":  comment,
			"acted_at": now,
		}).Error; err != nil {
			return err
		}

		if workflow.CurrentStep >= workflow.TotalSteps {
			// Last step — mark workflow as approved.
			if err := tx.Model(&workflow).Update("status", models.WorkflowStatusApproved).Error; err != nil {
				return err
			}
		} else {
			// Advance to next step.
			if err := tx.Model(&workflow).Update("current_step", workflow.CurrentStep+1).Error; err != nil {
				return err
			}

			// Set next step to pending.
			var nextStep models.ApprovalStep
			if err := tx.Where("workflow_id = ? AND step_order = ?", workflowID, workflow.CurrentStep+1).First(&nextStep).Error; err != nil {
				return err
			}
			if err := tx.Model(&nextStep).Update("action", models.StepActionPending).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Reload with relations.
	db.Preload("Submitter").Preload("Steps.Approver").First(&workflow, workflow.ID)

	return &workflow, nil
}

// Reject rejects the current step of a workflow, setting the entire workflow to rejected.
func (s *WorkflowService) Reject(workflowID, approverID uint, comment string) (*models.ApprovalWorkflow, error) {
	db := database.GetDB()

	var workflow models.ApprovalWorkflow
	if err := db.First(&workflow, workflowID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("workflow not found")
		}
		return nil, err
	}

	if workflow.Status != models.WorkflowStatusPending {
		return nil, errors.New("workflow is not pending")
	}

	// Find the current pending step for this approver.
	var step models.ApprovalStep
	err := db.Where("workflow_id = ? AND step_order = ? AND action = ?",
		workflowID, workflow.CurrentStep, models.StepActionPending).First(&step).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("no pending step found for current step order")
		}
		return nil, err
	}

	if step.ApproverID != approverID {
		return nil, errors.New("you are not the approver for this step")
	}

	now := time.Now()

	err = db.Transaction(func(tx *gorm.DB) error {
		// Mark current step as rejected.
		if err := tx.Model(&step).Updates(map[string]interface{}{
			"action":   models.StepActionRejected,
			"comment":  comment,
			"acted_at": now,
		}).Error; err != nil {
			return err
		}

		// Mark workflow as rejected.
		if err := tx.Model(&workflow).Update("status", models.WorkflowStatusRejected).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Reload with relations.
	db.Preload("Submitter").Preload("Steps.Approver").First(&workflow, workflow.ID)

	return &workflow, nil
}

// GetPendingForUser returns pending workflows where the given user is the approver
// of the current step, optionally filtered by workflow type.
func (s *WorkflowService) GetPendingForUser(userID uint, role string) ([]models.ApprovalWorkflow, error) {
	db := database.GetDB()

	query := db.Model(&models.ApprovalWorkflow{}).
		Where("approval_workflows.status = ?", models.WorkflowStatusPending).
		Joins("INNER JOIN approval_steps ON approval_steps.workflow_id = approval_workflows.id AND approval_steps.step_order = approval_workflows.current_step").
		Where("approval_steps.approver_id = ?", userID).
		Where("approval_steps.action = ?", models.StepActionPending)

	var workflows []models.ApprovalWorkflow
	if err := query.
		Preload("Submitter").
		Preload("Steps", func(db *gorm.DB) *gorm.DB {
			return db.Order("step_order ASC")
		}).
		Preload("Steps.Approver").
		Order("approval_workflows.created_at DESC").
		Find(&workflows).Error; err != nil {
		return nil, err
	}

	return workflows, nil
}
