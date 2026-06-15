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
		ID:          1,
		Title:       "Test Competition",
		Description: "A test competition",
		Type:        CompTypeHackathon,
		Status:      CompStatusDraft,
		MaxTeamSize: 5,
		MinTeamSize: 1,
		StartDate:   now,
		EndDate:     now.Add(48 * time.Hour),
		Location:    "Online",
		Tags:        "test,go",
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
}
