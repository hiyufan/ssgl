package models

import (
	"time"

	"gorm.io/gorm"
)

// Competition status constants.
const (
	CompStatusDraft     = "draft"
	CompStatusPublished = "published"
	CompStatusOngoing   = "ongoing"
	CompStatusCompleted = "completed"
	CompStatusCancelled = "cancelled"
)

// Competition type constants.
const (
	CompTypeHackathon    = "hackathon"
	CompTypeInnovation   = "innovation"
	CompTypeResearch     = "research"
	CompTypeBusinessPlan = "business_plan"
	CompTypeAIInnovation = "ai_innovation"
	CompTypeDataScience  = "data_science"
)

// Competition represents an academic competition or event.
type Competition struct {
	ID                  uint           `json:"id" gorm:"primaryKey"`
	Title               string         `json:"title" gorm:"size:256;not null"`
	Description         string         `json:"description" gorm:"type:text"`
	Type                string         `json:"type" gorm:"size:32;not null;default:hackathon"`
	Status              string         `json:"status" gorm:"size:16;not null;default:draft"`
	MaxTeamSize         int            `json:"max_team_size" gorm:"not null;default:5"`
	MinTeamSize         int            `json:"min_team_size" gorm:"not null;default:1"`
	RegistrationDeadline time.Time     `json:"registration_deadline"`
	StartDate           time.Time      `json:"start_date"`
	EndDate             time.Time      `json:"end_date"`
	Location            string         `json:"location" gorm:"size:256"`
	OrganizerID         uint           `json:"organizer_id" gorm:"not null;index"`
	RulesDocURL         string         `json:"rules_doc_url" gorm:"size:512"`
	Prize               string         `json:"prize" gorm:"size:256"`
	Tags                string         `json:"tags" gorm:"size:512"`
	Level               string         `json:"level" gorm:"size:32"`
	Website             string         `json:"website" gorm:"size:512"`
	ContactName         string         `json:"contact_name" gorm:"size:128"`
	ContactEmail        string         `json:"contact_email" gorm:"size:256"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Organizer User `json:"organizer" gorm:"foreignKey:OrganizerID"`
}
