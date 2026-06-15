package models

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"gorm.io/gorm"
)

// TeamInviteStatus constants.
const (
	TeamInviteStatusPending  = "pending"
	TeamInviteStatusAccepted = "accepted"
	TeamInviteStatusDeclined = "declined"
	TeamInviteStatusExpired  = "expired"
)

// TeamInvite represents an invitation to join a team.
type TeamInvite struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	TeamID    uint           `json:"team_id" gorm:"not null;index"`
	InviterID uint           `json:"inviter_id" gorm:"not null"`
	InviteeID uint           `json:"invitee_id" gorm:"not null;index"`
	Code      string         `json:"code" gorm:"size:64;uniqueIndex;not null"`
	Status    string         `json:"status" gorm:"size:16;not null;default:pending"`
	Message   string         `json:"message" gorm:"size:256"`
	ExpiresAt time.Time      `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Team    Team `json:"team,omitempty" gorm:"foreignKey:TeamID;references:ID"`
	Inviter User `json:"inviter,omitempty" gorm:"foreignKey:InviterID;references:ID"`
	Invitee User `json:"invitee,omitempty" gorm:"foreignKey:InviteeID;references:ID"`
}

// GenerateInviteCode creates a random 16-character hex invite code.
func GenerateInviteCode() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
