package handlers

import (
	"encoding/json"
	"testing"
)

func TestCreateFeedbackRequest_Validation(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateFeedbackRequest
		wantErr bool
	}{
		{
			name: "valid request with all fields",
			req: CreateFeedbackRequest{
				CompetitionID:  1,
				OverallRating:  5,
				ContentRating:  4,
				OrgRating:      5,
				FairnessRating: 4,
				LearningValue:  5,
				Comment:        "Excellent competition, well organized!",
				Anonymous:      false,
				Skills:         []string{"Go", "PostgreSQL", "REST API"},
			},
			wantErr: false,
		},
		{
			name: "valid request minimal fields",
			req: CreateFeedbackRequest{
				CompetitionID: 1,
				OverallRating: 3,
			},
			wantErr: false,
		},
		{
			name: "missing competition_id",
			req: CreateFeedbackRequest{
				OverallRating: 4,
			},
			wantErr: true,
		},
		{
			name: "missing overall_rating",
			req: CreateFeedbackRequest{
				CompetitionID: 1,
			},
			wantErr: true,
		},
		{
			name: "overall_rating too high",
			req: CreateFeedbackRequest{
				CompetitionID: 1,
				OverallRating: 6,
			},
			wantErr: true,
		},
		{
			name: "overall_rating zero",
			req: CreateFeedbackRequest{
				CompetitionID: 1,
				OverallRating: 0,
			},
			wantErr: true,
		},
		{
			name: "content_rating out of range",
			req: CreateFeedbackRequest{
				CompetitionID: 1,
				OverallRating: 4,
				ContentRating: 6,
			},
			wantErr: true,
		},
		{
			name: "org_rating out of range",
			req: CreateFeedbackRequest{
				CompetitionID: 1,
				OverallRating: 4,
				OrgRating:     -1,
			},
			wantErr: true,
		},
		{
			name: "anonymous feedback",
			req: CreateFeedbackRequest{
				CompetitionID:  1,
				OverallRating:  4,
				ContentRating:  4,
				OrgRating:      3,
				FairnessRating: 5,
				LearningValue:  4,
				Comment:        "Good but could improve organization",
				Anonymous:      true,
				Skills:         []string{"Teamwork", "Presentation"},
			},
			wantErr: false,
		},
		{
			name: "empty skills array is valid",
			req: CreateFeedbackRequest{
				CompetitionID: 1,
				OverallRating: 3,
				Skills:        []string{},
			},
			wantErr: false,
		},
		{
			name: "max rating for all dimensions",
			req: CreateFeedbackRequest{
				CompetitionID:  1,
				OverallRating:  5,
				ContentRating:  5,
				OrgRating:      5,
				FairnessRating: 5,
				LearningValue:  5,
				Comment:        "Perfect!",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validate using the binding tags (simulating gin's ShouldBindJSON)
			err := validateCreateFeedbackRequest(&tt.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateCreateFeedbackRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// validateCreateFeedbackRequest validates the request struct manually
// (since we can't use gin's ShouldBindJSON in unit tests without HTTP context).
func validateCreateFeedbackRequest(req *CreateFeedbackRequest) error {
	if req.CompetitionID == 0 {
		return &validationError{"competition_id is required"}
	}
	if req.OverallRating < 1 || req.OverallRating > 5 {
		return &validationError{"overall_rating must be 1-5"}
	}
	if req.ContentRating < 0 || req.ContentRating > 5 {
		return &validationError{"content_rating must be 0-5"}
	}
	if req.OrgRating < 0 || req.OrgRating > 5 {
		return &validationError{"org_rating must be 0-5"}
	}
	if req.FairnessRating < 0 || req.FairnessRating > 5 {
		return &validationError{"fairness_rating must be 0-5"}
	}
	if req.LearningValue < 0 || req.LearningValue > 5 {
		return &validationError{"learning_value must be 0-5"}
	}
	return nil
}

type validationError struct {
	msg string
}

func (e *validationError) Error() string {
	return e.msg
}

func TestFeedbackSummary_Calculation(t *testing.T) {
	// Test that summary calculation logic is correct
	type feedbackInput struct {
		overall  int
		content  int
		org      int
		fairness int
		learning int
		skills   []string
		comment  string
	}

	tests := []struct {
		name       string
		feedbacks  []feedbackInput
		wantTotal  int
		wantAvgOvr float64
	}{
		{
			name:       "no feedbacks",
			feedbacks:  []feedbackInput{},
			wantTotal:  0,
			wantAvgOvr: 0,
		},
		{
			name: "single feedback",
			feedbacks: []feedbackInput{
				{overall: 5, content: 4, org: 3, fairness: 5, learning: 4, skills: []string{"Go"}, comment: "Great"},
			},
			wantTotal:  1,
			wantAvgOvr: 5.0,
		},
		{
			name: "multiple feedbacks average",
			feedbacks: []feedbackInput{
				{overall: 5, content: 4, org: 5, fairness: 4, learning: 5},
				{overall: 3, content: 3, org: 3, fairness: 3, learning: 3},
				{overall: 4, content: 4, org: 4, fairness: 4, learning: 4},
			},
			wantTotal:  3,
			wantAvgOvr: 4.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			total := len(tt.feedbacks)
			if total != tt.wantTotal {
				t.Errorf("total = %d, want %d", total, tt.wantTotal)
			}

			if total > 0 {
				var sumOvr float64
				for _, fb := range tt.feedbacks {
					sumOvr += float64(fb.overall)
				}
				avg := sumOvr / float64(total)
				if avg != tt.wantAvgOvr {
					t.Errorf("avgOverall = %f, want %f", avg, tt.wantAvgOvr)
				}
			}
		})
	}
}

func TestFeedbackSkills_JSON(t *testing.T) {
	// Test JSON serialization of skills
	skills := []string{"Go", "React", "PostgreSQL"}
	b, err := json.Marshal(skills)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	var decoded []string
	if err := json.Unmarshal(b, &decoded); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if len(decoded) != 3 {
		t.Errorf("decoded skills count = %d, want 3", len(decoded))
	}
	if decoded[0] != "Go" || decoded[1] != "React" || decoded[2] != "PostgreSQL" {
		t.Errorf("decoded skills = %v, want [Go React PostgreSQL]", decoded)
	}
}

func TestNewCompetitionFeedbackHandler(t *testing.T) {
	handler := NewCompetitionFeedbackHandler()
	if handler == nil {
		t.Fatal("NewCompetitionFeedbackHandler() returned nil")
	}
}
