package handlers

import (
	"testing"
)

func TestPrePlanHandler_AIClientNil(t *testing.T) {
	handler := NewPrePlanHandler(nil)
	if handler.AIClient != nil {
		t.Error("expected AIClient to be nil when created with nil")
	}
}

func TestCreatePrePlanRequest_Fields(t *testing.T) {
	req := CreatePrePlanRequest{
		CompetitionID:   1,
		TeamID:          2,
		Title:           "AI智能学习助手方案",
		TechStack:       "Go, React, PostgreSQL",
		TargetAudience:  "高校学生",
		MarketAnalysis:  "教育科技市场规模大",
		Innovation:      "AI个性化学习路径",
		ExpectedOutcome: "提升学习效率30%",
		Timeline:        "3个月完成MVP",
	}

	if req.CompetitionID != 1 {
		t.Errorf("expected CompetitionID=1, got %d", req.CompetitionID)
	}
	if req.TeamID != 2 {
		t.Errorf("expected TeamID=2, got %d", req.TeamID)
	}
	if req.Title != "AI智能学习助手方案" {
		t.Errorf("expected Title='AI智能学习助手方案', got '%s'", req.Title)
	}
	if req.TechStack != "Go, React, PostgreSQL" {
		t.Errorf("expected TechStack='Go, React, PostgreSQL', got '%s'", req.TechStack)
	}
	if req.TargetAudience != "高校学生" {
		t.Errorf("expected TargetAudience='高校学生', got '%s'", req.TargetAudience)
	}
	if req.MarketAnalysis != "教育科技市场规模大" {
		t.Errorf("expected MarketAnalysis='教育科技市场规模大', got '%s'", req.MarketAnalysis)
	}
	if req.Innovation != "AI个性化学习路径" {
		t.Errorf("expected Innovation='AI个性化学习路径', got '%s'", req.Innovation)
	}
	if req.ExpectedOutcome != "提升学习效率30%" {
		t.Errorf("expected ExpectedOutcome='提升学习效率30%%', got '%s'", req.ExpectedOutcome)
	}
	if req.Timeline != "3个月完成MVP" {
		t.Errorf("expected Timeline='3个月完成MVP', got '%s'", req.Timeline)
	}
}

func TestUpdatePrePlanRequest_PointerFields(t *testing.T) {
	title := "更新后的标题"
	techStack := "Python, FastAPI"
	status := "submitted"

	req := UpdatePrePlanRequest{
		Title:     &title,
		TechStack: &techStack,
		Status:    &status,
	}

	if req.Title == nil || *req.Title != "更新后的标题" {
		t.Errorf("expected Title='更新后的标题', got %v", req.Title)
	}
	if req.TechStack == nil || *req.TechStack != "Python, FastAPI" {
		t.Errorf("expected TechStack='Python, FastAPI', got %v", req.TechStack)
	}
	if req.Status == nil || *req.Status != "submitted" {
		t.Errorf("expected Status='submitted', got %v", req.Status)
	}
	if req.MarketAnalysis != nil {
		t.Error("expected MarketAnalysis to be nil")
	}
	if req.Innovation != nil {
		t.Error("expected Innovation to be nil")
	}
}

func TestUpdatePrePlanRequest_AllNil(t *testing.T) {
	req := UpdatePrePlanRequest{}
	if req.Title != nil {
		t.Error("expected Title to be nil")
	}
	if req.TechStack != nil {
		t.Error("expected TechStack to be nil")
	}
	if req.TargetAudience != nil {
		t.Error("expected TargetAudience to be nil")
	}
	if req.MarketAnalysis != nil {
		t.Error("expected MarketAnalysis to be nil")
	}
	if req.Innovation != nil {
		t.Error("expected Innovation to be nil")
	}
	if req.ExpectedOutcome != nil {
		t.Error("expected ExpectedOutcome to be nil")
	}
	if req.Timeline != nil {
		t.Error("expected Timeline to be nil")
	}
	if req.Status != nil {
		t.Error("expected Status to be nil")
	}
}
