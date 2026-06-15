package handlers

import (
	"testing"
)

func TestNewProfileHandler(t *testing.T) {
	h := NewProfileHandler()
	if h == nil {
		t.Fatal("NewProfileHandler returned nil")
	}
}

func TestUserProfileFields(t *testing.T) {
	p := UserProfile{
		ID:           1,
		Username:     "testuser",
		Name:         "Test User",
		Email:        "test@example.com",
		Role:         "student",
		Dept:         "计算机科学",
		StudentNo:    "2024001",
		Phone:        "13800138000",
		Avatar:       "",
		CreatedAt:    "2026-01-01",
		TeamCount:    3,
		AwardCount:   2,
		PrePlanCount: 5,
		CompCount:    4,
	}

	if p.ID != 1 {
		t.Errorf("expected ID=1, got %d", p.ID)
	}
	if p.Username != "testuser" {
		t.Errorf("expected username=testuser, got %s", p.Username)
	}
	if p.TeamCount != 3 {
		t.Errorf("expected team_count=3, got %d", p.TeamCount)
	}
	if p.AwardCount != 2 {
		t.Errorf("expected award_count=2, got %d", p.AwardCount)
	}
	if p.PrePlanCount != 5 {
		t.Errorf("expected pre_plan_count=5, got %d", p.PrePlanCount)
	}
	if p.CompCount != 4 {
		t.Errorf("expected competition_count=4, got %d", p.CompCount)
	}
}

func TestUpdateProfileRequestFields(t *testing.T) {
	name := "New Name"
	email := "new@example.com"
	phone := "13900139000"
	dept := "软件工程"
	avatar := "https://example.com/avatar.png"

	req := UpdateProfileRequest{
		Name:   &name,
		Email:  &email,
		Phone:  &phone,
		Dept:   &dept,
		Avatar: &avatar,
	}

	if *req.Name != "New Name" {
		t.Errorf("expected name=New Name, got %s", *req.Name)
	}
	if *req.Email != "new@example.com" {
		t.Errorf("expected email=new@example.com, got %s", *req.Email)
	}
	if *req.Phone != "13900139000" {
		t.Errorf("expected phone=13900139000, got %s", *req.Phone)
	}
	if *req.Dept != "软件工程" {
		t.Errorf("expected dept=软件工程, got %s", *req.Dept)
	}
	if *req.Avatar != "https://example.com/avatar.png" {
		t.Errorf("expected avatar=url, got %s", *req.Avatar)
	}
}

func TestUpdateProfileRequestNilFields(t *testing.T) {
	req := UpdateProfileRequest{}
	if req.Name != nil {
		t.Error("expected nil name")
	}
	if req.Email != nil {
		t.Error("expected nil email")
	}
	if req.Phone != nil {
		t.Error("expected nil phone")
	}
	if req.Dept != nil {
		t.Error("expected nil dept")
	}
	if req.Avatar != nil {
		t.Error("expected nil avatar")
	}
}
