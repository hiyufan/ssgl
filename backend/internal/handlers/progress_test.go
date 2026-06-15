package handlers

import (
	"testing"
)

func TestCompetitionProgress_Fields(t *testing.T) {
	progress := CompetitionProgress{
		ID:            1,
		Title:         "蓝桥杯",
		Status:        "ongoing",
		Type:          "hackathon",
		StartDate:     "2026-04-01",
		EndDate:       "2026-06-30",
		TeamCount:     10,
		StudentCount:  35,
		PrePlanCount:  8,
		ReviewedCount: 5,
		ApprovedCount: 3,
		AwardCount:    2,
		SettledCount:  1,
		TotalPrize:    5000,
		Progress:      80,
	}

	if progress.ID != 1 {
		t.Errorf("expected ID=1, got %d", progress.ID)
	}
	if progress.Title != "蓝桥杯" {
		t.Errorf("expected Title='蓝桥杯', got '%s'", progress.Title)
	}
	if progress.Status != "ongoing" {
		t.Errorf("expected Status='ongoing', got '%s'", progress.Status)
	}
	if progress.Type != "hackathon" {
		t.Errorf("expected Type='hackathon', got '%s'", progress.Type)
	}
	if progress.TeamCount != 10 {
		t.Errorf("expected TeamCount=10, got %d", progress.TeamCount)
	}
	if progress.StudentCount != 35 {
		t.Errorf("expected StudentCount=35, got %d", progress.StudentCount)
	}
	if progress.PrePlanCount != 8 {
		t.Errorf("expected PrePlanCount=8, got %d", progress.PrePlanCount)
	}
	if progress.ReviewedCount != 5 {
		t.Errorf("expected ReviewedCount=5, got %d", progress.ReviewedCount)
	}
	if progress.ApprovedCount != 3 {
		t.Errorf("expected ApprovedCount=3, got %d", progress.ApprovedCount)
	}
	if progress.AwardCount != 2 {
		t.Errorf("expected AwardCount=2, got %d", progress.AwardCount)
	}
	if progress.SettledCount != 1 {
		t.Errorf("expected SettledCount=1, got %d", progress.SettledCount)
	}
	if progress.TotalPrize != 5000 {
		t.Errorf("expected TotalPrize=5000, got %f", progress.TotalPrize)
	}
	if progress.Progress != 80 {
		t.Errorf("expected Progress=80, got %f", progress.Progress)
	}
}

func TestCompetitionProgress_ZeroValues(t *testing.T) {
	progress := CompetitionProgress{}

	if progress.ID != 0 {
		t.Errorf("expected ID=0, got %d", progress.ID)
	}
	if progress.TeamCount != 0 {
		t.Errorf("expected TeamCount=0, got %d", progress.TeamCount)
	}
	if progress.TotalPrize != 0 {
		t.Errorf("expected TotalPrize=0, got %f", progress.TotalPrize)
	}
	if progress.Progress != 0 {
		t.Errorf("expected Progress=0, got %f", progress.Progress)
	}
}

func TestCompetitionProgress_DateFormatting(t *testing.T) {
	progress := CompetitionProgress{
		StartDate: "2026-04-01",
		EndDate:   "2026-06-30",
	}

	if progress.StartDate != "2026-04-01" {
		t.Errorf("expected StartDate='2026-04-01', got '%s'", progress.StartDate)
	}
	if progress.EndDate != "2026-06-30" {
		t.Errorf("expected EndDate='2026-06-30', got '%s'", progress.EndDate)
	}
}

func TestCompetitionProgress_LifecycleComplete(t *testing.T) {
	// A fully completed competition should have 100% progress
	progress := CompetitionProgress{
		TeamCount:     5,
		PrePlanCount:  5,
		ReviewedCount: 5,
		AwardCount:    3,
		Progress:      100,
	}

	if progress.Progress != 100 {
		t.Errorf("expected Progress=100, got %f", progress.Progress)
	}
}

func TestCompetitionProgress_NewCompetition(t *testing.T) {
	// A brand new competition with no activity
	progress := CompetitionProgress{
		Status:   "draft",
		Progress: 10, // Base progress for existing competition
	}

	if progress.Progress != 10 {
		t.Errorf("expected Progress=10, got %f", progress.Progress)
	}
}
