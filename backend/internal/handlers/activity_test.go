package handlers

import (
	"testing"
)

func TestActivityItem_Fields(t *testing.T) {
	item := ActivityItem{
		ID:        42,
		Type:      "competition",
		Title:     "蓝桥杯",
		Detail:    "赛事类型: hackathon, 状态: published",
		UserID:    1,
		UserName:  "刘志远",
		CreatedAt: "2026-06-16 10:00",
	}

	if item.ID != 42 {
		t.Errorf("expected ID=42, got %d", item.ID)
	}
	if item.Type != "competition" {
		t.Errorf("expected type=competition, got %s", item.Type)
	}
	if item.Title != "蓝桥杯" {
		t.Errorf("expected title=蓝桥杯, got %s", item.Title)
	}
	if item.UserName != "刘志远" {
		t.Errorf("expected UserName=刘志远, got %s", item.UserName)
	}
}

func TestActivityItem_Types(t *testing.T) {
	validTypes := []string{"competition", "team", "award", "preplan", "evaluation"}
	for _, vt := range validTypes {
		item := ActivityItem{Type: vt}
		if item.Type != vt {
			t.Errorf("expected type=%s, got %s", vt, item.Type)
		}
	}
}

func TestUserActivityItem_Fields(t *testing.T) {
	item := UserActivityItem{
		ID:        10,
		Type:      "team",
		Title:     "加入团队: AI先锋队",
		Detail:    "赛事: 蓝桥杯",
		CreatedAt: "2026-06-16 10:00",
	}

	if item.ID != 10 {
		t.Errorf("expected ID=10, got %d", item.ID)
	}
	if item.Type != "team" {
		t.Errorf("expected type=team, got %s", item.Type)
	}
	if item.Title != "加入团队: AI先锋队" {
		t.Errorf("expected correct title, got %s", item.Title)
	}
	if item.Detail != "赛事: 蓝桥杯" {
		t.Errorf("expected correct detail, got %s", item.Detail)
	}
}

func TestUserActivityItem_Types(t *testing.T) {
	validTypes := []string{"team", "preplan", "award", "evaluation"}
	for _, vt := range validTypes {
		item := UserActivityItem{Type: vt}
		if item.Type != vt {
			t.Errorf("expected type=%s, got %s", vt, item.Type)
		}
	}
}

func TestCreateCompetitionRequest_NewTypes(t *testing.T) {
	// Verify that new competition types are accepted in struct tags
	req := CreateCompetitionRequest{
		Title:       "AI创新大赛",
		Type:        "ai_innovation",
		MaxTeamSize: 5,
		MinTeamSize: 1,
		StartDate:   "2026-07-01T00:00:00+08:00",
		EndDate:     "2026-08-01T00:00:00+08:00",
	}

	if req.Type != "ai_innovation" {
		t.Errorf("expected type=ai_innovation, got %s", req.Type)
	}
}

func TestCreateCompetitionRequest_NewFields(t *testing.T) {
	req := CreateCompetitionRequest{
		Title:        "数据科学竞赛",
		Type:         "data_science",
		MaxTeamSize:  4,
		MinTeamSize:  1,
		StartDate:    "2026-07-01T00:00:00+08:00",
		EndDate:      "2026-08-01T00:00:00+08:00",
		Level:        "national",
		Website:      "https://example.com",
		ContactName:  "张老师",
		ContactEmail: "zhang@example.edu.cn",
	}

	if req.Level != "national" {
		t.Errorf("expected level=national, got %s", req.Level)
	}
	if req.Website != "https://example.com" {
		t.Errorf("expected website=https://example.com, got %s", req.Website)
	}
	if req.ContactName != "张老师" {
		t.Errorf("expected contact_name=张老师, got %s", req.ContactName)
	}
	if req.ContactEmail != "zhang@example.edu.cn" {
		t.Errorf("expected contact_email, got %s", req.ContactEmail)
	}
}

func TestUpdateCompetitionRequest_NewFields(t *testing.T) {
	level := "provincial"
	website := "https://updated.com"
	req := UpdateCompetitionRequest{
		Level:   level,
		Website: website,
	}

	if req.Level != "provincial" {
		t.Errorf("expected level=provincial, got %s", req.Level)
	}
	if req.Website != "https://updated.com" {
		t.Errorf("expected website updated, got %s", req.Website)
	}
}
