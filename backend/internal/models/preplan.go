package models

import (
	"time"

	"gorm.io/gorm"
)

// PrePlan status constants.
const (
	PrePlanStatusDraft     = "draft"
	PrePlanStatusSubmitted = "submitted"
	PrePlanStatusReviewed  = "reviewed"
	PrePlanStatusApproved  = "approved"
	PrePlanStatusRejected  = "rejected"
)

// PrePlan represents a team's pre-competition plan submission.
type PrePlan struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	CompetitionID    uint           `json:"competition_id" gorm:"not null;index"`
	TeamID           uint           `json:"team_id" gorm:"not null;index"`
	Title            string         `json:"title" gorm:"size:256;not null"`
	TechStack        string         `json:"tech_stack" gorm:"type:text"`
	TargetAudience   string         `json:"target_audience" gorm:"type:text"`
	MarketAnalysis   string         `json:"market_analysis" gorm:"type:text"`
	Innovation       string         `json:"innovation" gorm:"type:text"`
	ExpectedOutcome  string         `json:"expected_outcome" gorm:"type:text"`
	Timeline         string         `json:"timeline" gorm:"type:text"`
	AIReviewScore    *int           `json:"ai_review_score"`
	AIReviewNotes    string         `json:"ai_review_notes" gorm:"type:text"`
	Status           string         `json:"status" gorm:"size:16;not null;default:draft"`
	SubmittedAt      *time.Time     `json:"submitted_at"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Competition Competition `json:"competition" gorm:"foreignKey:CompetitionID"`
	Team        Team        `json:"team" gorm:"foreignKey:TeamID"`
}

// ExecutionPlan represents a team's execution plan linked to a pre-plan.
type ExecutionPlan struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	PrePlanID      uint       `json:"pre_plan_id" gorm:"not null;index"`
	ActualTech     string     `json:"actual_tech" gorm:"type:text"`
	ActualProgress string     `json:"actual_progress" gorm:"type:text"`
	Deviations     string     `json:"deviations" gorm:"type:text"`
	AIMatchScore   *int       `json:"ai_match_score"`
	SubmittedAt    *time.Time `json:"submitted_at"`

	// Relations
	PrePlan PrePlan `json:"pre_plan" gorm:"foreignKey:PrePlanID"`
}
