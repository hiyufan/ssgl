package models

import "time"

// CompetitionNote represents a user's personal note/annotation on a competition.
type CompetitionNote struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	UserID        uint      `json:"user_id" gorm:"not null;index"`
	CompetitionID uint      `json:"competition_id" gorm:"not null;index"`
	Title         string    `json:"title" gorm:"size:200"`
	Content       string    `json:"content" gorm:"type:text"`
	Color         string    `json:"color" gorm:"size:20;default:'teal'"` // teal, amber, purple, green, red
	Pinned        bool      `json:"pinned" gorm:"default:false"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relations
	User        User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Competition Competition `json:"competition,omitempty" gorm:"foreignKey:CompetitionID"`
}
