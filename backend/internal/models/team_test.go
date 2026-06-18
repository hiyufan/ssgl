package models

import (
	"testing"
	"time"

	"gorm.io/gorm"
)

// --- Team status constants ---

func TestTeam_StatusConstants(t *testing.T) {
	statuses := []struct {
		val      string
		expected string
	}{
		{TeamStatusActive, "active"},
		{TeamStatusCompleted, "completed"},
	}
	for _, s := range statuses {
		if s.val != s.expected {
			t.Errorf("expected %s, got %s", s.expected, s.val)
		}
	}
}

// --- TeamMember role constants ---

func TestTeamMember_RoleConstants(t *testing.T) {
	roles := []struct {
		val      string
		expected string
	}{
		{TeamMemberRoleLeader, "leader"},
		{TeamMemberRoleMember, "member"},
	}
	for _, r := range roles {
		if r.val != r.expected {
			t.Errorf("expected %s, got %s", r.expected, r.val)
		}
	}
}

// --- Team struct initialization ---

func TestTeam_InitializeAllFields(t *testing.T) {
	now := time.Now()
	team := Team{
		ID:            1,
		Name:          "Alpha Team",
		CompetitionID: 100,
		LeaderID:      10,
		Status:        TeamStatusActive,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if team.ID != 1 {
		t.Errorf("expected ID 1, got %d", team.ID)
	}
	if team.Name != "Alpha Team" {
		t.Errorf("expected Name 'Alpha Team', got '%s'", team.Name)
	}
	if team.CompetitionID != 100 {
		t.Errorf("expected CompetitionID 100, got %d", team.CompetitionID)
	}
	if team.LeaderID != 10 {
		t.Errorf("expected LeaderID 10, got %d", team.LeaderID)
	}
	if team.Status != TeamStatusActive {
		t.Errorf("expected Status '%s', got '%s'", TeamStatusActive, team.Status)
	}
	if team.CreatedAt != now {
		t.Error("expected CreatedAt to match")
	}
	if team.UpdatedAt != now {
		t.Error("expected UpdatedAt to match")
	}
}

func TestTeam_DefaultDeletedAt(t *testing.T) {
	team := Team{}
	if team.DeletedAt.Valid {
		t.Error("expected DeletedAt to be zero (not deleted) by default")
	}
}

func TestTeam_SetDeletedAt(t *testing.T) {
	team := Team{ID: 1}
	team.DeletedAt = gorm.DeletedAt{Time: time.Now(), Valid: true}
	if !team.DeletedAt.Valid {
		t.Error("expected DeletedAt to be valid after setting")
	}
}

func TestTeam_DefaultStatus(t *testing.T) {
	team := Team{}
	// Zero value string is empty
	if team.Status != "" {
		t.Errorf("expected empty default Status, got '%s'", team.Status)
	}
}

// --- TeamMember struct initialization ---

func TestTeamMember_InitializeAllFields(t *testing.T) {
	now := time.Now()
	member := TeamMember{
		ID:       1,
		TeamID:   10,
		UserID:   5,
		Role:     TeamMemberRoleLeader,
		JoinedAt: now,
	}

	if member.ID != 1 {
		t.Errorf("expected ID 1, got %d", member.ID)
	}
	if member.TeamID != 10 {
		t.Errorf("expected TeamID 10, got %d", member.TeamID)
	}
	if member.UserID != 5 {
		t.Errorf("expected UserID 5, got %d", member.UserID)
	}
	if member.Role != TeamMemberRoleLeader {
		t.Errorf("expected Role '%s', got '%s'", TeamMemberRoleLeader, member.Role)
	}
	if member.JoinedAt != now {
		t.Error("expected JoinedAt to match")
	}
}

func TestTeamMember_MemberRole(t *testing.T) {
	member := TeamMember{
		TeamID: 1,
		UserID: 2,
		Role:   TeamMemberRoleMember,
	}
	if member.Role != "member" {
		t.Errorf("expected role 'member', got '%s'", member.Role)
	}
}

func TestTeamMember_DefaultRole(t *testing.T) {
	member := TeamMember{}
	if member.Role != "" {
		t.Errorf("expected empty default Role, got '%s'", member.Role)
	}
}

// --- Team with Members slice ---

func TestTeam_WithMembers(t *testing.T) {
	team := Team{
		ID:   1,
		Name: "Test Team",
		Members: []TeamMember{
			{ID: 1, TeamID: 1, UserID: 10, Role: TeamMemberRoleLeader},
			{ID: 2, TeamID: 1, UserID: 20, Role: TeamMemberRoleMember},
			{ID: 3, TeamID: 1, UserID: 30, Role: TeamMemberRoleMember},
		},
	}

	if len(team.Members) != 3 {
		t.Fatalf("expected 3 members, got %d", len(team.Members))
	}
	if team.Members[0].Role != TeamMemberRoleLeader {
		t.Errorf("expected first member to be leader, got '%s'", team.Members[0].Role)
	}
	if team.Members[1].UserID != 20 {
		t.Errorf("expected second member UserID 20, got %d", team.Members[1].UserID)
	}
}

// --- TeamInvite status constants ---

func TestTeamInvite_StatusConstants(t *testing.T) {
	statuses := []struct {
		val      string
		expected string
	}{
		{TeamInviteStatusPending, "pending"},
		{TeamInviteStatusAccepted, "accepted"},
		{TeamInviteStatusDeclined, "declined"},
		{TeamInviteStatusExpired, "expired"},
	}
	for _, s := range statuses {
		if s.val != s.expected {
			t.Errorf("expected %s, got %s", s.expected, s.val)
		}
	}
}

// --- TeamInvite struct ---

func TestTeamInvite_FullFields(t *testing.T) {
	expiresAt := time.Now().Add(24 * time.Hour)
	invite := TeamInvite{
		ID:        1,
		TeamID:    10,
		InviterID: 5,
		InviteeID: 20,
		Code:      "abcdef1234567890",
		Status:    TeamInviteStatusPending,
		Message:   "欢迎加入",
		ExpiresAt: expiresAt,
	}

	if invite.TeamID != 10 {
		t.Errorf("expected TeamID 10, got %d", invite.TeamID)
	}
	if invite.InviterID != 5 {
		t.Errorf("expected InviterID 5, got %d", invite.InviterID)
	}
	if invite.InviteeID != 20 {
		t.Errorf("expected InviteeID 20, got %d", invite.InviteeID)
	}
	if invite.Status != TeamInviteStatusPending {
		t.Errorf("expected Status '%s', got '%s'", TeamInviteStatusPending, invite.Status)
	}
	if !invite.ExpiresAt.After(time.Now()) {
		t.Error("expected ExpiresAt to be in the future")
	}
}

func TestTeamInvite_DefaultDeletedAt(t *testing.T) {
	invite := TeamInvite{}
	if invite.DeletedAt.Valid {
		t.Error("expected DeletedAt to be zero by default")
	}
}

// --- GenerateInviteCode tests ---

func TestGenerateInviteCode_Length(t *testing.T) {
	code := GenerateInviteCode()
	if len(code) != 16 {
		t.Errorf("expected code length 16, got %d", len(code))
	}
}

func TestGenerateInviteCode_Unique(t *testing.T) {
	code1 := GenerateInviteCode()
	code2 := GenerateInviteCode()
	if code1 == code2 {
		t.Error("expected two invite codes to be different")
	}
}

func TestGenerateInviteCode_HexChars(t *testing.T) {
	code := GenerateInviteCode()
	for _, c := range code {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
			t.Errorf("expected hex character, got '%c' in code '%s'", c, code)
			break
		}
	}
}
