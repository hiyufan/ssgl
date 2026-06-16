package models

import (
	"testing"
	"time"

	"gorm.io/gorm"
)

func TestAward_StatusConstants(t *testing.T) {
	statuses := []struct {
		val      string
		expected string
	}{
		{AwardStatusPending, "pending"},
		{AwardStatusTeacherConfirm, "teacher_confirm"},
		{AwardStatusSettled, "settled"},
	}
	for _, s := range statuses {
		if s.val != s.expected {
			t.Errorf("expected %s, got %s", s.expected, s.val)
		}
	}
}

func TestAward_Fields(t *testing.T) {
	now := time.Now()
	settledAt := now.Add(24 * time.Hour)
	settledBy := uint(1)
	award := Award{
		ID:            1,
		CompetitionID: 10,
		TeamID:        20,
		Rank:          1,
		RankName:      "一等奖",
		PrizeName:     "最佳创新奖",
		PrizeAmount:   5000.0,
		Status:        AwardStatusSettled,
		NominatedAt:   now,
		SettledAt:     &settledAt,
		SettledBy:     &settledBy,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if award.CompetitionID != 10 {
		t.Errorf("expected competition_id 10, got %d", award.CompetitionID)
	}
	if award.TeamID != 20 {
		t.Errorf("expected team_id 20, got %d", award.TeamID)
	}
	if award.Rank != 1 {
		t.Errorf("expected rank 1, got %d", award.Rank)
	}
	if award.RankName != "一等奖" {
		t.Errorf("expected rank_name '一等奖', got '%s'", award.RankName)
	}
	if award.PrizeAmount != 5000.0 {
		t.Errorf("expected prize_amount 5000.0, got %f", award.PrizeAmount)
	}
	if award.Status != AwardStatusSettled {
		t.Errorf("expected status '%s', got '%s'", AwardStatusSettled, award.Status)
	}
	if award.SettledAt == nil {
		t.Error("expected settled_at to be set")
	}
	if award.SettledBy == nil || *award.SettledBy != 1 {
		t.Error("expected settled_by to be 1")
	}
}

func TestAward_DefaultValues(t *testing.T) {
	award := Award{}
	if award.Status != "" {
		t.Errorf("expected empty default status, got '%s'", award.Status)
	}
	if award.Rank != 0 {
		t.Errorf("expected default rank 0, got %d", award.Rank)
	}
	if award.PrizeAmount != 0 {
		t.Errorf("expected default prize_amount 0, got %f", award.PrizeAmount)
	}
	if award.SettledAt != nil {
		t.Error("expected settled_at to be nil by default")
	}
}

func TestAward_SoftDelete(t *testing.T) {
	award := Award{ID: 1}
	if award.DeletedAt.Valid {
		t.Error("expected DeletedAt to be zero value (not deleted)")
	}
	award.DeletedAt = gorm.DeletedAt{Time: time.Now(), Valid: true}
	if !award.DeletedAt.Valid {
		t.Error("expected DeletedAt to be valid after setting")
	}
}
