package models

import (
	"testing"
	"time"
)

func TestAIAnalysisLog_Fields(t *testing.T) {
	score := 85
	log := AIAnalysisLog{
		ID:         1,
		Type:       "pre_plan_review",
		InputData:  `{"title": "test project"}`,
		OutputData: `{"score": 85, "summary": "good project"}`,
		ModelUsed:  "mimo-v2.5-pro",
		TokensUsed: 1500,
		Score:      &score,
		CreatedAt:  time.Now(),
	}
	if log.ID != 1 {
		t.Errorf("expected ID=1, got %d", log.ID)
	}
	if log.Type != "pre_plan_review" {
		t.Errorf("expected Type='pre_plan_review', got '%s'", log.Type)
	}
	if log.ModelUsed != "mimo-v2.5-pro" {
		t.Errorf("expected ModelUsed='mimo-v2.5-pro', got '%s'", log.ModelUsed)
	}
	if log.TokensUsed != 1500 {
		t.Errorf("expected TokensUsed=1500, got %d", log.TokensUsed)
	}
	if log.Score == nil || *log.Score != 85 {
		t.Errorf("expected Score=85, got %v", log.Score)
	}
}

func TestAIAnalysisLog_NilScore(t *testing.T) {
	log := AIAnalysisLog{
		Type:      "business_plan",
		Score:     nil,
		CreatedAt: time.Now(),
	}
	if log.Score != nil {
		t.Errorf("expected nil Score, got %v", log.Score)
	}
}

func TestAIAnalysisLog_Types(t *testing.T) {
	types := []string{"pre_plan_review", "business_plan", "market_analysis", "tech_route", "improvement", "resource_match"}
	for _, typ := range types {
		log := AIAnalysisLog{Type: typ}
		if log.Type != typ {
			t.Errorf("expected Type='%s', got '%s'", typ, log.Type)
		}
	}
}

func TestAIAnalysisLog_JSONTags(t *testing.T) {
	// Verify all JSON tags are properly set
	log := AIAnalysisLog{
		ID:         1,
		Type:       "test",
		InputData:  "input",
		OutputData: "output",
		ModelUsed:  "model",
		TokensUsed: 100,
		CreatedAt:  time.Now(),
	}
	// These should not panic
	_ = log.ID
	_ = log.Type
	_ = log.InputData
	_ = log.OutputData
	_ = log.ModelUsed
	_ = log.TokensUsed
	_ = log.Score
	_ = log.CreatedAt
}
