package handlers

import (
	"testing"
)

func TestNewImportHandler(t *testing.T) {
	handler := NewImportHandler()
	if handler == nil {
		t.Fatal("expected non-nil handler")
	}
}

func TestImportCompetitionRequest_Fields(t *testing.T) {
	req := ImportCompetitionRequest{
		Title:       "蓝桥杯2026",
		Description: "全国软件大赛",
		Type:        "hackathon",
		MaxTeamSize: 5,
		MinTeamSize: 1,
		StartDate:   "2026-07-01T00:00:00+08:00",
		EndDate:     "2026-08-01T00:00:00+08:00",
		Location:    "北京",
		Level:       "national",
		Tags:        "编程,AI",
	}
	if req.Title != "蓝桥杯2026" {
		t.Errorf("expected Title='蓝桥杯2026', got '%s'", req.Title)
	}
	if req.Type != "hackathon" {
		t.Errorf("expected Type='hackathon', got '%s'", req.Type)
	}
	if req.MaxTeamSize != 5 {
		t.Errorf("expected MaxTeamSize=5, got %d", req.MaxTeamSize)
	}
	if req.Level != "national" {
		t.Errorf("expected Level='national', got '%s'", req.Level)
	}
}

func TestImportCompetitionRequest_Types(t *testing.T) {
	validTypes := []string{"hackathon", "innovation", "research", "business_plan", "ai_innovation", "data_science"}
	for _, tt := range validTypes {
		req := ImportCompetitionRequest{
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

func TestImportError_Fields(t *testing.T) {
	err := ImportError{
		Index:   0,
		Title:   "测试赛事",
		Message: "invalid date format",
	}
	if err.Index != 0 {
		t.Errorf("expected Index=0, got %d", err.Index)
	}
	if err.Title != "测试赛事" {
		t.Errorf("expected Title='测试赛事', got '%s'", err.Title)
	}
	if err.Message != "invalid date format" {
		t.Errorf("expected Message='invalid date format', got '%s'", err.Message)
	}
}

func TestBatchImportResponse_Fields(t *testing.T) {
	resp := BatchImportResponse{
		CreatedCount: 5,
		ErrorCount:   2,
		Errors: []ImportError{
			{Index: 1, Title: "Bad1", Message: "error1"},
			{Index: 3, Title: "Bad2", Message: "error2"},
		},
	}
	if resp.CreatedCount != 5 {
		t.Errorf("expected CreatedCount=5, got %d", resp.CreatedCount)
	}
	if resp.ErrorCount != 2 {
		t.Errorf("expected ErrorCount=2, got %d", resp.ErrorCount)
	}
	if len(resp.Errors) != 2 {
		t.Errorf("expected 2 errors, got %d", len(resp.Errors))
	}
}

func TestBatchImportResponse_NoErrors(t *testing.T) {
	resp := BatchImportResponse{
		CreatedCount: 10,
		ErrorCount:   0,
	}
	if resp.CreatedCount != 10 {
		t.Errorf("expected CreatedCount=10, got %d", resp.CreatedCount)
	}
	if resp.ErrorCount != 0 {
		t.Errorf("expected ErrorCount=0, got %d", resp.ErrorCount)
	}
	// Errors field should be nil (omitempty).
	if resp.Errors != nil {
		t.Errorf("expected nil Errors, got %v", resp.Errors)
	}
}

func TestImportCompetitionRequest_OptionalFields(t *testing.T) {
	req := ImportCompetitionRequest{
		Title:                "测试",
		Type:                 "innovation",
		MaxTeamSize:          3,
		MinTeamSize:          1,
		StartDate:            "2026-07-01T00:00:00+08:00",
		EndDate:              "2026-08-01T00:00:00+08:00",
		RegistrationDeadline: "2026-06-15T00:00:00+08:00",
		Location:             "上海",
		RulesDocURL:          "https://example.com/rules",
		Prize:                "¥10000",
		Tags:                 "AI,创新",
		Level:                "provincial",
		Website:              "https://example.com",
		ContactName:          "李老师",
		ContactEmail:         "li@example.com",
	}
	if req.RegistrationDeadline == "" {
		t.Error("expected RegistrationDeadline to be set")
	}
	if req.Website != "https://example.com" {
		t.Errorf("expected Website='https://example.com', got '%s'", req.Website)
	}
	if req.ContactEmail != "li@example.com" {
		t.Errorf("expected ContactEmail='li@example.com', got '%s'", req.ContactEmail)
	}
}
