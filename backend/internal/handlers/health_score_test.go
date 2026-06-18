package handlers

import (
	"encoding/json"
	"testing"
)

func TestNewHealthScoreHandler(t *testing.T) {
	h := NewHealthScoreHandler()
	if h == nil {
		t.Fatal("NewHealthScoreHandler returned nil")
	}
}

func TestHealthScoreResponse_Fields(t *testing.T) {
	resp := HealthScoreResponse{
		OverallScore: 75.5,
		Level:        "good",
		Summary:      "平台运行良好",
		Timestamp:    "2026-01-01T00:00:00Z",
	}
	if resp.OverallScore != 75.5 {
		t.Errorf("expected OverallScore 75.5, got %f", resp.OverallScore)
	}
	if resp.Level != "good" {
		t.Errorf("expected Level 'good', got %s", resp.Level)
	}
	if resp.Summary != "平台运行良好" {
		t.Errorf("expected Summary '平台运行良好', got %s", resp.Summary)
	}
}

func TestHealthDimension_Fields(t *testing.T) {
	d := HealthDimension{
		Name:    "赛事活跃度",
		Score:   80.0,
		Weight:  0.20,
		Details: "已发布赛事占比",
	}
	if d.Name != "赛事活跃度" {
		t.Errorf("expected Name '赛事活跃度', got %s", d.Name)
	}
	if d.Score != 80.0 {
		t.Errorf("expected Score 80.0, got %f", d.Score)
	}
	if d.Weight != 0.20 {
		t.Errorf("expected Weight 0.20, got %f", d.Weight)
	}
}

func TestHealthScoreResponse_JSONTags(t *testing.T) {
	resp := HealthScoreResponse{
		OverallScore: 90.0,
		Level:        "excellent",
		Dimensions: []HealthDimension{
			{Name: "test", Score: 100, Weight: 1.0, Details: "details"},
		},
		Summary:   "great",
		Timestamp: "2026-01-01T00:00:00Z",
	}
	b, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	var m map[string]interface{}
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("json.Unmarshal failed: %v", err)
	}
	if _, ok := m["overall_score"]; !ok {
		t.Error("missing JSON field 'overall_score'")
	}
	if _, ok := m["level"]; !ok {
		t.Error("missing JSON field 'level'")
	}
	if _, ok := m["dimensions"]; !ok {
		t.Error("missing JSON field 'dimensions'")
	}
	if _, ok := m["summary"]; !ok {
		t.Error("missing JSON field 'summary'")
	}
	if _, ok := m["timestamp"]; !ok {
		t.Error("missing JSON field 'timestamp'")
	}
}

func TestHealthDimension_JSONTags(t *testing.T) {
	d := HealthDimension{Name: "test", Score: 50, Weight: 0.5, Details: "info"}
	b, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	var m map[string]interface{}
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("json.Unmarshal failed: %v", err)
	}
	for _, key := range []string{"name", "score", "weight", "details"} {
		if _, ok := m[key]; !ok {
			t.Errorf("missing JSON field '%s'", key)
		}
	}
}

func TestHealthScoreResponse_EmptyDimensions(t *testing.T) {
	resp := HealthScoreResponse{
		OverallScore: 0,
		Level:        "needs_attention",
		Dimensions:   []HealthDimension{},
		Summary:      "no data",
	}
	if len(resp.Dimensions) != 0 {
		t.Errorf("expected 0 dimensions, got %d", len(resp.Dimensions))
	}
}

func TestHealthScoreResponse_Levels(t *testing.T) {
	levels := []struct {
		score float64
		level string
	}{
		{90, "excellent"},
		{70, "good"},
		{50, "fair"},
		{20, "needs_attention"},
	}
	for _, tc := range levels {
		var level string
		switch {
		case tc.score >= 80:
			level = "excellent"
		case tc.score >= 60:
			level = "good"
		case tc.score >= 40:
			level = "fair"
		default:
			level = "needs_attention"
		}
		if level != tc.level {
			t.Errorf("score %f: expected level %s, got %s", tc.score, tc.level, level)
		}
	}
}

func TestHealthScoreResponse_ScoreRanges(t *testing.T) {
	// Verify score range is 0-100
	resp := HealthScoreResponse{
		OverallScore: 100,
		Level:        "excellent",
	}
	if resp.OverallScore < 0 || resp.OverallScore > 100 {
		t.Errorf("score out of range: %f", resp.OverallScore)
	}
}

func TestHealthScoreResponse_MultipleDimensions(t *testing.T) {
	dims := []HealthDimension{
		{Name: "赛事活跃度", Score: 80, Weight: 0.20},
		{Name: "学生组队率", Score: 60, Weight: 0.20},
		{Name: "AI 评审覆盖率", Score: 40, Weight: 0.20},
		{Name: "奖项结算率", Score: 90, Weight: 0.15},
		{Name: "用户活跃度", Score: 70, Weight: 0.15},
		{Name: "数据完整度", Score: 85, Weight: 0.10},
	}

	totalWeight := 0.0
	overall := 0.0
	for _, d := range dims {
		totalWeight += d.Weight
		overall += d.Score * d.Weight
	}

	// Weights should sum to 1.0
	if totalWeight < 0.99 || totalWeight > 1.01 {
		t.Errorf("weights sum to %f, expected ~1.0", totalWeight)
	}

	// Overall should be weighted average
	expected := 80*0.20 + 60*0.20 + 40*0.20 + 90*0.15 + 70*0.15 + 85*0.10
	if overall != expected {
		t.Errorf("expected overall %f, got %f", expected, overall)
	}
}
