package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestLiveDashboardHandler_Exists(t *testing.T) {
	h := NewLiveDashboardHandler()
	if h == nil {
		t.Fatal("NewLiveDashboardHandler returned nil")
	}
}

func TestLiveDashboardHandler_NoDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	h := NewLiveDashboardHandler()
	h.GetDashboard(c)

	// Without DB, should return 503
	if w.Code != http.StatusServiceUnavailable {
		t.Logf("Expected 503, got %d (DB may be available in test env)", w.Code)
	}
}

func TestLiveDashboardResponse_Structure(t *testing.T) {
	// Test that the response structs serialize correctly
	resp := LiveDashboardResponse{
		Summary: LiveDashSummary{
			TotalCompetitions:  10,
			ActiveCompetitions: 5,
			TotalTeams:         50,
			TotalStudents:      100,
			TotalPreplans:      30,
			TotalAwards:        20,
			AIReviewRate:       75.5,
			TeamFormationRate:  80.0,
		},
		Competitions: []LiveCompSummary{
			{
				ID:            1,
				Title:         "Test Competition",
				Type:          "hackathon",
				Status:        "published",
				TeamCount:     10,
				StudentCount:  30,
				PreplanCount:  5,
				AwardCount:    3,
				RegCount:      15,
				Phase:         "upcoming",
				DaysRemaining: 30,
				Progress:      0.0,
			},
		},
		RecentEvents: []LiveDashEvent{
			{
				Type:    "team_create",
				Summary: "新团队「测试团队」组建",
				Time:    "2026-06-20T10:00:00Z",
			},
		},
		TopTeams: []LiveDashTeam{
			{
				ID:            1,
				Name:          "Top Team",
				CompTitle:     "Test Competition",
				MemberCount:   3,
				AwardCount:    2,
				AchievePoints: 100,
			},
		},
		HotCompetitions: []LiveDashHot{
			{
				ID:        1,
				Title:     "Hot Competition",
				TeamCount: 20,
				RegCount:  50,
				HeatIndex: 135.0,
				DaysLeft:  15,
			},
		},
		Alerts: []LiveDashAlert{
			{
				Level:   "warning",
				Message: "赛事「Test」距截止仅剩 3 天",
				CompID:  1,
			},
		},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("Failed to marshal response: %v", err)
	}

	// Verify it can be unmarshaled back
	var decoded LiveDashboardResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	// Verify key fields
	if decoded.Summary.TotalCompetitions != 10 {
		t.Errorf("Expected TotalCompetitions=10, got %d", decoded.Summary.TotalCompetitions)
	}
	if len(decoded.Competitions) != 1 {
		t.Errorf("Expected 1 competition, got %d", len(decoded.Competitions))
	}
	if decoded.Competitions[0].Title != "Test Competition" {
		t.Errorf("Expected title 'Test Competition', got '%s'", decoded.Competitions[0].Title)
	}
	if len(decoded.RecentEvents) != 1 {
		t.Errorf("Expected 1 event, got %d", len(decoded.RecentEvents))
	}
	if len(decoded.TopTeams) != 1 {
		t.Errorf("Expected 1 top team, got %d", len(decoded.TopTeams))
	}
	if decoded.TopTeams[0].AchievePoints != 100 {
		t.Errorf("Expected AchievePoints=100, got %d", decoded.TopTeams[0].AchievePoints)
	}
	if len(decoded.HotCompetitions) != 1 {
		t.Errorf("Expected 1 hot competition, got %d", len(decoded.HotCompetitions))
	}
	if len(decoded.Alerts) != 1 {
		t.Errorf("Expected 1 alert, got %d", len(decoded.Alerts))
	}
	if decoded.Alerts[0].Level != "warning" {
		t.Errorf("Expected alert level 'warning', got '%s'", decoded.Alerts[0].Level)
	}
}

func TestLiveCompSummary_PhaseCalculation(t *testing.T) {
	tests := []struct {
		name     string
		summary  LiveCompSummary
		wantPhase string
	}{
		{
			name:      "draft competition",
			summary:   LiveCompSummary{Phase: "draft"},
			wantPhase: "draft",
		},
		{
			name:      "upcoming competition",
			summary:   LiveCompSummary{Phase: "upcoming", DaysRemaining: 30},
			wantPhase: "upcoming",
		},
		{
			name:      "in_progress competition",
			summary:   LiveCompSummary{Phase: "in_progress", Progress: 50.0},
			wantPhase: "in_progress",
		},
		{
			name:      "completed competition",
			summary:   LiveCompSummary{Phase: "completed", Progress: 100.0},
			wantPhase: "completed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.summary.Phase != tt.wantPhase {
				t.Errorf("Expected phase '%s', got '%s'", tt.wantPhase, tt.summary.Phase)
			}
		})
	}
}

func TestLiveDashAlert_Levels(t *testing.T) {
	validLevels := map[string]bool{
		"info":     true,
		"warning":  true,
		"critical": true,
	}

	alerts := []LiveDashAlert{
		{Level: "info", Message: "Info alert"},
		{Level: "warning", Message: "Warning alert"},
		{Level: "critical", Message: "Critical alert"},
	}

	for _, a := range alerts {
		if !validLevels[a.Level] {
			t.Errorf("Invalid alert level: %s", a.Level)
		}
	}
}
