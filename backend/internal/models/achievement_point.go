package models

import (
	"time"

	"gorm.io/gorm"
)

// AchievementPoint tracks student achievement points earned through platform activities.
type AchievementPoint struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"index"`
	Points    int            `json:"points"`
	Reason    string         `json:"reason"`              // e.g. "competition_register", "team_create", "preplan_submit", "award_win", "ai_review"
	SourceID  uint           `json:"source_id,omitempty"` // ID of the related entity (competition, team, etc.)
	Source    string         `json:"source,omitempty"`    // e.g. "competition", "team", "preplan", "award"
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (AchievementPoint) TableName() string {
	return "achievement_points"
}

// PointsLedgerEntry is a read-only view for leaderboard queries.
type PointsLedgerEntry struct {
	UserID      uint   `json:"user_id"`
	Username    string `json:"username"`
	RealName    string `json:"real_name"`
	Dept        string `json:"dept"`
	TotalPoints int    `json:"total_points"`
	Rank        int    `json:"rank"`
}

// Point constants for different activities.
const (
	PointRegister    = 10 // Registering for a competition
	PointTeamCreate  = 15 // Creating a team
	PointTeamJoin    = 5  // Joining a team
	PointPrePlan     = 20 // Submitting a preplan
	PointAIReview    = 10 // Using AI review
	PointAwardWin    = 50 // Winning an award (settled)
	PointMilestone   = 5  // Completing a milestone
	PointEval        = 5  // Submitting an evaluation
	PointShowcase    = 5  // Featured in showcase
)

// PointReasons maps reason codes to display labels.
var PointReasons = map[string]string{
	"competition_register": "报名参赛",
	"team_create":          "创建团队",
	"team_join":            "加入团队",
	"preplan_submit":       "提交预案",
	"ai_review":            "AI评审",
	"award_win":            "获奖",
	"milestone_complete":   "完成里程碑",
	"evaluation_submit":    "提交评价",
	"showcase_feature":     "成果展示",
}
