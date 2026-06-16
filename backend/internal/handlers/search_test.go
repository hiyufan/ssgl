package handlers

import (
	"testing"
)

func TestNewGlobalSearchHandler(t *testing.T) {
	h := NewGlobalSearchHandler()
	if h == nil {
		t.Error("expected non-nil handler")
	}
}

func TestSearchResult_Fields(t *testing.T) {
	r := SearchResult{
		Type:  "competition",
		ID:    1,
		Title: "蓝桥杯",
		Desc:  "全国软件大赛",
	}
	if r.Type != "competition" {
		t.Errorf("expected type=competition, got %s", r.Type)
	}
	if r.ID != 1 {
		t.Errorf("expected id=1, got %d", r.ID)
	}
	if r.Title != "蓝桥杯" {
		t.Errorf("expected title=蓝桥杯, got %s", r.Title)
	}
}

func TestSearchResult_Types(t *testing.T) {
	types := []string{"competition", "team", "user"}
	for _, typ := range types {
		r := SearchResult{Type: typ}
		if r.Type != typ {
			t.Errorf("expected type=%s, got %s", typ, r.Type)
		}
	}
}

func TestSearchResponse_Fields(t *testing.T) {
	resp := SearchResponse{
		Results: []SearchResult{{Type: "team", ID: 1, Title: "Test"}},
		Total:   1,
		Query:   "test",
	}
	if resp.Total != 1 {
		t.Errorf("expected total=1, got %d", resp.Total)
	}
	if resp.Query != "test" {
		t.Errorf("expected query=test, got %s", resp.Query)
	}
	if len(resp.Results) != 1 {
		t.Errorf("expected 1 result, got %d", len(resp.Results))
	}
}
