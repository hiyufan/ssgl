package handlers

import (
	"testing"
)

func TestNewComparisonHandler(t *testing.T) {
	h := NewComparisonHandler()
	if h == nil {
		t.Fatal("NewComparisonHandler returned nil")
	}
}

func TestCompetitionComparison_Fields(t *testing.T) {
	comp := CompetitionComparison{
		ID:              1,
		Title:           "蓝桥杯",
		Type:            "innovation",
		Status:          "published",
		Level:           "national",
		Location:        "北京",
		Tags:            "编程,算法",
		MaxTeamSize:     5,
		MinTeamSize:     1,
		TeamCount:       20,
		StudentCount:    60,
		PreplanCount:    15,
		AwardCount:      5,
		AvgTeamSize:     3.0,
		RegistrationPct: 80.5,
		DaysUntilStart:  30,
		Duration:        7,
	}

	if comp.ID != 1 {
		t.Errorf("expected ID 1, got %d", comp.ID)
	}
	if comp.Title != "蓝桥杯" {
		t.Errorf("expected Title '蓝桥杯', got '%s'", comp.Title)
	}
	if comp.TeamCount != 20 {
		t.Errorf("expected TeamCount 20, got %d", comp.TeamCount)
	}
	if comp.StudentCount != 60 {
		t.Errorf("expected StudentCount 60, got %d", comp.StudentCount)
	}
	if comp.AvgTeamSize != 3.0 {
		t.Errorf("expected AvgTeamSize 3.0, got %f", comp.AvgTeamSize)
	}
	if comp.Duration != 7 {
		t.Errorf("expected Duration 7, got %d", comp.Duration)
	}
}

func TestCompareResponse_Fields(t *testing.T) {
	resp := CompareResponse{
		Competitions: []CompetitionComparison{
			{ID: 1, Title: "赛事A", TeamCount: 10},
			{ID: 2, Title: "赛事B", TeamCount: 20},
		},
		Summary: ComparisonSummary{
			MostPopular:     "赛事B",
			MostPopularID:   2,
			BestTeamSize:    "赛事A",
			BestTeamSizeID:  1,
			AvgTeamsOverall: 15.0,
			TotalTeams:      30,
			TotalStudents:   90,
		},
	}

	if len(resp.Competitions) != 2 {
		t.Errorf("expected 2 competitions, got %d", len(resp.Competitions))
	}
	if resp.Summary.MostPopular != "赛事B" {
		t.Errorf("expected MostPopular '赛事B', got '%s'", resp.Summary.MostPopular)
	}
	if resp.Summary.TotalTeams != 30 {
		t.Errorf("expected TotalTeams 30, got %d", resp.Summary.TotalTeams)
	}
	if resp.Summary.AvgTeamsOverall != 15.0 {
		t.Errorf("expected AvgTeamsOverall 15.0, got %f", resp.Summary.AvgTeamsOverall)
	}
}

func TestComparisonSummary_Empty(t *testing.T) {
	summary := ComparisonSummary{}
	if summary.TotalTeams != 0 {
		t.Errorf("expected 0, got %d", summary.TotalTeams)
	}
	if summary.MostPopular != "" {
		t.Errorf("expected empty, got '%s'", summary.MostPopular)
	}
}

func TestCompetitionComparison_ZeroValues(t *testing.T) {
	comp := CompetitionComparison{}
	if comp.TeamCount != 0 {
		t.Errorf("expected 0, got %d", comp.TeamCount)
	}
	if comp.AvgTeamSize != 0 {
		t.Errorf("expected 0, got %f", comp.AvgTeamSize)
	}
	if comp.RegistrationPct != 0 {
		t.Errorf("expected 0, got %f", comp.RegistrationPct)
	}
}

func TestCompareResponse_EmptyCompetitions(t *testing.T) {
	resp := CompareResponse{
		Competitions: []CompetitionComparison{},
		Summary:      ComparisonSummary{},
	}
	if len(resp.Competitions) != 0 {
		t.Errorf("expected 0, got %d", len(resp.Competitions))
	}
}

func TestCompetitionComparison_Tags(t *testing.T) {
	comp := CompetitionComparison{
		Tags: "编程,算法,AI",
	}
	if comp.Tags != "编程,算法,AI" {
		t.Errorf("expected tags '编程,算法,AI', got '%s'", comp.Tags)
	}
}

func TestCompareResponse_SingleCompetition(t *testing.T) {
	resp := CompareResponse{
		Competitions: []CompetitionComparison{
			{ID: 1, Title: "单赛事", TeamCount: 5},
		},
		Summary: ComparisonSummary{
			MostPopular:   "单赛事",
			MostPopularID: 1,
			TotalTeams:    5,
		},
	}
	if len(resp.Competitions) != 1 {
		t.Errorf("expected 1, got %d", len(resp.Competitions))
	}
	if resp.Summary.MostPopularID != 1 {
		t.Errorf("expected 1, got %d", resp.Summary.MostPopularID)
	}
}
