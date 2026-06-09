package models

import "time"

// Notification represents a user notification.
type Notification struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"user_id" gorm:"not null;index"`
	Type      string     `json:"type" gorm:"size:32;not null"`
	Title     string     `json:"title" gorm:"size:256;not null"`
	Message   string     `json:"message" gorm:"type:text"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `json:"created_at"`

	// Relations
	User User `json:"user" gorm:"foreignKey:UserID"`
}
