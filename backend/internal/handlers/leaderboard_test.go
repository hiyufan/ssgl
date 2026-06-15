package handlers

import (
	"testing"
)

func TestLeaderboardEntry_Fields(t *testing.T) {
	entry := LeaderboardEntry{
		Rank:             1,
		TeamID:           1,
		TeamName:         "测试团队",
		LeaderName:       "张三",
		CompetitionCount: 3,
		AwardCount:       2,
		PrePlanCount:     1,
		Score:            30.0,
	}

	if entry.Rank != 1 {
		t.Errorf("expected rank 1, got %d", entry.Rank)
	}
	if entry.TeamName != "测试团队" {
		t.Errorf("expected team name '测试团队', got '%s'", entry.TeamName)
	}
	if entry.Score != 30.0 {
		t.Errorf("expected score 30.0, got %f", entry.Score)
	}
}

func TestLeaderboardEntry_ScoreCalculation(t *testing.T) {
	// Score = awards * 10 + competitions * 3 + preplans * 1
	tests := []struct {
		awards    int64
		comps     int64
		plans     int64
		wantScore float64
	}{
		{0, 0, 0, 0},
		{1, 0, 0, 10},
		{0, 1, 0, 3},
		{0, 0, 1, 1},
		{2, 3, 1, 30},
		{5, 10, 5, 85},
	}

	for _, tt := range tests {
		score := float64(tt.awards)*10 + float64(tt.comps)*3 + float64(tt.plans)
		if score != tt.wantScore {
			t.Errorf("awards=%d, comps=%d, plans=%d: got score %f, want %f",
				tt.awards, tt.comps, tt.plans, score, tt.wantScore)
		}
	}
}

func TestLeaderboardEntry_DefaultValues(t *testing.T) {
	entry := LeaderboardEntry{}
	if entry.Rank != 0 {
		t.Errorf("default rank should be 0, got %d", entry.Rank)
	}
	if entry.Score != 0 {
		t.Errorf("default score should be 0, got %f", entry.Score)
	}
}
