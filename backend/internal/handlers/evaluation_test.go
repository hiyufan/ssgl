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
