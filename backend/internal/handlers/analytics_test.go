package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func setupAnalyticsRouter(h *AnalyticsHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/competitions/:id/analytics", h.GetCompetitionAnalytics)
	r.GET("/stats/analytics", h.GetPlatformAnalytics)
	return r
}

func TestAnalyticsHandler_Created(t *testing.T) {
	h := NewAnalyticsHandler()
	if h == nil {
		t.Fatal("NewAnalyticsHandler returned nil")
	}
}

func TestAnalyticsHandler_CompetitionNotFound(t *testing.T) {
	h := NewAnalyticsHandler()
	r := setupAnalyticsRouter(h)

	req := httptest.NewRequest("GET", "/competitions/999999/analytics", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// In unit tests without a DB connection, we get 503 (service unavailable).
	// In integration tests with a real DB, we'd get 404.
	// Both are valid non-200 responses.
	if w.Code == http.StatusOK {
		t.Errorf("expected non-200, got %d", w.Code)
	}
}

func TestAnalyticsHandler_CompetitionAnalyticsStructure(t *testing.T) {
	// This test validates the JSON structure of CompetitionAnalytics
	analytics := CompetitionAnalytics{
		CompetitionID: 1,
		Title:         "Test Competition",
		Status:        "published",
		Type:          "innovation",
		Scores: AnalyticsScores{
			Overall:            75.5,
			RegistrationHealth: 80,
			TeamFormation:      70,
			PreplanCompletion:  60,
			Engagement:         85,
			Timeliness:         90,
		},
		Registration: RegistrationAnalytics{
			Total:          100,
			TeamCount:      25,
			ConversionRate: 25.0,
			DailyAverage:   3.33,
			GrowthTrend:    "rising",
			DaysRemaining:  30,
			ProjectedTotal: 200,
		},
		Teams: TeamAnalytics{
			Total:        25,
			AvgSize:      4.0,
			MinSize:      2,
			MaxSize:      6,
			FullTeams:    5,
			EmptyTeams:   2,
			BalanceScore: 80,
		},
		Prediction: PredictionData{
			FinalRegistrationCount: 200,
			FinalTeamCount:         50,
			CompletionLikelihood:   85.5,
			RiskLevel:              "low",
			SuggestedActions:       []string{"继续保持"},
		},
		Recommendations: []string{"赛事指标良好"},
	}

	data, err := json.Marshal(analytics)
	if err != nil {
		t.Fatalf("failed to marshal analytics: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to unmarshal analytics: %v", err)
	}

	// Verify required top-level fields
	required := []string{"competition_id", "title", "status", "type", "scores", "registration", "teams", "prediction", "recommendations", "generated_at"}
	for _, field := range required {
		if _, ok := result[field]; !ok {
			t.Errorf("missing required field: %s", field)
		}
	}

	// Verify scores structure
	scores, ok := result["scores"].(map[string]interface{})
	if !ok {
		t.Fatal("scores is not an object")
	}
	scoreFields := []string{"overall", "registration_health", "team_formation", "preplan_completion", "engagement", "timeliness"}
	for _, field := range scoreFields {
		if _, ok := scores[field]; !ok {
			t.Errorf("missing score field: %s", field)
		}
	}

	// Verify prediction structure
	pred, ok := result["prediction"].(map[string]interface{})
	if !ok {
		t.Fatal("prediction is not an object")
	}
	predFields := []string{"final_registration_count", "final_team_count", "completion_likelihood", "risk_level", "suggested_actions"}
	for _, field := range predFields {
		if _, ok := pred[field]; !ok {
			t.Errorf("missing prediction field: %s", field)
		}
	}
}

func TestAnalyticsHandler_RegistrationAnalyticsValidation(t *testing.T) {
	ra := RegistrationAnalytics{
		Total:          50,
		TeamCount:      10,
		ConversionRate: 20.0,
		DailyAverage:   2.5,
		GrowthTrend:    "stable",
		DaysRemaining:  15,
		ProjectedTotal: 100,
	}

	data, err := json.Marshal(ra)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]interface{}
	json.Unmarshal(data, &result)

	required := []string{"total", "team_count", "conversion_rate", "daily_average", "growth_trend", "days_remaining", "projected_total"}
	for _, field := range required {
		if _, ok := result[field]; !ok {
			t.Errorf("missing field: %s", field)
		}
	}
}

func TestAnalyticsHandler_TeamAnalyticsValidation(t *testing.T) {
	ta := TeamAnalytics{
		Total:        10,
		AvgSize:      3.5,
		MinSize:      1,
		MaxSize:      6,
		FullTeams:    3,
		EmptyTeams:   1,
		BalanceScore: 75.0,
	}

	data, err := json.Marshal(ta)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]interface{}
	json.Unmarshal(data, &result)

	required := []string{"total", "avg_size", "min_size", "max_size", "full_teams", "empty_teams", "balance_score"}
	for _, field := range required {
		if _, ok := result[field]; !ok {
			t.Errorf("missing field: %s", field)
		}
	}
}

func TestAnalyticsHandler_PredictionDataValidation(t *testing.T) {
	pd := PredictionData{
		FinalRegistrationCount: 100,
		FinalTeamCount:         25,
		CompletionLikelihood:   80.0,
		RiskLevel:              "medium",
		SuggestedActions:       []string{"action1", "action2"},
	}

	data, err := json.Marshal(pd)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]interface{}
	json.Unmarshal(data, &result)

	required := []string{"final_registration_count", "final_team_count", "completion_likelihood", "risk_level", "suggested_actions"}
	for _, field := range required {
		if _, ok := result[field]; !ok {
			t.Errorf("missing field: %s", field)
		}
	}

	// Verify suggested_actions is array
	actions, ok := result["suggested_actions"].([]interface{})
	if !ok {
		t.Fatal("suggested_actions is not an array")
	}
	if len(actions) != 2 {
		t.Errorf("expected 2 actions, got %d", len(actions))
	}
}

func TestAnalyticsHandler_VelocityTrend(t *testing.T) {
	tests := []struct {
		input    float64
		expected string
	}{
		{20, "accelerating"},
		{5, "growing"},
		{0, "stable"},
		{-5, "slight_decline"},
		{-20, "declining"},
	}

	for _, tt := range tests {
		result := velocityTrend(tt.input)
		if result != tt.expected {
			t.Errorf("velocityTrend(%f) = %s, want %s", tt.input, result, tt.expected)
		}
	}
}

func TestAnalyticsHandler_HelperFunctions(t *testing.T) {
	// Test max64
	if max64(5, 10) != 10 {
		t.Error("max64(5, 10) should be 10")
	}
	if max64(10, 5) != 10 {
		t.Error("max64(10, 5) should be 10")
	}

	// Test min
	if min(5, 10) != 5 {
		t.Error("min(5, 10) should be 5")
	}

	// Test intToStr
	if intToStr(0) != "0" {
		t.Errorf("intToStr(0) = %s, want 0", intToStr(0))
	}
	if intToStr(123) != "123" {
		t.Errorf("intToStr(123) = %s, want 123", intToStr(123))
	}
	if intToStr(-5) != "-5" {
		t.Errorf("intToStr(-5) = %s, want -5", intToStr(-5))
	}
}
