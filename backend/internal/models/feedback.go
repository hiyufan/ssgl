package models

import (
	"time"

	"gorm.io/gorm"
)

// CompetitionFeedback stores student feedback for a competition.
type CompetitionFeedback struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	CompetitionID uint           `json:"competition_id" gorm:"index;not null"`
	StudentID     uint           `json:"student_id" gorm:"index;not null"`
	OverallRating int            `json:"overall_rating" gorm:"not null"` // 1-5
	ContentRating int            `json:"content_rating"`                 // 赛事内容 1-5
	OrgRating     int            `json:"org_rating"`                     // 组织安排 1-5
	FairnessRating int           `json:"fairness_rating"`                // 公平性 1-5
	LearningValue int            `json:"learning_value"`                 // 学习价值 1-5
	Comment       string         `json:"comment" gorm:"type:text"`
	Anonymous     bool           `json:"anonymous" gorm:"default:false"`
	Skills        string         `json:"skills" gorm:"type:text"` // JSON array of skills gained
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations (not stored, loaded via Preload)
	Competition   *Competition `json:"competition,omitempty" gorm:"foreignKey:CompetitionID"`
	Student       *User        `json:"student,omitempty" gorm:"foreignKey:StudentID"`
}

// CompetitionFeedbackSummary is an aggregated view of feedback for a competition.
type CompetitionFeedbackSummary struct {
	CompetitionID    uint    `json:"competition_id"`
	TotalFeedbacks   int     `json:"total_feedbacks"`
	AvgOverall       float64 `json:"avg_overall"`
	AvgContent       float64 `json:"avg_content"`
	AvgOrg           float64 `json:"avg_org"`
	AvgFairness      float64 `json:"avg_fairness"`
	AvgLearningValue float64 `json:"avg_learning_value"`
	TopSkills        []SkillCount `json:"top_skills"`
	RecentComments   []FeedbackComment `json:"recent_comments"`
	RatingDist       map[int]int `json:"rating_distribution"` // rating -> count
}

// SkillCount represents a skill and its frequency.
type SkillCount struct {
	Skill string `json:"skill"`
	Count int    `json:"count"`
}

// FeedbackComment is a simplified comment view.
type FeedbackComment struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
	Date    string `json:"date"`
	Anonymous bool `json:"anonymous"`
}
