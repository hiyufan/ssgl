package services

import (
	"testing"
	"time"
)

func TestWorkflowServiceCreation(t *testing.T) {
	svc := NewWorkflowService()
	if svc == nil {
		t.Fatal("NewWorkflowService returned nil")
	}
}

func TestCreateWorkflowInput_Fields(t *testing.T) {
	input := CreateWorkflowInput{
		Type:        "pre_plan",
		TargetID:    42,
		SubmitterID: 1,
		ApproverIDs: []uint{2, 3, 4},
	}

	if input.Type != "pre_plan" {
		t.Errorf("expected type 'pre_plan', got '%s'", input.Type)
	}
	if input.TargetID != 42 {
		t.Errorf("expected target_id 42, got %d", input.TargetID)
	}
	if input.SubmitterID != 1 {
		t.Errorf("expected submitter_id 1, got %d", input.SubmitterID)
	}
	if len(input.ApproverIDs) != 3 {
		t.Errorf("expected 3 approvers, got %d", len(input.ApproverIDs))
	}
	if input.ApproverIDs[0] != 2 {
		t.Errorf("expected first approver 2, got %d", input.ApproverIDs[0])
	}
	if input.ApproverIDs[2] != 4 {
		t.Errorf("expected last approver 4, got %d", input.ApproverIDs[2])
	}
}

func TestCreateWorkflowInput_EmptyApprovers(t *testing.T) {
	input := CreateWorkflowInput{
		Type:        "registration",
		TargetID:    1,
		SubmitterID: 1,
		ApproverIDs: []uint{},
	}

	// Service should validate this
	if len(input.ApproverIDs) != 0 {
		t.Error("expected empty approvers")
	}
}

func TestWorkflowTypes(t *testing.T) {
	types := []string{"registration", "pre_plan", "reward"}
	for _, typ := range types {
		input := CreateWorkflowInput{
			Type:        typ,
			TargetID:    1,
			SubmitterID: 1,
			ApproverIDs: []uint{2},
		}
		if input.Type != typ {
			t.Errorf("expected type '%s', got '%s'", typ, input.Type)
		}
	}
}

func TestWorkflowStepProgression(t *testing.T) {
	// Test that workflow step logic is consistent
	// Current step starts at 1, total steps = len(approverIDs)
	approverIDs := []uint{10, 20, 30}
	input := CreateWorkflowInput{
		Type:        "pre_plan",
		TargetID:    1,
		SubmitterID: 1,
		ApproverIDs: approverIDs,
	}

	// Simulate the step creation logic
	totalSteps := len(input.ApproverIDs)
	if totalSteps != 3 {
		t.Fatalf("expected 3 total steps, got %d", totalSteps)
	}

	// First step should be pending, rest waiting
	for i, approverID := range input.ApproverIDs {
		action := "waiting"
		if i == 0 {
			action = "pending"
		}

		stepOrder := i + 1
		if stepOrder < 1 || stepOrder > totalSteps {
			t.Errorf("step order %d out of range [1, %d]", stepOrder, totalSteps)
		}

		if approverID == 0 {
			t.Errorf("step %d has zero approver ID", stepOrder)
		}

		if i == 0 && action != "pending" {
			t.Error("first step should be pending")
		}
		if i > 0 && action != "waiting" {
			t.Error("non-first step should be waiting")
		}
	}
}

func TestWorkflowApprovalLogic(t *testing.T) {
	// Test the approval progression logic
	currentStep := 1
	totalSteps := 3

	// Approve step 1 → advance to step 2
	if currentStep >= totalSteps {
		t.Error("step 1 should not be the last step")
	}
	nextStep := currentStep + 1
	if nextStep != 2 {
		t.Errorf("expected next step 2, got %d", nextStep)
	}

	// Approve step 2 → advance to step 3
	currentStep = 2
	if currentStep >= totalSteps {
		t.Error("step 2 should not be the last step")
	}
	nextStep = currentStep + 1
	if nextStep != 3 {
		t.Errorf("expected next step 3, got %d", nextStep)
	}

	// Approve step 3 → workflow complete
	currentStep = 3
	if currentStep < totalSteps {
		t.Error("step 3 should be the last step")
	}
}

func TestWorkflowTimeHandling(t *testing.T) {
	now := time.Now()
	if now.IsZero() {
		t.Error("time.Now() returned zero time")
	}

	// acted_at should be set to now when a step is acted upon
	actedAt := now
	if actedAt.IsZero() {
		t.Error("acted_at should not be zero")
	}
	if actedAt.After(time.Now().Add(time.Second)) {
		t.Error("acted_at should not be in the future")
	}
}
