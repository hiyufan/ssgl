package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ssgl/competition-platform/internal/config"
)

// AIServiceClient calls the Python AI micro-service.
type AIServiceClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewAIServiceClient creates a client from the app config.
func NewAIServiceClient(cfg *config.AIConfig) *AIServiceClient {
	base := cfg.BaseURL
	if base == "" {
		base = "http://localhost:8000"
	}
	return &AIServiceClient{
		BaseURL: base,
		HTTPClient: &http.Client{
			Timeout: 120 * time.Second, // AI review can be slow
		},
	}
}

// ReviewPrePlan calls POST /ai/api/v1/review/pre-plan with the plan data
// and returns the AI review result (score, breakdown, summary, suggestions).
func (c *AIServiceClient) ReviewPrePlan(plan map[string]interface{}) (map[string]interface{}, error) {
	body, err := json.Marshal(plan)
	if err != nil {
		return nil, fmt.Errorf("marshal plan: %w", err)
	}

	url := fmt.Sprintf("%s/ai/api/v1/review/pre-plan", c.BaseURL)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai service request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai service returned %d: %s", resp.StatusCode, string(respBody[:min(len(respBody), 200)]))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return result, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
