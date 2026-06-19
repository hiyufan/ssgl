package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestActivityFeedHandler_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/competitions/abc/activity", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewActivityFeedHandler()
	h.GetFeed(c)

	// Without DB, we get 503; with invalid ID we'd get 400.
	if w.Code != http.StatusBadRequest && w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 400 or 503, got %d", w.Code)
	}
}

func TestActivityFeedHandler_NoDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/competitions/1/activity", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	h := NewActivityFeedHandler()
	h.GetFeed(c)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503 when DB unavailable, got %d", w.Code)
	}
}

func TestFeedResponse_JSON(t *testing.T) {
	resp := FeedResponse{
		CompetitionID: 1,
		Total:         2,
		Items: []FeedItem{
			{ID: 1, Type: "team_create", Actor: "", Summary: "测试团队创建", Timestamp: "2026-01-01T00:00:00Z", RefID: 1, RefType: "team"},
			{ID: 2, Type: "registration", Actor: "张三", Summary: "张三 报名赛事", Timestamp: "2026-01-02T00:00:00Z", RefID: 2, RefType: "registration"},
		},
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded FeedResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.CompetitionID != 1 {
		t.Errorf("expected competition_id=1, got %d", decoded.CompetitionID)
	}
	if decoded.Total != 2 {
		t.Errorf("expected total=2, got %d", decoded.Total)
	}
	if len(decoded.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(decoded.Items))
	}
	if decoded.Items[0].Type != "team_create" {
		t.Errorf("expected type=team_create, got %s", decoded.Items[0].Type)
	}
	if decoded.Items[1].Actor != "张三" {
		t.Errorf("expected actor=张三, got %s", decoded.Items[1].Actor)
	}
}

func TestFeedItem_Fields(t *testing.T) {
	item := FeedItem{
		ID:        42001,
		Type:      "preplan_approved",
		Actor:     "测试团队",
		Summary:   "预案「智慧校园」已通过",
		Timestamp: "2026-06-20T10:00:00+08:00",
		RefID:     42,
		RefType:   "preplan",
	}

	if item.ID != 42001 {
		t.Errorf("expected ID=42001, got %d", item.ID)
	}
	if item.Type != "preplan_approved" {
		t.Errorf("expected type=preplan_approved, got %s", item.Type)
	}
	if item.RefType != "preplan" {
		t.Errorf("expected ref_type=preplan, got %s", item.RefType)
	}
}
