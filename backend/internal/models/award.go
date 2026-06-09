package models

import (
	"time"

	"gorm.io/gorm"
)

// Award status constants.
const (
	AwardStatusPending         = "pending"
	AwardStatusTeacherConfirm  = "teacher_confirm"
	AwardStatusSettled         = "settled"
)

// Award represents a prize or award given to a team in a competition.
type Award struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	CompetitionID uint           `json:"competition_id" gorm:"not null;index"`
	TeamID        uint           `json:"team_id" gorm:"not null;index"`
	Rank          int            `json:"rank" gorm:"not null;default:0"`
	RankName      string         `json:"rank_name" gorm:"size:64"`
	PrizeName     string         `json:"prize_name" gorm:"size:256"`
	PrizeAmount   float64        `json:"prize_amount" gorm:"not null;default:0"`
	Status        string         `json:"status" gorm:"size:16;not null;default:pending"`
	NominatedAt   time.Time      `json:"nominated_at"`
	SettledAt     *time.Time     `json:"settled_at"`
	SettledBy     *uint          `json:"settled_by"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Competition Competition `json:"competition" gorm:"foreignKey:CompetitionID"`
	Team        Team        `json:"team" gorm:"foreignKey:TeamID"`
}
