package models

import (
	"time"

	"gorm.io/gorm"
)

// Milestone status constants.
const (
	MilestoneStatusPending    = "pending"
	MilestoneStatusInProgress = "in_progress"
	MilestoneStatusCompleted  = "completed"
	MilestoneStatusSkipped    = "skipped"
)

// Milestone type constants.
const (
	MilestoneTypeRegistration = "registration"
	MilestoneTypeSubmission   = "submission"
	MilestoneTypeReview       = "review"
	MilestoneTypeDefense      = "defense"
	MilestoneTypeAward        = "award"
	MilestoneTypeCustom       = "custom"
)

// Milestone represents a key event/deadline in a competition timeline.
type Milestone struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	CompetitionID uint           `json:"competition_id" gorm:"not null;index"`
	Title         string         `json:"title" gorm:"size:256;not null"`
	Description   string         `json:"description" gorm:"type:text"`
	Type          string         `json:"type" gorm:"size:32;not null;default:custom"`
	Status        string         `json:"status" gorm:"size:16;not null;default:pending"`
	StartDate     time.Time      `json:"start_date"`
	DueDate       time.Time      `json:"due_date" gorm:"not null"`
	CompletedAt   *time.Time     `json:"completed_at"`
	SortOrder     int            `json:"sort_order" gorm:"not null;default:0"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Competition Competition `json:"competition,omitempty" gorm:"foreignKey:CompetitionID"`
}
