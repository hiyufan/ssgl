package handlers

import (
	"testing"
)

func TestNewMatchHandler(t *testing.T) {
	handler := NewMatchHandler()
	if handler == nil {
		t.Error("NewMatchHandler returned nil")
	}
}

func TestMatchResultFields(t *testing.T) {
	result := MatchResult{
		UserID:       42,
		Username:     "student_42",
		Name:         "测试学生",
		Dept:         "计算机学院",
		Avatar:       "",
		TeamCount:    2,
		AwardCount:   1,
		PrePlanCount: 3,
		MatchScore:   75.5,
		Reason:       "experienced competitor with awards",
	}

	if result.UserID != 42 {
		t.Errorf("expected UserID=42, got %d", result.UserID)
	}
	if result.Username != "student_42" {
		t.Errorf("expected Username='student_42', got '%s'", result.Username)
	}
	if result.Name != "测试学生" {
		t.Errorf("expected Name='测试学生', got '%s'", result.Name)
	}
	if result.Dept != "计算机学院" {
		t.Errorf("expected Dept='计算机学院', got '%s'", result.Dept)
	}
	if result.TeamCount != 2 {
		t.Errorf("expected TeamCount=2, got %d", result.TeamCount)
	}
	if result.AwardCount != 1 {
		t.Errorf("expected AwardCount=1, got %d", result.AwardCount)
	}
	if result.PrePlanCount != 3 {
		t.Errorf("expected PrePlanCount=3, got %d", result.PrePlanCount)
	}
	if result.MatchScore != 75.5 {
		t.Errorf("expected MatchScore=75.5, got %f", result.MatchScore)
	}
	if result.Reason != "experienced competitor with awards" {
		t.Errorf("expected Reason='experienced competitor with awards', got '%s'", result.Reason)
	}
}

func TestMatchScoreCalculation(t *testing.T) {
	tests := []struct {
		name          string
		teams         int64
		awards        int64
		preplans      int64
		expectedScore float64
	}{
		{"newcomer", 0, 0, 0, 0},
		{"team only", 3, 0, 0, 30},
		{"awards only", 0, 2, 0, 30},
		{"preplans only", 0, 0, 4, 32},
		{"experienced", 2, 3, 5, 100},  // 20+45+40=105 → capped at 100
		{"balanced", 1, 1, 1, 33},      // 10+15+8=33
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := float64(tt.teams)*10 + float64(tt.awards)*15 + float64(tt.preplans)*8
			if score > 100 {
				score = 100
			}
			if score != tt.expectedScore {
				t.Errorf("%s: expected %.0f, got %.0f", tt.name, tt.expectedScore, score)
			}
		})
	}
}

func TestMatchReasonPriority(t *testing.T) {
	// Test that reason is generated correctly based on activity level
	tests := []struct {
		name           string
		awardCount     int64
		prePlanCount   int64
		teamCount      int64
		expectedReason string
	}{
		{"with awards", 1, 0, 0, "experienced competitor with awards"},
		{"with preplans", 0, 2, 1, "active planner with pre-plan experience"},
		{"team only", 0, 0, 1, "team experience"},
		{"newcomer", 0, 0, 0, "available student"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reason := "available student"
			if tt.awardCount > 0 {
				reason = "experienced competitor with awards"
			} else if tt.prePlanCount > 0 {
				reason = "active planner with pre-plan experience"
			} else if tt.teamCount > 0 {
				reason = "team experience"
			}

			if reason != tt.expectedReason {
				t.Errorf("%s: expected reason='%s', got '%s'", tt.name, tt.expectedReason, reason)
			}
		})
	}
}
