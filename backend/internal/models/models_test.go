package models

import (
	"testing"
	"time"
)

func TestUser_RoleConstants(t *testing.T) {
	if RoleStudent != "student" {
		t.Errorf("expected RoleStudent='student', got '%s'", RoleStudent)
	}
	if RoleTeacher != "teacher" {
		t.Errorf("expected RoleTeacher='teacher', got '%s'", RoleTeacher)
	}
	if RoleAdmin != "admin" {
		t.Errorf("expected RoleAdmin='admin', got '%s'", RoleAdmin)
	}
}

func TestUser_StatusConstants(t *testing.T) {
	if StatusActive != "active" {
		t.Errorf("expected StatusActive='active', got '%s'", StatusActive)
	}
	if StatusDisabled != "disabled" {
		t.Errorf("expected StatusDisabled='disabled', got '%s'", StatusDisabled)
	}
}

func TestUser_Fields(t *testing.T) {
	now := time.Now()
	user := User{
		ID:        1,
		Username:  "testuser",
		Email:     "test@example.com",
		Password:  "hashed_password",
		Role:      RoleStudent,
		Name:      "Test User",
		Status:    StatusActive,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if user.Username != "testuser" {
		t.Errorf("expected username 'testuser', got '%s'", user.Username)
	}
	if user.Role != RoleStudent {
		t.Errorf("expected role '%s', got '%s'", RoleStudent, user.Role)
	}
	if user.Status != StatusActive {
		t.Errorf("expected status '%s', got '%s'", StatusActive, user.Status)
	}
}

func TestCompetition_StatusConstants(t *testing.T) {
	statuses := []struct {
		val      string
		expected string
	}{
		{CompStatusDraft, "draft"},
		{CompStatusPublished, "published"},
		{CompStatusOngoing, "ongoing"},
		{CompStatusCompleted, "completed"},
		{CompStatusCancelled, "cancelled"},
	}
	for _, s := range statuses {
		if s.val != s.expected {
			t.Errorf("expected %s, got %s", s.expected, s.val)
		}
	}
}

func TestCompetition_TypeConstants(t *testing.T) {
	types := []struct {
		val      string
		expected string
	}{
		{CompTypeHackathon, "hackathon"},
		{CompTypeInnovation, "innovation"},
		{CompTypeResearch, "research"},
		{CompTypeBusinessPlan, "business_plan"},
		{CompTypeAIInnovation, "ai_innovation"},
		{CompTypeDataScience, "data_science"},
	}
	for _, tt := range types {
		if tt.val != tt.expected {
			t.Errorf("expected %s, got %s", tt.expected, tt.val)
		}
	}
}

func TestCompetition_Fields(t *testing.T) {
	now := time.Now()
	comp := Competition{
		ID:            1,
		Title:         "Test Competition",
		Description:   "A test competition",
		Type:          CompTypeHackathon,
		Status:        CompStatusDraft,
		MaxTeamSize:   5,
		MinTeamSize:   1,
		StartDate:     now,
		EndDate:       now.Add(48 * time.Hour),
		Location:      "Online",
		Tags:          "test,go",
		Level:         "national",
		Website:       "https://example.com",
		ContactName:   "张老师",
		ContactEmail:  "zhang@example.edu.cn",
	}

	if comp.Title != "Test Competition" {
		t.Errorf("expected title 'Test Competition', got '%s'", comp.Title)
	}
	if comp.Type != CompTypeHackathon {
		t.Errorf("expected type '%s', got '%s'", CompTypeHackathon, comp.Type)
	}
	if comp.Status != CompStatusDraft {
		t.Errorf("expected status '%s', got '%s'", CompStatusDraft, comp.Status)
	}
	if comp.MaxTeamSize != 5 {
		t.Errorf("expected max_team_size 5, got %d", comp.MaxTeamSize)
	}
	if !comp.StartDate.Before(comp.EndDate) {
		t.Error("expected StartDate before EndDate")
	}
	if comp.Level != "national" {
		t.Errorf("expected level 'national', got '%s'", comp.Level)
	}
	if comp.Website != "https://example.com" {
		t.Errorf("expected website 'https://example.com', got '%s'", comp.Website)
	}
	if comp.ContactName != "张老师" {
		t.Errorf("expected contact_name '张老师', got '%s'", comp.ContactName)
	}
	if comp.ContactEmail != "zhang@example.edu.cn" {
		t.Errorf("expected contact_email 'zhang@example.edu.cn', got '%s'", comp.ContactEmail)
	}
}

func TestCompetition_NewTypes(t *testing.T) {
	compTypes := []struct {
		typ      string
		expected string
	}{
		{CompTypeBusinessPlan, "business_plan"},
		{CompTypeAIInnovation, "ai_innovation"},
		{CompTypeDataScience, "data_science"},
	}
	for _, ct := range compTypes {
		comp := Competition{Type: ct.typ}
		if comp.Type != ct.expected {
			t.Errorf("expected type=%s, got %s", ct.expected, comp.Type)
		}
	}
}

// Team model tests
func TestTeam_Fields(t *testing.T) {
	team := Team{
		ID:            1,
		Name:          "Code Masters",
		CompetitionID: 10,
		LeaderID:      5,
		Status:        "active",
	}
	if team.Name != "Code Masters" {
		t.Errorf("expected team name 'Code Masters', got '%s'", team.Name)
	}
	if team.CompetitionID != 10 {
		t.Errorf("expected CompetitionID 10, got %d", team.CompetitionID)
	}
	if team.LeaderID != 5 {
		t.Errorf("expected LeaderID 5, got %d", team.LeaderID)
	}
}

func TestTeamMember_Fields(t *testing.T) {
	member := TeamMember{
		ID:     1,
		TeamID: 10,
		UserID: 5,
		Role:   "leader",
	}
	if member.TeamID != 10 {
		t.Errorf("expected TeamID 10, got %d", member.TeamID)
	}
	if member.Role != "leader" {
		t.Errorf("expected role 'leader', got '%s'", member.Role)
	}
}

// TeamInvite model tests
func TestTeamInvite_Fields(t *testing.T) {
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	invite := TeamInvite{
		ID:        1,
		TeamID:    10,
		InviterID: 1,
		InviteeID: 5,
		Code:      "abc123def456",
		Status:    "pending",
		Message:   "欢迎加入我们的团队",
		ExpiresAt: expiresAt,
	}
	if invite.TeamID != 10 {
		t.Errorf("expected TeamID 10, got %d", invite.TeamID)
	}
	if invite.Code != "abc123def456" {
		t.Errorf("expected code 'abc123def456', got '%s'", invite.Code)
	}
	if invite.Status != "pending" {
		t.Errorf("expected status 'pending', got '%s'", invite.Status)
	}
	if !invite.ExpiresAt.After(time.Now()) {
		t.Error("expected ExpiresAt to be in the future")
	}
}

// CompetitionRegistration model tests
func TestCompetitionRegistration_StatusConstants(t *testing.T) {
	statuses := []struct {
		val      string
		expected string
	}{
		{RegStatusPending, "pending"},
		{RegStatusApproved, "approved"},
		{RegStatusRejected, "rejected"},
		{RegStatusCancelled, "cancelled"},
	}
	for _, s := range statuses {
		if s.val != s.expected {
			t.Errorf("expected RegStatus '%s', got '%s'", s.expected, s.val)
		}
	}
}

func TestCompetitionRegistration_Fields(t *testing.T) {
	reg := CompetitionRegistration{
		ID:            1,
		CompetitionID: 10,
		UserID:        5,
		Status:        RegStatusPending,
		Remark:        "希望参加",
	}
	if reg.CompetitionID != 10 {
		t.Errorf("expected CompetitionID 10, got %d", reg.CompetitionID)
	}
	if reg.Status != RegStatusPending {
		t.Errorf("expected status '%s', got '%s'", RegStatusPending, reg.Status)
	}
}

// User profile fields test
func TestUser_ProfileFields(t *testing.T) {
	user := User{
		ID:       1,
		Username: "student1",
		Name:     "张三",
		Email:    "zhangsan@example.com",
		Phone:    "13800138000",
		Dept:     "计算机科学系",
		Avatar:   "https://example.com/avatar.png",
		Role:     RoleStudent,
	}
	if user.Phone != "13800138000" {
		t.Errorf("expected phone '13800138000', got '%s'", user.Phone)
	}
	if user.Dept != "计算机科学系" {
		t.Errorf("expected dept '计算机科学系', got '%s'", user.Dept)
	}
	if user.Avatar != "https://example.com/avatar.png" {
		t.Errorf("expected avatar URL, got '%s'", user.Avatar)
	}
}

func TestCompetitionSubscription_Fields(t *testing.T) {
	now := time.Now()
	sub := CompetitionSubscription{
		ID:               1,
		UserID:           10,
		CompetitionID:    100,
		RemindDaysBefore: 5,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if sub.UserID != 10 {
		t.Errorf("expected user_id 10, got %d", sub.UserID)
	}
	if sub.CompetitionID != 100 {
		t.Errorf("expected competition_id 100, got %d", sub.CompetitionID)
	}
	if sub.RemindDaysBefore != 5 {
		t.Errorf("expected remind_days_before 5, got %d", sub.RemindDaysBefore)
	}
}

func TestCompetitionSubscription_DefaultRemindDays(t *testing.T) {
	sub := CompetitionSubscription{
		UserID:        1,
		CompetitionID: 1,
	}
	// The struct default is 0 (GORM default:3 only applies at DB level).
	// Handler code enforces default of 3 when creating.
	if sub.RemindDaysBefore != 0 {
		t.Errorf("expected zero default in struct, got %d", sub.RemindDaysBefore)
	}
}

func TestCompetitionSubscription_LastRemindedAt_Nil(t *testing.T) {
	sub := CompetitionSubscription{
		UserID:        1,
		CompetitionID: 1,
	}
	if sub.LastRemindedAt != nil {
		t.Error("expected LastRemindedAt to be nil by default")
	}
}
