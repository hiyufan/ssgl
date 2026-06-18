package models

import "time"

// CompetitionSubscription represents a user subscribing to a competition
// to receive deadline reminders and status updates.
type CompetitionSubscription struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	UserID        uint      `json:"user_id" gorm:"not null;index;uniqueIndex:idx_user_comp_sub"`
	CompetitionID uint      `json:"competition_id" gorm:"not null;index;uniqueIndex:idx_user_comp_sub"`
	RemindDaysBefore int    `json:"remind_days_before" gorm:"not null;default:3"` // days before deadline to remind
	LastRemindedAt *time.Time `json:"last_reminded_at,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relations
	User        User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Competition Competition `json:"competition,omitempty" gorm:"foreignKey:CompetitionID"`
}
