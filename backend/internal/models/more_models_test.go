package models

import (
	"testing"
	"time"

	"gorm.io/gorm"
)

func TestMilestone_StatusConstants(t *testing.T) {
	statuses := []struct {
		val      string
		expected string
	}{
		{MilestoneStatusPending, "pending"},
		{MilestoneStatusInProgress, "in_progress"},
		{MilestoneStatusCompleted, "completed"},
		{MilestoneStatusSkipped, "skipped"},
	}
	for _, s := range statuses {
		if s.val != s.expected {
			t.Errorf("expected %s, got %s", s.expected, s.val)
		}
	}
}

func TestMilestone_TypeConstants(t *testing.T) {
	types := []struct {
		val      string
		expected string
	}{
		{MilestoneTypeRegistration, "registration"},
		{MilestoneTypeSubmission, "submission"},
		{MilestoneTypeReview, "review"},
		{MilestoneTypeDefense, "defense"},
		{MilestoneTypeAward, "award"},
		{MilestoneTypeCustom, "custom"},
	}
	for _, tt := range types {
		if tt.val != tt.expected {
			t.Errorf("expected %s, got %s", tt.expected, tt.val)
		}
	}
}

func TestMilestone_Fields(t *testing.T) {
	now := time.Now()
	completedAt := now.Add(-1 * time.Hour)
	ms := Milestone{
		ID:            1,
		CompetitionID: 5,
		Title:         "提交作品",
		Description:   "请在截止日期前提交",
		Type:          MilestoneTypeSubmission,
		Status:        MilestoneStatusCompleted,
		StartDate:     now.Add(-48 * time.Hour),
		DueDate:       now.Add(24 * time.Hour),
		CompletedAt:   &completedAt,
		SortOrder:     2,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if ms.CompetitionID != 5 {
		t.Errorf("expected competition_id 5, got %d", ms.CompetitionID)
	}
	if ms.Title != "提交作品" {
		t.Errorf("expected title '提交作品', got '%s'", ms.Title)
	}
	if ms.Type != MilestoneTypeSubmission {
		t.Errorf("expected type '%s', got '%s'", MilestoneTypeSubmission, ms.Type)
	}
	if ms.Status != MilestoneStatusCompleted {
		t.Errorf("expected status '%s', got '%s'", MilestoneStatusCompleted, ms.Status)
	}
	if ms.CompletedAt == nil {
		t.Error("expected completed_at to be set")
	}
	if ms.SortOrder != 2 {
		t.Errorf("expected sort_order 2, got %d", ms.SortOrder)
	}
}

func TestMilestone_DefaultValues(t *testing.T) {
	ms := Milestone{}
	if ms.Status != "" {
		t.Errorf("expected empty default status, got '%s'", ms.Status)
	}
	if ms.Type != "" {
		t.Errorf("expected empty default type, got '%s'", ms.Type)
	}
	if ms.SortOrder != 0 {
		t.Errorf("expected default sort_order 0, got %d", ms.SortOrder)
	}
	if ms.CompletedAt != nil {
		t.Error("expected completed_at to be nil by default")
	}
}

func TestMilestone_SoftDelete(t *testing.T) {
	ms := Milestone{ID: 1}
	if ms.DeletedAt.Valid {
		t.Error("expected DeletedAt to be zero value (not deleted)")
	}
	ms.DeletedAt = gorm.DeletedAt{Time: time.Now(), Valid: true}
	if !ms.DeletedAt.Valid {
		t.Error("expected DeletedAt to be valid after setting")
	}
}

func TestNotification_Fields(t *testing.T) {
	now := time.Now()
	readAt := now.Add(1 * time.Hour)
	notif := Notification{
		ID:        1,
		UserID:    42,
		Type:      "team_invite",
		Title:     "团队邀请",
		Message:   "你被邀请加入团队",
		ReadAt:    &readAt,
		CreatedAt: now,
	}

	if notif.UserID != 42 {
		t.Errorf("expected user_id 42, got %d", notif.UserID)
	}
	if notif.Type != "team_invite" {
		t.Errorf("expected type 'team_invite', got '%s'", notif.Type)
	}
	if notif.Title != "团队邀请" {
		t.Errorf("expected title '团队邀请', got '%s'", notif.Title)
	}
	if notif.ReadAt == nil {
		t.Error("expected read_at to be set")
	}
}

func TestNotification_UnreadByDefault(t *testing.T) {
	notif := Notification{}
	if notif.ReadAt != nil {
		t.Error("expected read_at to be nil (unread) by default")
	}
}

func TestPrePlan_StatusConstants(t *testing.T) {
	statuses := []struct {
		val      string
		expected string
	}{
		{PrePlanStatusDraft, "draft"},
		{PrePlanStatusSubmitted, "submitted"},
		{PrePlanStatusReviewed, "reviewed"},
		{PrePlanStatusApproved, "approved"},
		{PrePlanStatusRejected, "rejected"},
	}
	for _, s := range statuses {
		if s.val != s.expected {
			t.Errorf("expected %s, got %s", s.expected, s.val)
		}
	}
}

func TestPrePlan_Fields(t *testing.T) {
	score := 85
	plan := PrePlan{
		ID:              1,
		CompetitionID:   10,
		TeamID:          20,
		Title:           "智能垃圾分类方案",
		TechStack:       "Python, TensorFlow, React",
		TargetAudience:  "城市社区",
		MarketAnalysis:  "市场规模约100亿",
		Innovation:      "基于深度学习的图像识别",
		ExpectedOutcome: "准确率95%以上",
		Timeline:        "3个月完成MVP",
		AIReviewScore:   &score,
		AIReviewNotes:   "整体方案优秀",
		Status:          PrePlanStatusReviewed,
	}

	submittedAt := time.Now()
	plan.SubmittedAt = &submittedAt

	if plan.CompetitionID != 10 {
		t.Errorf("expected competition_id 10, got %d", plan.CompetitionID)
	}
	if plan.TeamID != 20 {
		t.Errorf("expected team_id 20, got %d", plan.TeamID)
	}
	if plan.AIReviewScore == nil || *plan.AIReviewScore != 85 {
		t.Error("expected ai_review_score to be 85")
	}
	if plan.Status != PrePlanStatusReviewed {
		t.Errorf("expected status '%s', got '%s'", PrePlanStatusReviewed, plan.Status)
	}
}

func TestPrePlan_DefaultValues(t *testing.T) {
	plan := PrePlan{}
	if plan.AIReviewScore != nil {
		t.Error("expected ai_review_score to be nil by default")
	}
	if plan.AIReviewNotes != "" {
		t.Errorf("expected empty ai_review_notes, got '%s'", plan.AIReviewNotes)
	}
	if plan.Status != "" {
		t.Errorf("expected empty default status, got '%s'", plan.Status)
	}
}

func TestWorkflow_TypeConstants(t *testing.T) {
	types := []struct {
		val      string
		expected string
	}{
		{WorkflowTypeRegistration, "registration"},
		{WorkflowTypePrePlan, "pre_plan"},
		{WorkflowTypeReward, "reward"},
	}
	for _, tt := range types {
		if tt.val != tt.expected {
			t.Errorf("expected %s, got %s", tt.expected, tt.val)
		}
	}
}

func TestWorkflow_StatusConstants(t *testing.T) {
	statuses := []struct {
		val      string
		expected string
	}{
		{WorkflowStatusPending, "pending"},
		{WorkflowStatusApproved, "approved"},
		{WorkflowStatusRejected, "rejected"},
	}
	for _, s := range statuses {
		if s.val != s.expected {
			t.Errorf("expected %s, got %s", s.expected, s.val)
		}
	}
}

func TestWorkflow_StepActionConstants(t *testing.T) {
	actions := []struct {
		val      string
		expected string
	}{
		{StepActionPending, "pending"},
		{StepActionApproved, "approved"},
		{StepActionRejected, "rejected"},
		{StepActionWaiting, "waiting"},
	}
	for _, a := range actions {
		if a.val != a.expected {
			t.Errorf("expected %s, got %s", a.expected, a.val)
		}
	}
}
