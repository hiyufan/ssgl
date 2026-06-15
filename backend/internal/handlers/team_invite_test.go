package handlers

import (
	"testing"
	"time"

	"github.com/ssgl/competition-platform/internal/models"
)

func TestInviteRequest_Fields(t *testing.T) {
	req := InviteByUsernameRequest{
		Username: "testuser",
		Message:  "欢迎加入我们的团队！",
	}
	if req.Username != "testuser" {
		t.Errorf("expected Username='testuser', got '%s'", req.Username)
	}
	if req.Message != "欢迎加入我们的团队！" {
		t.Errorf("expected Message='欢迎加入我们的团队！', got '%s'", req.Message)
	}
}

func TestInviteByUsernameRequest_EmptyMessage(t *testing.T) {
	req := InviteByUsernameRequest{
		Username: "testuser",
		Message:  "",
	}
	// Message is optional
	if req.Username != "testuser" {
		t.Errorf("expected Username='testuser', got '%s'", req.Username)
	}
}

func TestGenerateInviteCode(t *testing.T) {
	code := models.GenerateInviteCode()
	if len(code) != 16 {
		t.Errorf("expected 16-char code, got %d chars: '%s'", len(code), code)
	}

	// Two codes should be different
	code2 := models.GenerateInviteCode()
	if code == code2 {
		t.Error("two consecutive codes should be different")
	}
}

func TestTeamInviteStatusConstants(t *testing.T) {
	if models.TeamInviteStatusPending != "pending" {
		t.Errorf("expected pending, got %s", models.TeamInviteStatusPending)
	}
	if models.TeamInviteStatusAccepted != "accepted" {
		t.Errorf("expected accepted, got %s", models.TeamInviteStatusAccepted)
	}
	if models.TeamInviteStatusDeclined != "declined" {
		t.Errorf("expected declined, got %s", models.TeamInviteStatusDeclined)
	}
	if models.TeamInviteStatusExpired != "expired" {
		t.Errorf("expected expired, got %s", models.TeamInviteStatusExpired)
	}
}

func TestTeamInvite_Fields(t *testing.T) {
	now := time.Now()
	invite := models.TeamInvite{
		ID:        1,
		TeamID:    10,
		InviterID: 1,
		InviteeID: 2,
		Code:      "abc123def456",
		Status:    models.TeamInviteStatusPending,
		Message:   "join us",
		ExpiresAt: now.Add(7 * 24 * time.Hour),
		CreatedAt: now,
	}

	if invite.TeamID != 10 {
		t.Errorf("expected TeamID=10, got %d", invite.TeamID)
	}
	if invite.InviterID != 1 {
		t.Errorf("expected InviterID=1, got %d", invite.InviterID)
	}
	if invite.InviteeID != 2 {
		t.Errorf("expected InviteeID=2, got %d", invite.InviteeID)
	}
	if invite.Status != "pending" {
		t.Errorf("expected Status='pending', got '%s'", invite.Status)
	}
	if !invite.ExpiresAt.After(now) {
		t.Error("expected ExpiresAt to be in the future")
	}
}
