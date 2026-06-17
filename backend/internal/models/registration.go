package models

import (
	"time"

	"gorm.io/gorm"
)

// Registration status constants.
const (
	RegStatusPending  = "pending"
	RegStatusApproved = "approved"
	RegStatusRejected = "rejected"
	RegStatusCancelled = "cancelled"
)

// CompetitionRegistration represents a student's registration for a competition.
type CompetitionRegistration struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	CompetitionID uint           `json:"competition_id" gorm:"not null;index"`
	UserID        uint           `json:"user_id" gorm:"not null;index"`
	Status        string         `json:"status" gorm:"size:16;not null;default:pending"`
	Remark        string         `json:"remark" gorm:"size:512"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Competition Competition `json:"competition,omitempty" gorm:"foreignKey:CompetitionID"`
	User        User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
}
