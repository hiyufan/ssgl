package models

import (
	"time"

	"gorm.io/gorm"
)

// Workflow type constants.
const (
	WorkflowTypeRegistration = "registration"
	WorkflowTypePrePlan      = "pre_plan"
	WorkflowTypeReward       = "reward"
)

// Workflow status constants.
const (
	WorkflowStatusPending  = "pending"
	WorkflowStatusApproved = "approved"
	WorkflowStatusRejected = "rejected"
)

// Step action constants.
const (
	StepActionPending  = "pending"
	StepActionApproved = "approved"
	StepActionRejected = "rejected"
	StepActionWaiting  = "waiting"
)

// ApprovalWorkflow represents a multi-step approval process.
type ApprovalWorkflow struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Type        string         `json:"type" gorm:"size:32;not null;index"`
	TargetID    uint           `json:"target_id" gorm:"not null;index"`
	CurrentStep int            `json:"current_step" gorm:"not null;default:1"`
	TotalSteps  int            `json:"total_steps" gorm:"not null"`
	Status      string         `json:"status" gorm:"size:16;not null;default:pending;index"`
	SubmitterID uint           `json:"submitter_id" gorm:"not null;index"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Submitter User          `json:"submitter" gorm:"foreignKey:SubmitterID"`
	Steps     []ApprovalStep `json:"steps" gorm:"foreignKey:WorkflowID"`
}

// ApprovalStep represents a single step in an approval workflow.
type ApprovalStep struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	WorkflowID uint       `json:"workflow_id" gorm:"not null;index"`
	StepOrder  int        `json:"step_order" gorm:"not null"`
	ApproverID uint       `json:"approver_id" gorm:"not null;index"`
	Action     string     `json:"action" gorm:"size:16;not null;default:pending"`
	Comment    string     `json:"comment" gorm:"type:text"`
	ActedAt    *time.Time `json:"acted_at"`

	// Relations
	Workflow ApprovalWorkflow `json:"workflow,omitempty" gorm:"foreignKey:WorkflowID"`
	Approver User             `json:"approver" gorm:"foreignKey:ApproverID"`
}
