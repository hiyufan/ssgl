package models

import (
	"time"

	"gorm.io/gorm"
)

// Role constants for user access control.
const (
	RoleStudent = "student"
	RoleTeacher = "teacher"
	RoleAdmin   = "admin"
)

// Status constants for user accounts.
const (
	StatusActive   = "active"
	StatusDisabled = "disabled"
)

// User represents a platform user (student, teacher, or admin).
type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Username  string         `json:"username" gorm:"uniqueIndex;size:64;not null"`
	Email     string         `json:"email" gorm:"uniqueIndex;size:128;not null"`
	Password  string         `json:"-" gorm:"size:128;not null"`
	Role      string         `json:"role" gorm:"size:16;not null;default:student"`
	Name      string         `json:"name" gorm:"size:64"`
	Avatar    string         `json:"avatar" gorm:"size:256"`
	Phone     string         `json:"phone" gorm:"size:20"`
	Dept      string         `json:"dept" gorm:"size:128"`
	StudentNo string         `json:"student_id" gorm:"column:student_no;size:32"`
	Status    string         `json:"status" gorm:"size:16;not null;default:active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}
