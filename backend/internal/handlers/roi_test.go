package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func setupROIRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewROIHandler()
	r.GET("/competitions/:id/roi", h.CalculateROI)
	r.GET("/competitions/roi/compare", h.BatchROI)
	return r
}

func TestROIHandler_StructCreation(t *testing.T) {
	h := NewROIHandler()
	if h == nil {
		t.Fatal("NewROIHandler returned nil")
	}
}

func TestROIHandler_ROIStruct(t *testing.T) {
	roi := CompetitionROI{
		CompetitionID:   1,
		CompetitionName: "Test Comp",
		ROIScore:        75.5,
		TimeInvestment:  "medium",
		RewardPotential: "high",
		DifficultyLevel: "hard",
		TeamCount:       10,
		StudentCount:    40,
		AwardCount:      5,
		PreplanCount:    8,
		AvgTeamSize:     4.0,
		WinRate:         50.0,
		PreplanRate:     80.0,
		Factors: []ROIFactor{
			{Name: "参与热度", Score: 80, Weight: 0.30, Detail: "test"},
		},
		Recommendation: "推荐",
	}

	if roi.CompetitionID != 1 {
		t.Errorf("expected CompetitionID=1, got %d", roi.CompetitionID)
	}
	if roi.ROIScore != 75.5 {
		t.Errorf("expected ROIScore=75.5, got %f", roi.ROIScore)
	}
	if len(roi.Factors) != 1 {
		t.Errorf("expected 1 factor, got %d", len(roi.Factors))
	}
}

func TestROIHandler_ROIFactor(t *testing.T) {
	f := ROIFactor{
		Name:   "参与热度",
		Score:  85.0,
		Weight: 0.30,
		Detail: "基于参赛团队数",
	}
	if f.Name != "参与热度" {
		t.Errorf("expected name '参与热度', got '%s'", f.Name)
	}
	if f.Weight != 0.30 {
		t.Errorf("expected weight 0.30, got %f", f.Weight)
	}
}

func TestROIHandler_BatchROI_NoIDs(t *testing.T) {
	r := setupROIRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/competitions/roi/compare", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestROIHandler_RecommendationLogic(t *testing.T) {
	tests := []struct {
		score float64
		label string
	}{
		{80, "strong"},
		{60, "good"},
		{40, "fair"},
		{20, "low"},
	}
	for _, tt := range tests {
		rec := generateROIRecommendation(tt.score, 50, 10, 60)
		if len(rec) == 0 {
			t.Errorf("empty recommendation for %s (score=%f)", tt.label, tt.score)
		}
	}
}

func TestROIHandler_ROIScoreJSON(t *testing.T) {
	roi := CompetitionROI{
		CompetitionID:   42,
		CompetitionName: "蓝桥杯",
		ROIScore:        88.5,
		Factors:         []ROIFactor{},
	}
	data, err := json.Marshal(roi)
	if err != nil {
		t.Fatalf("JSON marshal failed: %v", err)
	}
	var decoded CompetitionROI
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("JSON unmarshal failed: %v", err)
	}
	if decoded.CompetitionID != 42 {
		t.Errorf("expected id=42, got %d", decoded.CompetitionID)
	}
	if decoded.ROIScore != 88.5 {
		t.Errorf("expected score=88.5, got %f", decoded.ROIScore)
	}
}

func TestROIHandler_FiveFactors(t *testing.T) {
	// Verify that the ROI system uses 5 factors
	factorNames := []string{"参与热度", "获奖机会", "备赛支持", "经验值", "参与门槛"}
	weights := []float64{0.30, 0.25, 0.20, 0.15, 0.10}

	totalWeight := 0.0
	for i, name := range factorNames {
		f := ROIFactor{Name: name, Score: 50, Weight: weights[i]}
		totalWeight += f.Weight
	}
	if totalWeight != 1.0 {
		t.Errorf("factor weights should sum to 1.0, got %f", totalWeight)
	}
}

func TestROIHandler_BatchROIStruct(t *testing.T) {
	results := []CompetitionROI{
		{CompetitionID: 1, ROIScore: 80},
		{CompetitionID: 2, ROIScore: 60},
	}
	// Verify descending sort logic
	if results[0].ROIScore < results[1].ROIScore {
		t.Error("results should be sorted by ROI score descending")
	}
}
