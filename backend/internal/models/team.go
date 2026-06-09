package models

import (
	"time"

	"gorm.io/gorm"
)

// Team status constants.
const (
	TeamStatusActive    = "active"
	TeamStatusCompleted = "completed"
)

// TeamMemberRole constants.
const (
	TeamMemberRoleLeader  = "leader"
	TeamMemberRoleMember  = "member"
)

// Team represents a competition team.
type Team struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Name          string         `json:"name" gorm:"size:128;not null"`
	CompetitionID uint           `json:"competition_id" gorm:"not null;index"`
	LeaderID      uint           `json:"leader_id" gorm:"not null;index"`
	Status        string         `json:"status" gorm:"size:16;not null;default:active"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Competition Competition  `json:"competition" gorm:"foreignKey:CompetitionID"`
	Leader      User         `json:"leader" gorm:"foreignKey:LeaderID"`
	Members     []TeamMember `json:"members" gorm:"foreignKey:TeamID"`
}

// TeamMember represents a user's membership in a team.
type TeamMember struct {
	ID       uint      `json:"id" gorm:"primaryKey"`
	TeamID   uint      `json:"team_id" gorm:"not null;index"`
	UserID   uint      `json:"user_id" gorm:"not null;index"`
	Role     string    `json:"role" gorm:"size:16;not null;default:member"`
	JoinedAt time.Time `json:"joined_at"`

	// Relations
	Team Team `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	User User `json:"user" gorm:"foreignKey:UserID"`
}
