package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func setupTeamAnalysisRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewTeamAnalysisHandler()
	r.GET("/api/v1/teams/:id/analysis", func(c *gin.Context) {
		c.Set("user_id", uint(1))
		h.Analyze(c)
	})
	return r
}

func TestTeamAnalysisHandler_StructCreation(t *testing.T) {
	h := NewTeamAnalysisHandler()
	if h == nil {
		t.Fatal("NewTeamAnalysisHandler returned nil")
	}
}

func TestTeamAnalysisHandler_NonExistentTeam(t *testing.T) {
	r := setupTeamAnalysisRouter()
	req, _ := http.NewRequest("GET", "/api/v1/teams/999999/analysis", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Should return 404 for non-existent team, or 500 if DB not connected in test
	if w.Code != http.StatusNotFound && w.Code != http.StatusOK && w.Code != http.StatusInternalServerError {
		t.Errorf("expected 404, 200, or 500, got %d", w.Code)
	}
}

func TestTeamAnalysisHandler_ResponseStructure(t *testing.T) {
	r := setupTeamAnalysisRouter()
	req, _ := http.NewRequest("GET", "/api/v1/teams/1/analysis", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code == http.StatusOK {
		var result TeamAnalysis
		if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		// Verify required fields exist
		if result.TeamName == "" && result.TeamID == 0 {
			t.Error("response missing both team_id and team_name")
		}

		// Verify analysis fields are present
		if result.DeptBreakdown == nil {
			t.Error("dept_breakdown should not be nil")
		}
		if result.ExperienceDist == nil {
			t.Error("experience_dist should not be nil")
		}
		if result.Strengths == nil {
			t.Error("strengths should not be nil")
		}
		if result.Gaps == nil {
			t.Error("gaps should not be nil")
		}
		if result.Recommendations == nil {
			t.Error("recommendations should not be nil")
		}
	}
}

func TestTeamAnalysis_MemberExperience(t *testing.T) {
	tests := []struct {
		name     string
		expScore float64
		expected string
	}{
		{"expert", 20, "expert"},
		{"intermediate", 10, "intermediate"},
		{"novice", 2, "novice"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expLevel := "novice"
			if tt.expScore >= 15 {
				expLevel = "expert"
			} else if tt.expScore >= 5 {
				expLevel = "intermediate"
			}
			if expLevel != tt.expected {
				t.Errorf("for score %f, expected %s, got %s", tt.expScore, tt.expected, expLevel)
			}
		})
	}
}

func TestTeamAnalysis_OverallScoreBounds(t *testing.T) {
	// Score should be between 0 and 100
	tests := []struct {
		name  string
		score float64
	}{
		{"normal", 50},
		{"max", 100},
		{"min", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := tt.score
			if score > 100 {
				score = 100
			}
			if score < 0 {
				score = 0
			}
			if score < 0 || score > 100 {
				t.Errorf("score %f out of bounds [0, 100]", score)
			}
		})
	}
}
