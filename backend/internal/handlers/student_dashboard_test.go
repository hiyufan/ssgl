package handlers

import (
	"encoding/json"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestStudentDashboardHandler_New(t *testing.T) {
	h := NewStudentDashboardHandler()
	if h == nil {
		t.Fatal("expected non-nil handler")
	}
}

func TestStudentCompetitionEntry_Fields(t *testing.T) {
	teamID := uint(5)
	entry := StudentCompetitionEntry{
		CompetitionID:   1,
		Title:           "蓝桥杯",
		Type:            "programming",
		Status:          "published",
		Phase:           "ongoing",
		TeamID:          &teamID,
		TeamName:        "代码突击队",
		TeamRole:        "leader",
		PrePlanStatus:   "approved",
		AwardStatus:     "",
		AwardAmount:     0,
		DaysRemaining:   30,
		ProgressPercent: 70,
	}

	if entry.CompetitionID != 1 {
		t.Errorf("expected CompetitionID=1, got %d", entry.CompetitionID)
	}
	if entry.Title != "蓝桥杯" {
		t.Errorf("expected Title='蓝桥杯', got '%s'", entry.Title)
	}
	if entry.Phase != "ongoing" {
		t.Errorf("expected Phase='ongoing', got '%s'", entry.Phase)
	}
	if *entry.TeamID != 5 {
		t.Errorf("expected TeamID=5, got %d", *entry.TeamID)
	}
	if entry.TeamRole != "leader" {
		t.Errorf("expected TeamRole='leader', got '%s'", entry.TeamRole)
	}
	if entry.ProgressPercent != 70 {
		t.Errorf("expected ProgressPercent=70, got %f", entry.ProgressPercent)
	}
}

func TestDashboardSummary_Fields(t *testing.T) {
	summary := DashboardSummary{
		UserID:            1,
		Username:          "testuser",
		TotalCompetitions: 5,
		ActiveCount:       3,
		CompletedCount:    2,
		TotalAwards:       1,
		TotalPrize:        5000.50,
		TotalTeams:        3,
		Competitions:      []StudentCompetitionEntry{},
		RecentActivity:    []StudentActivityItem{},
		UpcomingDeadlines: []StudentDeadlineItem{},
	}

	if summary.UserID != 1 {
		t.Errorf("expected UserID=1, got %d", summary.UserID)
	}
	if summary.TotalCompetitions != 5 {
		t.Errorf("expected TotalCompetitions=5, got %d", summary.TotalCompetitions)
	}
	if summary.TotalPrize != 5000.50 {
		t.Errorf("expected TotalPrize=5000.50, got %f", summary.TotalPrize)
	}
}

func TestStudentActivityItem_Fields(t *testing.T) {
	item := StudentActivityItem{
		Type:      "team_join",
		Title:     "加入团队",
		Detail:    "代码突击队",
		CreatedAt: "2026-06-20 12:00",
	}

	if item.Type != "team_join" {
		t.Errorf("expected Type='team_join', got '%s'", item.Type)
	}
	if item.Title != "加入团队" {
		t.Errorf("expected Title='加入团队', got '%s'", item.Title)
	}
}

func TestStudentDeadlineItem_Fields(t *testing.T) {
	item := StudentDeadlineItem{
		CompetitionID: 1,
		Title:         "蓝桥杯报名截止",
		Deadline:      "2026-07-01",
		DaysLeft:      11,
		Type:          "registration_close",
	}

	if item.CompetitionID != 1 {
		t.Errorf("expected CompetitionID=1, got %d", item.CompetitionID)
	}
	if item.DaysLeft != 11 {
		t.Errorf("expected DaysLeft=11, got %d", item.DaysLeft)
	}
}

func TestCalculateStudentProgress_TeamOnly(t *testing.T) {
	teamID := uint(1)
	entry := &StudentCompetitionEntry{
		TeamID: &teamID,
		Phase:  "upcoming",
	}

	progress := calculateStudentProgress(entry)
	if progress != 30 {
		t.Errorf("expected 30 for team only, got %f", progress)
	}
}

func TestCalculateStudentProgress_TeamAndPreplan(t *testing.T) {
	teamID := uint(1)
	entry := &StudentCompetitionEntry{
		TeamID:        &teamID,
		PrePlanStatus: "submitted",
		Phase:         "upcoming",
	}

	progress := calculateStudentProgress(entry)
	if progress != 60 {
		t.Errorf("expected 60 for team+preplan, got %f", progress)
	}
}

func TestCalculateStudentProgress_ApprovedPreplan(t *testing.T) {
	teamID := uint(1)
	entry := &StudentCompetitionEntry{
		TeamID:        &teamID,
		PrePlanStatus: "approved",
		Phase:         "ongoing",
	}

	progress := calculateStudentProgress(entry)
	if progress != 80 {
		t.Errorf("expected 80 for team+approved+ongoing, got %f", progress)
	}
}

func TestCalculateStudentProgress_FullComplete(t *testing.T) {
	teamID := uint(1)
	entry := &StudentCompetitionEntry{
		TeamID:        &teamID,
		PrePlanStatus: "approved",
		Phase:         "completed",
		AwardStatus:   "settled",
		AwardAmount:   5000,
	}

	progress := calculateStudentProgress(entry)
	if progress != 100 {
		t.Errorf("expected 100 for full completion, got %f", progress)
	}
}

func TestCalculateStudentProgress_EmptyEntry(t *testing.T) {
	entry := &StudentCompetitionEntry{}
	progress := calculateStudentProgress(entry)
	if progress != 0 {
		t.Errorf("expected 0 for empty entry, got %f", progress)
	}
}

func TestCalculateStudentProgress_CapsAt100(t *testing.T) {
	teamID := uint(1)
	entry := &StudentCompetitionEntry{
		TeamID:          &teamID,
		PrePlanStatus:   "approved",
		Phase:           "completed",
		AwardStatus:     "settled",
		ProgressPercent: 100,
	}

	progress := calculateStudentProgress(entry)
	if progress > 100 {
		t.Errorf("expected <=100, got %f", progress)
	}
}

func TestStudentDashboard_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewStudentDashboardHandler()

	// Verify handler can be instantiated
	if h == nil {
		t.Fatal("expected non-nil handler")
	}

	// Note: Full integration tests with DB are in test_strict.py
	// Unit test here only validates handler construction and struct types
}

