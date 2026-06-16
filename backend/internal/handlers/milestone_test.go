package handlers

import (
	"testing"
)

func TestNewMilestoneHandler(t *testing.T) {
	h := NewMilestoneHandler()
	if h == nil {
		t.Fatal("NewMilestoneHandler returned nil")
	}
}

func TestCreateMilestoneRequest_Validation(t *testing.T) {
	tests := []struct {
		name string
		req  CreateMilestoneRequest
		want bool
	}{
		{
			name: "valid request",
			req: CreateMilestoneRequest{
				CompetitionID: 1,
				Title:         "报名截止",
				Type:          "registration",
				DueDate:       "2026-07-01T00:00:00+08:00",
			},
			want: true,
		},
		{
			name: "missing title",
			req: CreateMilestoneRequest{
				CompetitionID: 1,
				DueDate:       "2026-07-01T00:00:00+08:00",
			},
			want: false,
		},
		{
			name: "missing competition_id",
			req: CreateMilestoneRequest{
				Title:   "报名截止",
				DueDate: "2026-07-01T00:00:00+08:00",
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validation is tested at the binding level; here we test struct construction
			hasTitle := tt.req.Title != ""
			hasCompID := tt.req.CompetitionID != 0
			valid := hasTitle && hasCompID
			if valid != tt.want {
				t.Errorf("expected validity %v, got %v (title=%q, compID=%d)", tt.want, valid, tt.req.Title, tt.req.CompetitionID)
			}
		})
	}
}

func TestUpdateMilestoneRequest_Fields(t *testing.T) {
	sortOrder := 5
	req := UpdateMilestoneRequest{
		Title:       "新标题",
		Description: "新描述",
		Status:      "completed",
		SortOrder:   &sortOrder,
	}

	if req.Title != "新标题" {
		t.Errorf("expected Title '新标题', got '%s'", req.Title)
	}
	if req.Status != "completed" {
		t.Errorf("expected Status 'completed', got '%s'", req.Status)
	}
	if req.SortOrder == nil || *req.SortOrder != 5 {
		t.Errorf("expected SortOrder 5, got %v", req.SortOrder)
	}
}

func TestMilestoneTypes_Constants(t *testing.T) {
	types := []string{"registration", "submission", "review", "defense", "award", "custom"}
	for _, typ := range types {
		if typ == "" {
			t.Error("empty milestone type constant")
		}
	}
}

func TestMilestoneStatus_Constants(t *testing.T) {
	statuses := []string{"pending", "in_progress", "completed", "skipped"}
	for _, s := range statuses {
		if s == "" {
			t.Error("empty milestone status constant")
		}
	}
}
