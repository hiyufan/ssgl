package models

import (
	"time"

	"gorm.io/gorm"
)

// StudentEvaluation status constants.
const (
	EvalStatusDraft     = "draft"
	EvalStatusSubmitted = "submitted"
	EvalStatusApproved  = "approved"
	EvalStatusRejected  = "rejected"
)

// StudentEvaluation represents a student's evaluation of a teacher for a competition.
type StudentEvaluation struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	StudentID     uint           `json:"student_id" gorm:"not null;index"`
	TeacherID     uint           `json:"teacher_id" gorm:"not null;index"`
	CompetitionID uint           `json:"competition_id" gorm:"not null;index"`
	Teaching      int            `json:"teaching" gorm:"not null"`
	Communication int            `json:"communication" gorm:"not null"`
	Availability  int            `json:"availability" gorm:"not null"`
	Overall       int            `json:"overall" gorm:"not null"`
	Feedback      string         `json:"feedback" gorm:"type:text"`
	SubmittedAt   *time.Time     `json:"submitted_at"`
	Status        string         `json:"status" gorm:"size:16;not null;default:draft"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations — use references:ID to tell GORM the FK column points to users.id
	Student     User        `json:"student" gorm:"foreignKey:StudentID;references:ID"`
	Teacher     User        `json:"teacher" gorm:"foreignKey:TeacherID;references:ID"`
	Competition Competition `json:"competition" gorm:"foreignKey:CompetitionID;references:ID"`
}
