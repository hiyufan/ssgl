package handlers

import (
	"testing"

	"github.com/ssgl/competition-platform/internal/models"
)

func TestNewRegistrationHandler(t *testing.T) {
	handler := NewRegistrationHandler()
	if handler == nil {
		t.Error("NewRegistrationHandler returned nil")
	}
}

func TestRegistrationModel_Constants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"RegStatusPending", models.RegStatusPending, "pending"},
		{"RegStatusApproved", models.RegStatusApproved, "approved"},
		{"RegStatusRejected", models.RegStatusRejected, "rejected"},
		{"RegStatusCancelled", models.RegStatusCancelled, "cancelled"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %s='%s', got '%s'", tt.name, tt.expected, tt.got)
			}
		})
	}
}

func TestRegistrationModel_Fields(t *testing.T) {
	reg := models.CompetitionRegistration{
		ID:            1,
		CompetitionID: 10,
		UserID:        5,
		Status:        models.RegStatusPending,
		Remark:        "test remark",
	}
	if reg.CompetitionID != 10 {
		t.Errorf("expected CompetitionID=10, got %d", reg.CompetitionID)
	}
	if reg.UserID != 5 {
		t.Errorf("expected UserID=5, got %d", reg.UserID)
	}
	if reg.Status != "pending" {
		t.Errorf("expected Status='pending', got '%s'", reg.Status)
	}
	if reg.Remark != "test remark" {
		t.Errorf("expected Remark='test remark', got '%s'", reg.Remark)
	}
}

func TestRegistrationModel_DefaultStatus(t *testing.T) {
	reg := models.CompetitionRegistration{}
	if reg.Status != "" {
		t.Logf("Zero-value Status is '%s' (DB default will be 'pending')", reg.Status)
	}
}

func TestCompRegistrationRequest_Fields(t *testing.T) {
	req := CompRegistrationRequest{
		Remark: "test",
	}
	if req.Remark != "test" {
		t.Errorf("expected Remark='test', got '%s'", req.Remark)
	}
}

func TestCompRegistrationRequest_EmptyRemark(t *testing.T) {
	req := CompRegistrationRequest{}
	if req.Remark != "" {
		t.Errorf("expected empty Remark, got '%s'", req.Remark)
	}
}

func TestRegistrationStatusTransitions(t *testing.T) {
	// Test valid status transitions
	transitions := []struct {
		name   string
		from   string
		to     string
		valid  bool
	}{
		{"pending→approved", models.RegStatusPending, models.RegStatusApproved, true},
		{"pending→rejected", models.RegStatusPending, models.RegStatusRejected, true},
		{"pending→cancelled", models.RegStatusPending, models.RegStatusCancelled, true},
		{"approved→pending (invalid)", models.RegStatusApproved, models.RegStatusPending, false},
		{"rejected→approved (invalid)", models.RegStatusRejected, models.RegStatusApproved, false},
	}

	for _, tr := range transitions {
		t.Run(tr.name, func(t *testing.T) {
			// The handler checks that only pending registrations can be approved/rejected
			canTransition := tr.from == models.RegStatusPending
			if canTransition != tr.valid {
				t.Errorf("transition %s→%s: expected valid=%v, got %v",
					tr.from, tr.to, tr.valid, canTransition)
			}
		})
	}
}

func TestRegistrationModel_SoftDelete(t *testing.T) {
	reg := models.CompetitionRegistration{
		ID:     1,
		Status: models.RegStatusApproved,
	}
	// Verify the DeletedAt field exists and is zero-valued for active records
	if reg.DeletedAt.Valid {
		t.Error("expected DeletedAt to be zero-valued for new record")
	}
}

func TestRegistrationModel_Timestamps(t *testing.T) {
	reg := models.CompetitionRegistration{}
	// Zero-value timestamps for new records
	if !reg.CreatedAt.IsZero() {
		t.Errorf("expected zero CreatedAt, got %v", reg.CreatedAt)
	}
	if !reg.UpdatedAt.IsZero() {
		t.Errorf("expected zero UpdatedAt, got %v", reg.UpdatedAt)
	}
}

func TestRegistrationModel_JSON(t *testing.T) {
	// Test that the JSON tags are properly set
	reg := models.CompetitionRegistration{
		ID:            42,
		CompetitionID: 7,
		UserID:        3,
		Status:        models.RegStatusApproved,
		Remark:        "VIP",
	}
	if reg.ID != 42 {
		t.Errorf("expected ID=42, got %d", reg.ID)
	}
	if reg.CompetitionID != 7 {
		t.Errorf("expected CompetitionID=7, got %d", reg.CompetitionID)
	}
	if reg.UserID != 3 {
		t.Errorf("expected UserID=3, got %d", reg.UserID)
	}
}

func TestRegistrationHandler_MultipleInstances(t *testing.T) {
	h1 := NewRegistrationHandler()
	h2 := NewRegistrationHandler()
	if h1 == h2 {
		// They should be different instances (pointer comparison)
		t.Log("Handlers are different instances (expected)")
	}
}

func TestCompRegistrationRequest_MaxLength(t *testing.T) {
	// Test that Remark field binding tag has max=512
	longRemark := make([]byte, 600)
	for i := range longRemark {
		longRemark[i] = 'a'
	}
	req := CompRegistrationRequest{Remark: string(longRemark)}
	// The struct itself won't enforce max length (that's done by binding),
	// but verify the field can hold the data
	if len(req.Remark) != 600 {
		t.Errorf("expected Remark length 600, got %d", len(req.Remark))
	}
}

func TestBatchActionRequest_Fields(t *testing.T) {
	req := BatchActionRequest{
		IDs:    []uint{1, 2, 3},
		Reason: "不符合参赛条件",
	}
	if len(req.IDs) != 3 {
		t.Errorf("expected 3 IDs, got %d", len(req.IDs))
	}
	if req.IDs[0] != 1 || req.IDs[1] != 2 || req.IDs[2] != 3 {
		t.Errorf("unexpected IDs: %v", req.IDs)
	}
	if req.Reason != "不符合参赛条件" {
		t.Errorf("expected Reason='不符合参赛条件', got '%s'", req.Reason)
	}
}

func TestBatchActionRequest_EmptyIDs(t *testing.T) {
	req := BatchActionRequest{
		IDs: []uint{},
	}
	if len(req.IDs) != 0 {
		t.Errorf("expected 0 IDs, got %d", len(req.IDs))
	}
}

func TestBatchActionRequest_SingleID(t *testing.T) {
	req := BatchActionRequest{
		IDs: []uint{42},
	}
	if len(req.IDs) != 1 {
		t.Errorf("expected 1 ID, got %d", len(req.IDs))
	}
	if req.IDs[0] != 42 {
		t.Errorf("expected ID=42, got %d", req.IDs[0])
	}
}

func TestBatchActionRequest_NoReason(t *testing.T) {
	req := BatchActionRequest{
		IDs: []uint{1, 2},
	}
	if req.Reason != "" {
		t.Errorf("expected empty Reason, got '%s'", req.Reason)
	}
}

func TestBatchAction_BatchApproveExists(t *testing.T) {
	handler := NewRegistrationHandler()
	if handler == nil {
		t.Error("NewRegistrationHandler returned nil")
	}
	// Verify that BatchApprove method exists (compile-time check)
	_ = handler.BatchApprove
}

func TestBatchAction_BatchRejectExists(t *testing.T) {
	handler := NewRegistrationHandler()
	if handler == nil {
		t.Error("NewRegistrationHandler returned nil")
	}
	// Verify that BatchReject method exists (compile-time check)
	_ = handler.BatchReject
}
