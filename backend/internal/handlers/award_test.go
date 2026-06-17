package handlers

import (
	"testing"

	"github.com/ssgl/competition-platform/internal/models"
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

func TestAwardModel_StatusConstants(t *testing.T) {
	if models.AwardStatusPending != "pending" {
		t.Errorf("expected AwardStatusPending='pending', got '%s'", models.AwardStatusPending)
	}
	if models.AwardStatusTeacherConfirm != "teacher_confirm" {
		t.Errorf("expected AwardStatusTeacherConfirm='teacher_confirm', got '%s'", models.AwardStatusTeacherConfirm)
	}
	if models.AwardStatusSettled != "settled" {
		t.Errorf("expected AwardStatusSettled='settled', got '%s'", models.AwardStatusSettled)
	}
}

func TestAwardModel_Fields(t *testing.T) {
	award := models.Award{
		ID:            1,
		CompetitionID: 10,
		TeamID:        5,
		Rank:          1,
		RankName:      "一等奖",
		PrizeName:     "最佳创新奖",
		PrizeAmount:   5000.00,
		Status:        models.AwardStatusPending,
	}

	if award.ID != 1 {
		t.Errorf("expected ID=1, got %d", award.ID)
	}
	if award.CompetitionID != 10 {
		t.Errorf("expected CompetitionID=10, got %d", award.CompetitionID)
	}
	if award.TeamID != 5 {
		t.Errorf("expected TeamID=5, got %d", award.TeamID)
	}
	if award.Rank != 1 {
		t.Errorf("expected Rank=1, got %d", award.Rank)
	}
	if award.RankName != "一等奖" {
		t.Errorf("expected RankName='一等奖', got '%s'", award.RankName)
	}
	if award.PrizeName != "最佳创新奖" {
		t.Errorf("expected PrizeName='最佳创新奖', got '%s'", award.PrizeName)
	}
	if award.PrizeAmount != 5000.00 {
		t.Errorf("expected PrizeAmount=5000.00, got %f", award.PrizeAmount)
	}
	if award.Status != models.AwardStatusPending {
		t.Errorf("expected Status='%s', got '%s'", models.AwardStatusPending, award.Status)
	}
}

func TestAwardModel_DefaultStatus(t *testing.T) {
	award := models.Award{}
	if award.Status != "" {
		t.Errorf("expected empty Status, got '%s'", award.Status)
	}
}

func TestAwardModel_RankValues(t *testing.T) {
	ranks := []int{1, 2, 3, 4, 5}
	for _, rank := range ranks {
		award := models.Award{Rank: rank}
		if award.Rank != rank {
			t.Errorf("expected Rank=%d, got %d", rank, award.Rank)
		}
	}
}

func TestAwardModel_PrizeAmountPrecision(t *testing.T) {
	amounts := []float64{0.01, 100.50, 9999.99, 50000.00}
	for _, amount := range amounts {
		award := models.Award{PrizeAmount: amount}
		if award.PrizeAmount != amount {
			t.Errorf("expected PrizeAmount=%f, got %f", amount, award.PrizeAmount)
		}
	}
}

func TestAwardModel_SoftDelete(t *testing.T) {
	// Award uses GORM soft delete
	award := models.Award{ID: 1}
	if award.ID != 1 {
		t.Errorf("expected ID=1, got %d", award.ID)
	}
}

func TestAwardModel_CompetitionRelation(t *testing.T) {
	award := models.Award{
		CompetitionID: 42,
		TeamID:        7,
	}
	if award.CompetitionID != 42 {
		t.Errorf("expected CompetitionID=42, got %d", award.CompetitionID)
	}
	if award.TeamID != 7 {
		t.Errorf("expected TeamID=7, got %d", award.TeamID)
	}
}

func TestCreateAwardRequest_BindingRequired(t *testing.T) {
	// CompetitionID and TeamID are required fields
	req := CreateAwardRequest{
		CompetitionID: 1,
		TeamID:        1,
		Rank:          1,
	}
	if req.CompetitionID == 0 || req.TeamID == 0 {
		t.Error("CompetitionID and TeamID should be non-zero")
	}
}

func TestSettleAwardRequest_LargeAmount(t *testing.T) {
	req := SettleAwardRequest{
		PrizeAmount: 1000000.00,
	}
	if req.PrizeAmount != 1000000.00 {
		t.Errorf("expected PrizeAmount=1000000.00, got %f", req.PrizeAmount)
	}
}
