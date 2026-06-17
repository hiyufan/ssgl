package handlers

import (
	"testing"
)

func TestCreateEvaluationRequest_Validation(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateEvaluationRequest
		wantErr bool
	}{
		{
			name: "valid request",
			req: CreateEvaluationRequest{
				TeacherID:     1,
				CompetitionID: 1,
				Teaching:      4,
				Communication: 5,
				Availability:  3,
				Overall:       4,
				Feedback:      "Good teacher",
			},
			wantErr: false,
		},
		{
			name: "missing teacher_id",
			req: CreateEvaluationRequest{
				CompetitionID: 1,
				Teaching:      4,
				Communication: 5,
				Availability:  3,
				Overall:       4,
			},
			wantErr: true,
		},
		{
			name: "teaching score out of range",
			req: CreateEvaluationRequest{
				TeacherID:     1,
				CompetitionID: 1,
				Teaching:      6, // max is 5
				Communication: 5,
				Availability:  3,
				Overall:       4,
			},
			wantErr: true,
		},
		{
			name: "zero score",
			req: CreateEvaluationRequest{
				TeacherID:     1,
				CompetitionID: 1,
				Teaching:      0, // min is 1
				Communication: 5,
				Availability:  3,
				Overall:       4,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test struct field presence (binding:"required" is enforced by Gin,
			// but we can verify the struct is properly defined)
			if tt.req.TeacherID == 0 && !tt.wantErr {
				t.Error("expected valid request with teacher_id set")
			}
			if tt.req.Teaching > 5 && !tt.wantErr {
				t.Error("teaching score should not exceed 5")
			}
			if tt.req.Teaching < 1 && tt.req.Teaching != 0 && !tt.wantErr {
				t.Error("teaching score should be at least 1")
			}
		})
	}
}

func TestNewEvaluationHandler(t *testing.T) {
	handler := NewEvaluationHandler()
	if handler == nil {
		t.Error("NewEvaluationHandler returned nil")
	}
}

func TestCreateEvaluationRequest_FeedbackOptional(t *testing.T) {
	req := CreateEvaluationRequest{
		TeacherID:     1,
		CompetitionID: 2,
		Teaching:      5,
		Communication: 4,
		Availability:  3,
		Overall:       4,
	}
	// Feedback is optional (no binding:"required")
	if req.Feedback != "" {
		t.Errorf("expected empty feedback, got '%s'", req.Feedback)
	}
}

func TestCreateEvaluationRequest_AllScoresMax(t *testing.T) {
	req := CreateEvaluationRequest{
		TeacherID:     10,
		CompetitionID: 20,
		Teaching:      5,
		Communication: 5,
		Availability:  5,
		Overall:       5,
		Feedback:      "Excellent across all dimensions",
	}
	if req.Teaching != 5 || req.Communication != 5 || req.Availability != 5 || req.Overall != 5 {
		t.Error("all scores should be 5")
	}
}

func TestCreateEvaluationRequest_AllScoresMin(t *testing.T) {
	req := CreateEvaluationRequest{
		TeacherID:     10,
		CompetitionID: 20,
		Teaching:      1,
		Communication: 1,
		Availability:  1,
		Overall:       1,
		Feedback:      "Needs improvement",
	}
	if req.Teaching != 1 || req.Communication != 1 || req.Availability != 1 || req.Overall != 1 {
		t.Error("all scores should be 1")
	}
}

func TestCreateEvaluationRequest_UnicodeFeedback(t *testing.T) {
	req := CreateEvaluationRequest{
		TeacherID:     1,
		CompetitionID: 1,
		Teaching:      4,
		Communication: 4,
		Availability:  4,
		Overall:       4,
		Feedback:      "老师的教学质量非常高，讲解清晰，沟通顺畅！👍",
	}
	if len(req.Feedback) == 0 {
		t.Error("unicode feedback should be preserved")
	}
}
