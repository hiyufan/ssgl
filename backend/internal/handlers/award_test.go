package handlers

import (
	"testing"
)

func TestCreateAwardRequest_Fields(t *testing.T) {
	req := CreateAwardRequest{
		CompetitionID: 10,
		TeamID:        5,
		Rank:          1,
		RankName:      "一等奖",
		PrizeName:     "最佳创新奖",
		PrizeAmount:   5000.00,
	}

	if req.CompetitionID != 10 {
		t.Errorf("expected CompetitionID=10, got %d", req.CompetitionID)
	}
	if req.TeamID != 5 {
		t.Errorf("expected TeamID=5, got %d", req.TeamID)
	}
	if req.Rank != 1 {
		t.Errorf("expected Rank=1, got %d", req.Rank)
	}
	if req.RankName != "一等奖" {
		t.Errorf("expected RankName='一等奖', got '%s'", req.RankName)
	}
	if req.PrizeName != "最佳创新奖" {
		t.Errorf("expected PrizeName='最佳创新奖', got '%s'", req.PrizeName)
	}
	if req.PrizeAmount != 5000.00 {
		t.Errorf("expected PrizeAmount=5000.00, got %f", req.PrizeAmount)
	}
}

func TestCreateAwardRequest_DefaultValues(t *testing.T) {
	req := CreateAwardRequest{
		CompetitionID: 1,
		TeamID:        1,
	}

	if req.Rank != 0 {
		t.Errorf("expected default Rank=0, got %d", req.Rank)
	}
	if req.RankName != "" {
		t.Errorf("expected empty RankName, got '%s'", req.RankName)
	}
	if req.PrizeName != "" {
		t.Errorf("expected empty PrizeName, got '%s'", req.PrizeName)
	}
	if req.PrizeAmount != 0 {
		t.Errorf("expected default PrizeAmount=0, got %f", req.PrizeAmount)
	}
}

func TestSettleAwardRequest_Fields(t *testing.T) {
	req := SettleAwardRequest{
		PrizeAmount: 3000.50,
	}

	if req.PrizeAmount != 3000.50 {
		t.Errorf("expected PrizeAmount=3000.50, got %f", req.PrizeAmount)
	}
}

func TestSettleAwardRequest_ZeroAmount(t *testing.T) {
	req := SettleAwardRequest{
		PrizeAmount: 0,
	}

	if req.PrizeAmount != 0 {
		t.Errorf("expected PrizeAmount=0, got %f", req.PrizeAmount)
	}
}
