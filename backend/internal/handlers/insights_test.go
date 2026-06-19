package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNewInsightsHandler(t *testing.T) {
	h := NewInsightsHandler()
	if h == nil {
		t.Fatal("NewInsightsHandler returned nil")
	}
}

func TestInsightsHandler_Insights_NoDB(t *testing.T) {
	// Without initializing the database, Insights should return 503.
	gin.SetMode(gin.TestMode)
	h := NewInsightsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/stats/insights", nil)

	h.Insights(c)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestInsightsHandler_StructFields(t *testing.T) {
	// Verify that PlatformInsights has all required fields
	pi := PlatformInsights{
		Summary:       "test summary",
		OverallHealth: "good",
		Insights: []InsightItem{
			{
				Category:    "trend",
				Title:       "test insight",
				Description: "test description",
				Severity:    "info",
				Metric:      42.5,
				Action:      "test action",
			},
		},
		TrendAnalysis: TrendAnalysis{
			CompetitionsGrowth: 10.5,
			TeamsGrowth:        20.0,
			AwardsGrowth:       5.0,
			ActiveCompetitions: 3,
			CompletionRate:     50.0,
			AIAuditRate:        75.0,
		},
		RiskMatrix: []RiskItem{
			{
				Factor:     "test risk",
				Impact:     "high",
				Likelihood: "medium",
				Score:      6.0,
				Mitigation: "test mitigation",
			},
		},
		Recommendations: []InsightItem{
			{
				Category:    "recommendation",
				Title:       "test recommendation",
				Description: "test rec description",
				Severity:    "info",
				Action:      "test action",
			},
		},
		ActivityBursts: []CompetitionBurst{
			{
				Period:       "2026-06",
				Count:        5,
				Competitions: []string{"comp1", "comp2"},
			},
		},
		GeneratedAt: "2026-06-19T00:00:00Z",
	}

	data, err := json.Marshal(pi)
	if err != nil {
		t.Fatalf("failed to marshal PlatformInsights: %v", err)
	}

	var decoded PlatformInsights
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal PlatformInsights: %v", err)
	}

	if decoded.Summary != "test summary" {
		t.Errorf("expected summary 'test summary', got '%s'", decoded.Summary)
	}
	if decoded.OverallHealth != "good" {
		t.Errorf("expected health 'good', got '%s'", decoded.OverallHealth)
	}
	if len(decoded.Insights) != 1 {
		t.Errorf("expected 1 insight, got %d", len(decoded.Insights))
	}
	if decoded.Insights[0].Category != "trend" {
		t.Errorf("expected category 'trend', got '%s'", decoded.Insights[0].Category)
	}
	if decoded.Insights[0].Metric != 42.5 {
		t.Errorf("expected metric 42.5, got %f", decoded.Insights[0].Metric)
	}
	if decoded.TrendAnalysis.ActiveCompetitions != 3 {
		t.Errorf("expected 3 active competitions, got %d", decoded.TrendAnalysis.ActiveCompetitions)
	}
	if len(decoded.RiskMatrix) != 1 {
		t.Errorf("expected 1 risk, got %d", len(decoded.RiskMatrix))
	}
	if decoded.RiskMatrix[0].Score != 6.0 {
		t.Errorf("expected risk score 6.0, got %f", decoded.RiskMatrix[0].Score)
	}
	if len(decoded.Recommendations) != 1 {
		t.Errorf("expected 1 recommendation, got %d", len(decoded.Recommendations))
	}
	if len(decoded.ActivityBursts) != 1 {
		t.Errorf("expected 1 burst, got %d", len(decoded.ActivityBursts))
	}
	if decoded.ActivityBursts[0].Count != 5 {
		t.Errorf("expected burst count 5, got %d", decoded.ActivityBursts[0].Count)
	}
}

func TestGrowthRate(t *testing.T) {
	tests := []struct {
		name     string
		recent   int64
		prev     int64
		expected float64
	}{
		{"both zero", 0, 0, 0},
		{"prev zero, recent positive", 5, 0, 100},
		{"prev zero, recent zero", 0, 0, 0},
		{"100% growth", 10, 5, 100},
		{"50% growth", 15, 10, 50},
		{"decline", 5, 10, -50},
		{"no change", 10, 10, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := growthRate(tt.recent, tt.prev)
			if result != tt.expected {
				t.Errorf("growthRate(%d, %d) = %f, want %f", tt.recent, tt.prev, result, tt.expected)
			}
		})
	}
}

func TestInsightItem_JSON(t *testing.T) {
	item := InsightItem{
		Category:    "opportunity",
		Title:       "Test Title",
		Description: "Test Description",
		Severity:    "warning",
		Metric:      3.14,
		Action:      "Take action",
	}

	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("failed to marshal InsightItem: %v", err)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal InsightItem: %v", err)
	}

	if decoded["category"] != "opportunity" {
		t.Errorf("expected 'opportunity', got %v", decoded["category"])
	}
	if decoded["title"] != "Test Title" {
		t.Errorf("expected 'Test Title', got %v", decoded["title"])
	}
	if decoded["severity"] != "warning" {
		t.Errorf("expected 'warning', got %v", decoded["severity"])
	}
}

func TestRiskItem_JSON(t *testing.T) {
	risk := RiskItem{
		Factor:     "test factor",
		Impact:     "high",
		Likelihood: "low",
		Score:      3.0,
		Mitigation: "do something",
	}

	data, err := json.Marshal(risk)
	if err != nil {
		t.Fatalf("failed to marshal RiskItem: %v", err)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal RiskItem: %v", err)
	}

	if decoded["factor"] != "test factor" {
		t.Errorf("expected 'test factor', got %v", decoded["factor"])
	}
	if decoded["score"].(float64) != 3.0 {
		t.Errorf("expected 3.0, got %v", decoded["score"])
	}
}

func TestCompetitionBurst_JSON(t *testing.T) {
	burst := CompetitionBurst{
		Period:       "2026-06",
		Count:        8,
		Competitions: []string{"A", "B", "C"},
	}

	data, err := json.Marshal(burst)
	if err != nil {
		t.Fatalf("failed to marshal CompetitionBurst: %v", err)
	}

	var decoded CompetitionBurst
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CompetitionBurst: %v", err)
	}

	if decoded.Period != "2026-06" {
		t.Errorf("expected '2026-06', got '%s'", decoded.Period)
	}
	if decoded.Count != 8 {
		t.Errorf("expected 8, got %d", decoded.Count)
	}
	if len(decoded.Competitions) != 3 {
		t.Errorf("expected 3 competitions, got %d", len(decoded.Competitions))
	}
}
