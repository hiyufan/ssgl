package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRiskAlertHandler_AssessCompetitionRisk_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewRiskAlertHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/competitions/999999/risk", nil)
	c.Params = gin.Params{{Key: "id", Value: "999999"}}

	handler.AssessCompetitionRisk(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestRiskAlertHandler_GetPlatformRiskOverview(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewRiskAlertHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/stats/risk-overview", nil)

	handler.GetPlatformRiskOverview(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp PlatformRiskSummary
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.TotalCompetitions < 0 {
		t.Error("TotalCompetitions should not be negative")
	}

	if resp.AverageRiskScore < 0 || resp.AverageRiskScore > 100 {
		t.Errorf("AverageRiskScore out of range: %f", resp.AverageRiskScore)
	}

	if len(resp.Recommendations) == 0 {
		t.Error("should have at least one recommendation")
	}
}

func TestRiskLevelFromScore(t *testing.T) {
	tests := []struct {
		score float64
		want  RiskLevel
	}{
		{0, RiskLow},
		{29, RiskLow},
		{30, RiskMedium},
		{49, RiskMedium},
		{50, RiskHigh},
		{69, RiskHigh},
		{70, RiskCritical},
		{100, RiskCritical},
	}

	for _, tt := range tests {
		got := riskLevelFromScore(tt.score)
		if got != tt.want {
			t.Errorf("riskLevelFromScore(%v) = %v, want %v", tt.score, got, tt.want)
		}
	}
}

func TestGeneratePlatformRecommendations(t *testing.T) {
	// Test with all zeros - should return "healthy"
	summary := PlatformRiskSummary{}
	recs := generatePlatformRecommendations(summary)
	if len(recs) != 1 {
		t.Errorf("expected 1 recommendation, got %d", len(recs))
	}

	// Test with critical risks
	summary = PlatformRiskSummary{
		TotalCompetitions: 10,
		AtRisk:            6,
		CriticalCount:     2,
		HighCount:         3,
		AverageRiskScore:  55,
	}
	recs = generatePlatformRecommendations(summary)
	if len(recs) < 3 {
		t.Errorf("expected at least 3 recommendations, got %d", len(recs))
	}
}
