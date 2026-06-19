package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func setupBatchRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewBatchHandler()
	r.POST("/api/v1/competitions/batch-publish", h.BatchPublish)
	r.POST("/api/v1/competitions/batch-close", h.BatchClose)
	r.POST("/api/v1/competitions/batch-delete", h.BatchDelete)
	return r
}

func TestBatchPublish_EmptyBody(t *testing.T) {
	r := setupBatchRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/competitions/batch-publish", bytes.NewBufferString("{}"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBatchPublish_EmptyIDs(t *testing.T) {
	r := setupBatchRouter()
	body, _ := json.Marshal(map[string]interface{}{"ids": []int{}})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/competitions/batch-publish", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBatchClose_EmptyBody(t *testing.T) {
	r := setupBatchRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/competitions/batch-close", bytes.NewBufferString("{}"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBatchDelete_EmptyBody(t *testing.T) {
	r := setupBatchRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/competitions/batch-delete", bytes.NewBufferString("{}"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestBatchResult_Structure(t *testing.T) {
	result := BatchResult{
		Success:     []uint{1, 2},
		Failed:      []uint{3},
		Succeeded:   2,
		FailedCount: 1,
		Message:     "test",
	}
	if result.Succeeded != 2 {
		t.Errorf("expected 2 succeeded, got %d", result.Succeeded)
	}
	if result.FailedCount != 1 {
		t.Errorf("expected 1 failed, got %d", result.FailedCount)
	}
	if result.Message != "test" {
		t.Errorf("expected message 'test', got %s", result.Message)
	}
}

func TestBatchPublishRequest_Structure(t *testing.T) {
	var req BatchPublishRequest
	data := []byte(`{"ids": [1, 2, 3]}`)
	if err := json.Unmarshal(data, &req); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(req.IDs) != 3 {
		t.Errorf("expected 3 IDs, got %d", len(req.IDs))
	}
	if req.IDs[0] != 1 || req.IDs[1] != 2 || req.IDs[2] != 3 {
		t.Errorf("IDs mismatch: %v", req.IDs)
	}
}

func TestBatchPublishRequest_EmptyJSON(t *testing.T) {
	var req BatchPublishRequest
	data := []byte(`{}`)
	if err := json.Unmarshal(data, &req); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(req.IDs) != 0 {
		t.Errorf("expected 0 IDs, got %d", len(req.IDs))
	}
}

func TestBatchHandler_Created(t *testing.T) {
	h := NewBatchHandler()
	if h == nil {
		t.Error("expected non-nil handler")
	}
}
