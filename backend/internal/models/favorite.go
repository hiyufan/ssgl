package models

import "time"

// CompetitionFavorite represents a user's bookmarked competition.
type CompetitionFavorite struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	UserID        uint      `json:"user_id" gorm:"not null;index;uniqueIndex:idx_user_comp_fav"`
	CompetitionID uint      `json:"competition_id" gorm:"not null;index;uniqueIndex:idx_user_comp_fav"`
	CreatedAt     time.Time `json:"created_at"`

	// Relations
	User        User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Competition Competition `json:"competition,omitempty" gorm:"foreignKey:CompetitionID"`
}
