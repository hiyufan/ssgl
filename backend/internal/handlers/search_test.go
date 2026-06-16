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
	if r.Desc != "全国软件大赛" {
		t.Errorf("expected desc=全国软件大赛, got %s", r.Desc)
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

func TestSearchResponse_Empty(t *testing.T) {
	resp := SearchResponse{
		Results: []SearchResult{},
		Total:   0,
		Query:   "nonexistent",
	}
	if resp.Total != 0 {
		t.Errorf("expected total=0, got %d", resp.Total)
	}
	if len(resp.Results) != 0 {
		t.Errorf("expected 0 results, got %d", len(resp.Results))
	}
}

func TestSearchResponse_MultipleResults(t *testing.T) {
	resp := SearchResponse{
		Results: []SearchResult{
			{Type: "competition", ID: 1, Title: "蓝桥杯", Desc: "软件大赛"},
			{Type: "team", ID: 2, Title: "蓝桥杯战队", Desc: "团队"},
			{Type: "user", ID: 3, Title: "张三", Desc: "软件工程"},
		},
		Total: 3,
		Query: "蓝桥杯",
	}
	if resp.Total != 3 {
		t.Errorf("expected total=3, got %d", resp.Total)
	}
	if resp.Results[0].Type != "competition" {
		t.Errorf("expected first result type=competition, got %s", resp.Results[0].Type)
	}
	if resp.Results[1].Type != "team" {
		t.Errorf("expected second result type=team, got %s", resp.Results[1].Type)
	}
	if resp.Results[2].Type != "user" {
		t.Errorf("expected third result type=user, got %s", resp.Results[2].Type)
	}
}

func TestSearchResult_ZeroID(t *testing.T) {
	r := SearchResult{Type: "team", ID: 0, Title: "New Team"}
	if r.ID != 0 {
		t.Errorf("expected id=0, got %d", r.ID)
	}
}

func TestSearchResult_EmptyDesc(t *testing.T) {
	r := SearchResult{Type: "user", ID: 1, Title: "Test", Desc: ""}
	if r.Desc != "" {
		t.Errorf("expected empty desc, got %s", r.Desc)
	}
}

func TestSearchResponse_QueryPreserved(t *testing.T) {
	query := "数学建模 国赛"
	resp := SearchResponse{
		Results: []SearchResult{},
		Total:   0,
		Query:   query,
	}
	if resp.Query != query {
		t.Errorf("expected query=%s, got %s", query, resp.Query)
	}
}
