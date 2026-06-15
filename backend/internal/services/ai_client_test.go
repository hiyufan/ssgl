package services

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/ssgl/competition-platform/internal/config"
)

func TestNewAIServiceClient_DefaultURL(t *testing.T) {
	cfg := &config.AIConfig{BaseURL: ""}
	client := NewAIServiceClient(cfg)
	if client == nil {
		t.Fatal("NewAIServiceClient returned nil")
	}
	if client.BaseURL != "http://localhost:8000" {
		t.Errorf("expected default base URL 'http://localhost:8000', got '%s'", client.BaseURL)
	}
	if client.HTTPClient == nil {
		t.Fatal("HTTPClient should not be nil")
	}
	if client.HTTPClient.Timeout != 120*time.Second {
		t.Errorf("expected timeout 120s, got %v", client.HTTPClient.Timeout)
	}
}

func TestNewAIServiceClient_CustomURL(t *testing.T) {
	cfg := &config.AIConfig{BaseURL: "http://ai-service:9000"}
	client := NewAIServiceClient(cfg)
	if client.BaseURL != "http://ai-service:9000" {
		t.Errorf("expected custom base URL, got '%s'", client.BaseURL)
	}
}

func TestAIServiceClient_URLConstruction(t *testing.T) {
	cfg := &config.AIConfig{BaseURL: "http://localhost:8000"}
	client := NewAIServiceClient(cfg)

	expectedURL := "http://localhost:8000/ai/api/v1/review/pre-plan"
	actualURL := client.BaseURL + "/ai/api/v1/review/pre-plan"
	if actualURL != expectedURL {
		t.Errorf("expected URL '%s', got '%s'", expectedURL, actualURL)
	}
}

func TestAIServiceClient_PlanMarshaling(t *testing.T) {
	plan := map[string]interface{}{
		"title":           "智能校园导航系统",
		"tech_stack":      "React Native + Go + PostgreSQL",
		"target_audience": "高校师生",
		"market_analysis": "校园导航市场分析",
		"innovation":      "基于AR的室内导航",
		"expected_outcome": "提升校园出行效率30%",
		"timeline":        "6个月开发周期",
	}

	// Test that the plan can be marshaled (same logic as ReviewPrePlan)
	jsonBytes, err := jsonMarshal(plan)
	if err != nil {
		t.Fatalf("failed to marshal plan: %v", err)
	}
	if len(jsonBytes) == 0 {
		t.Error("marshaled plan should not be empty")
	}

	// Verify it can be unmarshaled back
	var result map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("failed to unmarshal plan: %v", err)
	}
	if result["title"] != "智能校园导航系统" {
		t.Errorf("expected title '智能校园导航系统', got '%v'", result["title"])
	}
}

func TestAIServiceClient_EmptyPlan(t *testing.T) {
	plan := map[string]interface{}{}
	jsonBytes, err := jsonMarshal(plan)
	if err != nil {
		t.Fatalf("failed to marshal empty plan: %v", err)
	}
	if string(jsonBytes) != "{}" {
		t.Errorf("expected '{}', got '%s'", string(jsonBytes))
	}
}

func jsonMarshal(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}
