package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestDifficultyHandler_AssessDifficulty(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("returns error when DB not connected", func(t *testing.T) {
		router := gin.New()
		handler := NewDifficultyHandler()
		router.GET("/api/v1/competitions/:id/difficulty", handler.AssessDifficulty)

		req := httptest.NewRequest("GET", "/api/v1/competitions/999999/difficulty", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// In unit tests without DB, returns 500
		if w.Code != http.StatusInternalServerError {
			t.Errorf("expected 500 (no DB), got %d", w.Code)
		}
		var body map[string]string
		json.Unmarshal(w.Body.Bytes(), &body)
		if body["error"] != "database not connected" {
			t.Errorf("expected 'database not connected', got %q", body["error"])
		}
	})

	t.Run("difficulty levels are correct", func(t *testing.T) {
		tests := []struct {
			score float64
			want  string
		}{
			{1.0, "入门"},
			{1.5, "进阶"},
			{2.5, "挑战"},
			{3.5, "精英"},
			{4.5, "极限"},
			{5.0, "极限"},
		}
		for _, tt := range tests {
			got := difficultyLevel(tt.score)
			if got != tt.want {
				t.Errorf("difficultyLevel(%v) = %q, want %q", tt.score, got, tt.want)
			}
		}
	})

	t.Run("typeComplexity returns expected values", func(t *testing.T) {
		tests := []struct {
			compType string
			min      float64
			max      float64
		}{
			{"hackathon", 70, 80},
			{"ai_innovation", 80, 90},
			{"data_science", 75, 85},
			{"research", 65, 75},
			{"business_plan", 50, 60},
			{"innovation", 55, 65},
			{"unknown", 45, 55},
		}
		for _, tt := range tests {
			got := typeComplexity(tt.compType)
			if got < tt.min || got > tt.max {
				t.Errorf("typeComplexity(%q) = %v, want [%v, %v]", tt.compType, got, tt.min, tt.max)
			}
		}
	})

	t.Run("recommendedTeamSize respects constraints", func(t *testing.T) {
		if got := recommendedTeamSize(5, 4.5); got != 5 {
			t.Errorf("recommendedTeamSize(5, 4.5) = %d, want 5", got)
		}
		if got := recommendedTeamSize(5, 1.0); got != 3 {
			t.Errorf("recommendedTeamSize(5, 1.0) = %d, want 3", got)
		}
		if got := recommendedTeamSize(2, 4.5); got != 2 {
			t.Errorf("recommendedTeamSize(2, 4.5) = %d, want 2", got)
		}
	})

	t.Run("estimatedPrepWeeks scales with difficulty", func(t *testing.T) {
		if got := estimatedPrepWeeks(5.0); got != 12 {
			t.Errorf("estimatedPrepWeeks(5.0) = %d, want 12", got)
		}
		if got := estimatedPrepWeeks(1.0); got != 2 {
			t.Errorf("estimatedPrepWeeks(1.0) = %d, want 2", got)
		}
		if got := estimatedPrepWeeks(3.0); got != 6 {
			t.Errorf("estimatedPrepWeeks(3.0) = %d, want 6", got)
		}
	})

	t.Run("response JSON has error field for no-DB", func(t *testing.T) {
		router := gin.New()
		handler := NewDifficultyHandler()
		router.GET("/api/v1/competitions/:id/difficulty", handler.AssessDifficulty)

		req := httptest.NewRequest("GET", "/api/v1/competitions/999999/difficulty", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		var body map[string]string
		json.Unmarshal(w.Body.Bytes(), &body)
		if body["error"] != "database not connected" {
			t.Errorf("expected error message 'database not connected', got %q", body["error"])
		}
	})

	t.Run("generateDifficultySummary produces expected format", func(t *testing.T) {
		summary := generateDifficultySummary("测试赛事", 3.5, "精英")
		if summary == "" {
			t.Error("summary should not be empty")
		}
		if !containsStr(summary, "测试赛事") || !containsStr(summary, "精英") {
			t.Errorf("summary missing key info: %s", summary)
		}
	})

	t.Run("generateDifficultyTips includes base tip always", func(t *testing.T) {
		tips := generateDifficultyTips(1.0, "innovation", "school")
		if len(tips) == 0 {
			t.Error("should always have at least one tip")
		}
	})

	t.Run("generateDifficultyTips adds high-difficulty tips", func(t *testing.T) {
		tipsLow := generateDifficultyTips(1.0, "innovation", "school")
		tipsHigh := generateDifficultyTips(4.0, "hackathon", "national")
		if len(tipsHigh) <= len(tipsLow) {
			t.Errorf("high difficulty should have more tips: low=%d, high=%d", len(tipsLow), len(tipsHigh))
		}
	})

	t.Run("generateDifficultyTips hackathon-specific", func(t *testing.T) {
		tips := generateDifficultyTips(2.0, "hackathon", "school")
		found := false
		for _, tip := range tips {
			if containsStr(tip, "技术实现") {
				found = true
				break
			}
		}
		if !found {
			t.Error("hackathon should have tech implementation tip")
		}
	})

	t.Run("generateDifficultyTips national-level specific", func(t *testing.T) {
		tips := generateDifficultyTips(2.0, "innovation", "national")
		found := false
		for _, tip := range tips {
			if containsStr(tip, "社会价值") {
				found = true
				break
			}
		}
		if !found {
			t.Error("national level should have social value tip")
		}
	})

	t.Run("estimatedPrepWeeks all brackets", func(t *testing.T) {
		if got := estimatedPrepWeeks(4.5); got != 12 {
			t.Errorf("estimatedPrepWeeks(4.5) = %d, want 12", got)
		}
		if got := estimatedPrepWeeks(3.5); got != 8 {
			t.Errorf("estimatedPrepWeeks(3.5) = %d, want 8", got)
		}
		if got := estimatedPrepWeeks(2.5); got != 6 {
			t.Errorf("estimatedPrepWeeks(2.5) = %d, want 6", got)
		}
		if got := estimatedPrepWeeks(1.5); got != 4 {
			t.Errorf("estimatedPrepWeeks(1.5) = %d, want 4", got)
		}
		if got := estimatedPrepWeeks(0.5); got != 2 {
			t.Errorf("estimatedPrepWeeks(0.5) = %d, want 2", got)
		}
	})

	t.Run("recommendedTeamSize edge cases", func(t *testing.T) {
		// Mid difficulty with small max
		if got := recommendedTeamSize(1, 3.0); got != 1 {
			t.Errorf("recommendedTeamSize(1, 3.0) = %d, want 1", got)
		}
		// Mid difficulty with large max
		if got := recommendedTeamSize(10, 3.0); got != 4 {
			t.Errorf("recommendedTeamSize(10, 3.0) = %d, want 4", got)
		}
	})
}

func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
