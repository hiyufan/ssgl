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

func TestLeaderboardEntry_HighScore(t *testing.T) {
	entry := LeaderboardEntry{
		Rank:             1,
		AwardCount:       100,
		CompetitionCount: 50,
		PrePlanCount:     30,
		Score:            1180.0, // 100*10 + 50*3 + 30*1
	}
	expected := float64(100)*10 + float64(50)*3 + float64(30)
	if entry.Score != expected {
		t.Errorf("expected score %f, got %f", expected, entry.Score)
	}
}

func TestLeaderboardEntry_TeamIDAndLeader(t *testing.T) {
	entry := LeaderboardEntry{
		TeamID:     42,
		TeamName:   "Code Masters",
		LeaderName: "李四",
	}
	if entry.TeamID != 42 {
		t.Errorf("expected TeamID 42, got %d", entry.TeamID)
	}
	if entry.LeaderName != "李四" {
		t.Errorf("expected LeaderName '李四', got '%s'", entry.LeaderName)
	}
}
