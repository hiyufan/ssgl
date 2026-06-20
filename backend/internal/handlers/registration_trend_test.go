package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNewRegistrationTrendHandler(t *testing.T) {
	h := NewRegistrationTrendHandler()
	if h == nil {
		t.Fatal("NewRegistrationTrendHandler returned nil")
	}
}

func TestRegTrendPoint_Fields(t *testing.T) {
	p := RegTrendPoint{
		Date:  "2026-06-20",
		Count: 5,
	}
	if p.Date != "2026-06-20" {
		t.Errorf("expected date 2026-06-20, got %s", p.Date)
	}
	if p.Count != 5 {
		t.Errorf("expected count 5, got %d", p.Count)
	}
}

func TestRegistrationTrendResponse_Fields(t *testing.T) {
	resp := RegistrationTrendResponse{
		Trend:      []RegTrendPoint{{Date: "2026-06-01", Count: 3}},
		Total:      42,
		Days:       30,
		AvgPerDay:  1.4,
		PeakDay:    "2026-06-15",
		PeakCount:  10,
		GrowthRate: 25.5,
	}

	if resp.Total != 42 {
		t.Errorf("expected total 42, got %d", resp.Total)
	}
	if resp.Days != 30 {
		t.Errorf("expected days 30, got %d", resp.Days)
	}
	if resp.AvgPerDay != 1.4 {
		t.Errorf("expected avg_per_day 1.4, got %f", resp.AvgPerDay)
	}
	if resp.PeakDay != "2026-06-15" {
		t.Errorf("expected peak_day 2026-06-15, got %s", resp.PeakDay)
	}
	if resp.PeakCount != 10 {
		t.Errorf("expected peak_count 10, got %d", resp.PeakCount)
	}
	if resp.GrowthRate != 25.5 {
		t.Errorf("expected growth_rate 25.5, got %f", resp.GrowthRate)
	}
	if len(resp.Trend) != 1 {
		t.Errorf("expected 1 trend point, got %d", len(resp.Trend))
	}
}

func TestRegistrationTrendResponse_JSON(t *testing.T) {
	resp := RegistrationTrendResponse{
		Trend: []RegTrendPoint{
			{Date: "2026-06-01", Count: 3},
			{Date: "2026-06-02", Count: 7},
		},
		Total:      10,
		Days:       2,
		AvgPerDay:  5.0,
		PeakDay:    "2026-06-02",
		PeakCount:  7,
		GrowthRate: 133.3,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}

	var decoded RegistrationTrendResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("json.Unmarshal failed: %v", err)
	}

	if decoded.Total != resp.Total {
		t.Errorf("round-trip total mismatch: %d vs %d", decoded.Total, resp.Total)
	}
	if len(decoded.Trend) != len(resp.Trend) {
		t.Errorf("round-trip trend length mismatch: %d vs %d", len(decoded.Trend), len(resp.Trend))
	}
	if decoded.GrowthRate != resp.GrowthRate {
		t.Errorf("round-trip growth_rate mismatch: %f vs %f", decoded.GrowthRate, resp.GrowthRate)
	}
}

func TestRegistrationTrendHandler_NilDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/stats/registration-trends", nil)

	h := NewRegistrationTrendHandler()
	h.GetTrend(c)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestRegistrationTrendHandler_DaysParsing(t *testing.T) {
	// Test that parseSimpleInt works correctly for the days parameter
	tests := []struct {
		input    string
		expected int
	}{
		{"7", 7},
		{"30", 30},
		{"365", 365},
		{"0", 0},     // invalid, should default to 30
		{"-1", 0},    // invalid
		{"abc", 0},   // invalid
		{"500", 500}, // exceeds 365, should default to 30
	}

	for _, tt := range tests {
		result := parseSimpleInt(tt.input)
		if result != tt.expected {
			t.Errorf("parseSimpleInt(%q) = %d, want %d", tt.input, result, tt.expected)
		}
	}
}

func TestRegTrendPoint_EmptyJSON(t *testing.T) {
	// Verify empty trend point serializes correctly
	p := RegTrendPoint{}
	data, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	if decoded["date"] != "" {
		t.Errorf("expected empty date, got %v", decoded["date"])
	}
	if decoded["count"].(float64) != 0 {
		t.Errorf("expected zero count, got %v", decoded["count"])
	}
}

func TestRegistrationTrendResponse_EmptyTrend(t *testing.T) {
	resp := RegistrationTrendResponse{
		Trend:      []RegTrendPoint{},
		Total:      0,
		Days:       30,
		AvgPerDay:  0,
		PeakDay:    "",
		PeakCount:  0,
		GrowthRate: 0,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}

	var decoded RegistrationTrendResponse
	json.Unmarshal(data, &decoded)

	if len(decoded.Trend) != 0 {
		t.Errorf("expected empty trend, got %d items", len(decoded.Trend))
	}
	if decoded.Total != 0 {
		t.Errorf("expected 0 total, got %d", decoded.Total)
	}
}
