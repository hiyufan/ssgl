package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNewLifecycleHandler(t *testing.T) {
	h := NewLifecycleHandler()
	if h == nil {
		t.Fatal("NewLifecycleHandler returned nil")
	}
}

func TestLifecycleHandler_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewLifecycleHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/competitions/abc/lifecycle", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h.GetLifecycle(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestLifecycleHandler_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewLifecycleHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/v1/competitions/999999/lifecycle", nil)
	c.Params = gin.Params{{Key: "id", Value: "999999"}}

	// This will fail with DB not available or not found depending on setup
	h.GetLifecycle(c)

	// Accept 404 (not found) or 500 (db not available in test)
	if w.Code != http.StatusNotFound && w.Code != http.StatusInternalServerError {
		t.Errorf("expected 404 or 500, got %d", w.Code)
	}
}

func TestBuildLifecycleStages(t *testing.T) {
	// Test with data
	stages := buildLifecycleStages(10, 5, 12, 4, 3, 2, 6)

	if len(stages) != 6 {
		t.Fatalf("expected 6 stages, got %d", len(stages))
	}

	// Registration stage with 10 registrations should be active
	if stages[0].Name != "registration" {
		t.Errorf("expected registration, got %s", stages[0].Name)
	}
	if stages[0].Count != 10 {
		t.Errorf("expected count 10, got %d", stages[0].Count)
	}
	if stages[0].Status != "active" {
		t.Errorf("expected active status, got %s", stages[0].Status)
	}

	// Team formation should be active
	if stages[1].Name != "team_formation" {
		t.Errorf("expected team_formation, got %s", stages[1].Name)
	}
	if stages[1].Status != "active" {
		t.Errorf("expected active, got %s", stages[1].Status)
	}

	// Preplan: 4 submitted out of 5 teams → 80%
	if stages[2].Progress != 80 {
		t.Errorf("expected preplan progress 80, got %.1f", stages[2].Progress)
	}

	// Review: 3 approved out of 4 preplans → 75%
	if stages[3].Progress != 75 {
		t.Errorf("expected review progress 75, got %.1f", stages[3].Progress)
	}

	// Milestone: 6 milestones, no target → 100%
	if stages[4].Progress != 100 {
		t.Errorf("expected milestone progress 100, got %.1f", stages[4].Progress)
	}
	if stages[4].Status != "active" {
		t.Errorf("expected active, got %s", stages[4].Status)
	}

	// Award: 2 awards out of 5 teams → 40%
	if stages[5].Progress != 40 {
		t.Errorf("expected award progress 40, got %.1f", stages[5].Progress)
	}
}

func TestBuildLifecycleStages_Empty(t *testing.T) {
	stages := buildLifecycleStages(0, 0, 0, 0, 0, 0, 0)

	if len(stages) != 6 {
		t.Fatalf("expected 6 stages, got %d", len(stages))
	}

	for i, s := range stages {
		if s.Status != "pending" {
			t.Errorf("stage %d: expected pending, got %s", i, s.Status)
		}
		if s.Progress != 0 {
			t.Errorf("stage %d: expected 0 progress, got %.1f", i, s.Progress)
		}
	}
}

func TestBuildLifecycleStages_AllComplete(t *testing.T) {
	// 5 teams, all have preplans approved and awards
	stages := buildLifecycleStages(5, 5, 10, 5, 5, 5, 3)

	// Preplan: 5/5 = 100% → completed
	if stages[2].Status != "completed" {
		t.Errorf("expected completed, got %s", stages[2].Status)
	}

	// Review: 5/5 = 100% → completed
	if stages[3].Status != "completed" {
		t.Errorf("expected completed, got %s", stages[3].Status)
	}

	// Award: 5/5 = 100% → completed
	if stages[5].Status != "completed" {
		t.Errorf("expected completed, got %s", stages[5].Status)
	}
}

func TestLifecycleResponse_JSON(t *testing.T) {
	resp := LifecycleResponse{
		CompetitionID:   1,
		Title:           "测试赛事",
		Type:            "hackathon",
		Status:          "published",
		OverallProgress: 65.5,
		Stages:          buildLifecycleStages(10, 5, 12, 4, 3, 2, 6),
		TeamCount:       5,
		StudentCount:    12,
		PreplanCount:    4,
		AwardCount:      2,
		CompletionRate:  40.0,
		RiskLevel:       "low",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("JSON marshal failed: %v", err)
	}

	var decoded LifecycleResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("JSON unmarshal failed: %v", err)
	}

	if decoded.CompetitionID != 1 {
		t.Errorf("expected id 1, got %d", decoded.CompetitionID)
	}
	if len(decoded.Stages) != 6 {
		t.Errorf("expected 6 stages, got %d", len(decoded.Stages))
	}
	if decoded.RiskLevel != "low" {
		t.Errorf("expected low risk, got %s", decoded.RiskLevel)
	}
}
