package models

import "time"

// AIAnalysisLog represents a log entry for an AI analysis request.
type AIAnalysisLog struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Type       string    `json:"type" gorm:"size:32;not null;index"`
	InputData  string    `json:"input_data" gorm:"type:text"`
	OutputData string    `json:"output_data" gorm:"type:text"`
	ModelUsed  string    `json:"model_used" gorm:"size:128"`
	TokensUsed int       `json:"tokens_used" gorm:"not null;default:0"`
	Score      *int      `json:"score"`
	CreatedAt  time.Time `json:"created_at"`
}
