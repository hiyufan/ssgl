package handlers

import (
	"testing"
	"time"
)

func TestParseTimeField_ValidRFC3339(t *testing.T) {
	input := "2026-07-01T00:00:00+08:00"
	got, err := parseTimeField(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Year() != 2026 || got.Month() != time.July || got.Day() != 1 {
		t.Errorf("expected 2026-07-01, got %v", got)
	}
}

func TestParseTimeField_InvalidFormat(t *testing.T) {
	_, err := parseTimeField("not-a-date")
	if err == nil {
		t.Error("expected error for invalid date format, got nil")
	}
}

func TestParseTimeField_EmptyString(t *testing.T) {
	_, err := parseTimeField("")
	if err == nil {
		t.Error("expected error for empty string, got nil")
	}
}

func TestNewCompetitionHandler(t *testing.T) {
	handler := NewCompetitionHandler()
	if handler == nil {
		t.Fatal("expected non-nil handler")
	}
}

func TestCreateCompetitionRequest_Types(t *testing.T) {
	validTypes := []string{"hackathon", "innovation", "research", "business_plan", "ai_innovation", "data_science"}
	for _, tt := range validTypes {
		req := CreateCompetitionRequest{
			Title:       "Test",
			Type:        tt,
			MaxTeamSize: 5,
			MinTeamSize: 1,
			StartDate:   "2026-07-01T00:00:00+08:00",
			EndDate:     "2026-08-01T00:00:00+08:00",
		}
		if req.Type != tt {
			t.Errorf("expected type %s, got %s", tt, req.Type)
		}
	}
}

func TestCreateCompetitionRequest_Fields(t *testing.T) {
	req := CreateCompetitionRequest{
		Title:                "蓝桥杯2026",
		Description:          "全国软件大赛",
		Type:                 "hackathon",
		MaxTeamSize:          5,
		MinTeamSize:          1,
		StartDate:            "2026-07-01T00:00:00+08:00",
		EndDate:              "2026-08-01T00:00:00+08:00",
		Location:             "北京",
		Level:                "national",
		Tags:                 "编程,AI",
		Website:              "https://lanqiao.com",
		ContactName:          "张老师",
		ContactEmail:         "zhang@test.com",
		RegistrationDeadline: "2026-06-15T00:00:00+08:00",
	}
	if req.Title != "蓝桥杯2026" {
		t.Errorf("expected Title='蓝桥杯2026', got '%s'", req.Title)
	}
	if req.Level != "national" {
		t.Errorf("expected Level='national', got '%s'", req.Level)
	}
	if req.MaxTeamSize != 5 {
		t.Errorf("expected MaxTeamSize=5, got %d", req.MaxTeamSize)
	}
}

func TestUpdateCompetitionRequest_Fields(t *testing.T) {
	req := UpdateCompetitionRequest{
		Title:       "更新后的赛事名称",
		Description: "新的描述",
		Type:        "innovation",
		MaxTeamSize: 8,
		MinTeamSize: 2,
		Level:       "provincial",
		Website:     "https://example.com",
		ContactName: "李老师",
		ContactEmail: "li@example.com",
	}
	if req.Title != "更新后的赛事名称" {
		t.Errorf("expected updated title, got '%s'", req.Title)
	}
	if req.Type != "innovation" {
		t.Errorf("expected type 'innovation', got '%s'", req.Type)
	}
	if req.MaxTeamSize != 8 {
		t.Errorf("expected MaxTeamSize=8, got %d", req.MaxTeamSize)
	}
}

func TestUpdateCompetitionRequest_PartialUpdate(t *testing.T) {
	// Partial update - only update title, other fields zero-value
	req := UpdateCompetitionRequest{
		Title: "只更新标题",
	}
	if req.Title != "只更新标题" {
		t.Errorf("expected partial title, got '%s'", req.Title)
	}
	if req.MaxTeamSize != 0 {
		t.Errorf("expected 0 MaxTeamSize for partial update, got %d", req.MaxTeamSize)
	}
	if req.Type != "" {
		t.Errorf("expected empty type for partial update, got '%s'", req.Type)
	}
}

func TestCreateCompetitionRequest_Levels(t *testing.T) {
	validLevels := []string{"school", "provincial", "national", "international", ""}
	for _, level := range validLevels {
		req := CreateCompetitionRequest{
			Title:       "Test",
			Type:        "hackathon",
			MaxTeamSize: 5,
			MinTeamSize: 1,
			StartDate:   "2026-07-01T00:00:00+08:00",
			EndDate:     "2026-08-01T00:00:00+08:00",
			Level:       level,
		}
		if req.Level != level {
			t.Errorf("expected level '%s', got '%s'", level, req.Level)
		}
	}
}

func TestCreateCompetitionRequest_TeamSizeConstraints(t *testing.T) {
	req := CreateCompetitionRequest{
		Title:       "Test",
		Type:        "hackathon",
		MaxTeamSize: 10,
		MinTeamSize: 2,
		StartDate:   "2026-07-01T00:00:00+08:00",
		EndDate:     "2026-08-01T00:00:00+08:00",
	}
	if req.MinTeamSize > req.MaxTeamSize {
		t.Error("MinTeamSize should not exceed MaxTeamSize")
	}
}

func TestParseTimeField_VariousFormats(t *testing.T) {
	tests := []struct {
		input   string
		wantErr bool
	}{
		{"2026-01-15T10:30:00Z", false},
		{"2026-12-31T23:59:59+08:00", false},
		{"2026-07-01T00:00:00-05:00", false},
		{"invalid", true},
		{"2026-13-01T00:00:00Z", true},
		{"", true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			_, err := parseTimeField(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseTimeField(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
		})
	}
}
