package handlers

import (
	"testing"
)

func TestNewShowcaseHandler(t *testing.T) {
	h := NewShowcaseHandler()
	if h == nil {
		t.Fatal("NewShowcaseHandler returned nil")
	}
}

func TestShowcaseEntry_Fields(t *testing.T) {
	entry := ShowcaseEntry{
		ID:              1,
		CompetitionID:   10,
		CompetitionName: "测试赛事",
		CompType:        "hackathon",
		TeamID:          5,
		TeamName:        "测试团队",
		LeaderName:      "张三",
		Rank:            1,
		RankName:        "一等奖",
		PrizeName:       "最佳创新奖",
		PrizeAmount:     5000.00,
		SettledAt:       "2026-06-15",
	}

	if entry.CompetitionName != "测试赛事" {
		t.Errorf("expected CompetitionName '测试赛事', got '%s'", entry.CompetitionName)
	}
	if entry.Rank != 1 {
		t.Errorf("expected Rank 1, got %d", entry.Rank)
	}
	if entry.PrizeAmount != 5000.00 {
		t.Errorf("expected PrizeAmount 5000, got %f", entry.PrizeAmount)
	}
}

func TestShowcaseResponse_Fields(t *testing.T) {
	resp := ShowcaseResponse{
		Entries:     []ShowcaseEntry{{ID: 1}, {ID: 2}},
		TotalAwards: 2,
		TotalPrize:  10000,
		TotalTeams:  2,
		CompCount:   1,
		TopTeams:    []ShowcaseEntry{{ID: 1}},
	}

	if resp.TotalAwards != 2 {
		t.Errorf("expected TotalAwards 2, got %d", resp.TotalAwards)
	}
	if len(resp.Entries) != 2 {
		t.Errorf("expected 2 entries, got %d", len(resp.Entries))
	}
	if len(resp.TopTeams) != 1 {
		t.Errorf("expected 1 top team, got %d", len(resp.TopTeams))
	}
}

func TestShowcaseEntry_ZeroPrizeAmount(t *testing.T) {
	entry := ShowcaseEntry{
		ID:          99,
		PrizeAmount: 0,
		Rank:        3,
		RankName:    "三等奖",
	}
	if entry.PrizeAmount != 0 {
		t.Errorf("expected 0 prize, got %f", entry.PrizeAmount)
	}
	if entry.Rank != 3 {
		t.Errorf("expected rank 3, got %d", entry.Rank)
	}
}

func TestShowcaseResponse_Empty(t *testing.T) {
	resp := ShowcaseResponse{
		Entries:     []ShowcaseEntry{},
		TotalAwards: 0,
		TotalPrize:  0,
		TotalTeams:  0,
		CompCount:   0,
		TopTeams:    []ShowcaseEntry{},
	}
	if len(resp.Entries) != 0 {
		t.Errorf("expected 0 entries, got %d", len(resp.Entries))
	}
	if resp.TotalPrize != 0 {
		t.Errorf("expected 0 total prize, got %f", resp.TotalPrize)
	}
}

func TestShowcaseEntry_MultipleCompTypes(t *testing.T) {
	types := []string{"hackathon", "innovation", "research", "business_plan", "ai_innovation", "data_science"}
	for _, ct := range types {
		entry := ShowcaseEntry{CompType: ct}
		if entry.CompType != ct {
			t.Errorf("expected CompType=%s, got %s", ct, entry.CompType)
		}
	}
}
