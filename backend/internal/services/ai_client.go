package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/ssgl/competition-platform/internal/config"
)

// AIServiceClient calls the Python AI micro-service with retry and basic circuit-breaker.
type AIServiceClient struct {
	BaseURL    string
	HTTPClient *http.Client

	// Circuit-breaker state (simple: track consecutive failures).
	mu              sync.Mutex
	consecFailures  int
	lastFailureTime time.Time
	circuitOpen     bool
	maxFailures     int           // open circuit after this many consecutive failures
	cooldown        time.Duration // how long to keep circuit open before half-open
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
			Timeout: 60 * time.Second, // per-request timeout
		},
		maxFailures: 5,
		cooldown:    30 * time.Second,
	}
}

// circuitAllows checks if a request should be attempted.
func (c *AIServiceClient) circuitAllows() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.circuitOpen {
		return true
	}
	// Half-open: after cooldown, allow one probe request.
	if time.Since(c.lastFailureTime) > c.cooldown {
		return true
	}
	return false
}

// circuitRecordSuccess resets failure counter.
func (c *AIServiceClient) circuitRecordSuccess() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.consecFailures = 0
	c.circuitOpen = false
}

// circuitRecordFailure increments failure counter; opens circuit if threshold exceeded.
func (c *AIServiceClient) circuitRecordFailure() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.consecFailures++
	c.lastFailureTime = time.Now()
	if c.consecFailures >= c.maxFailures {
		c.circuitOpen = true
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

	// Retry up to 2 times with exponential backoff.
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if !c.circuitAllows() {
			return nil, fmt.Errorf("ai service circuit breaker open — too many recent failures, retrying after cooldown")
		}

		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * 3 * time.Second)
		}

		req, err := http.NewRequest("POST", url, bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("create request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("ai service request: %w", err)
			c.circuitRecordFailure()
			continue
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("read response: %w", err)
			c.circuitRecordFailure()
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("ai service returned %d: %s", resp.StatusCode, string(respBody[:min(len(respBody), 200)]))
			c.circuitRecordFailure()
			continue
		}

		var result map[string]interface{}
		if err := json.Unmarshal(respBody, &result); err != nil {
			lastErr = fmt.Errorf("parse response: %w", err)
			c.circuitRecordFailure()
			continue
		}

		c.circuitRecordSuccess()
		return result, nil
	}

	return nil, lastErr
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