func TestStudentDashboard_JSON(t *testing.T) {
	summary := DashboardSummary{
		UserID:            1,
		Username:          "test_student",
		TotalCompetitions: 3,
		ActiveCount:       2,
		CompletedCount:    1,
		TotalAwards:       1,
		TotalPrize:        3000,
		TotalTeams:        2,
		Competitions: []StudentCompetitionEntry{
			{
				CompetitionID:   1,
				Title:           "蓝桥杯",
				Phase:           "ongoing",
				DaysRemaining:   30,
				ProgressPercent: 70,
			},
		},
		RecentActivity: []StudentActivityItem{
			{Type: "team_join", Title: "加入团队", CreatedAt: "2026-06-20"},
		},
		UpcomingDeadlines: []StudentDeadlineItem{
			{CompetitionID: 1, Title: "报名截止", Deadline: "2026-07-01", DaysLeft: 11},
		},
	}

	data, err := json.Marshal(summary)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result DashboardSummary
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if result.UserID != 1 {
		t.Errorf("expected UserID=1, got %d", result.UserID)
	}
	if len(result.Competitions) != 1 {
		t.Errorf("expected 1 competition, got %d", len(result.Competitions))
	}
	if len(result.UpcomingDeadlines) != 1 {
		t.Errorf("expected 1 deadline, got %d", len(result.UpcomingDeadlines))
	}
	if result.Competitions[0].DaysRemaining != 30 {
		t.Errorf("expected DaysRemaining=30, got %d", result.Competitions[0].DaysRemaining)
	}
}
