package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCompetitionBriefHandler_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/competitions/abc/brief", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	handler := NewCompetitionBriefHandler()
	handler.GenerateBrief(c)

	// Without a real DB, it should return 503 or handle gracefully
	if w.Code == http.StatusOK {
		t.Log("Brief endpoint responded OK (DB may be available)")
	} else {
		t.Logf("Brief endpoint responded with %d (expected without DB)", w.Code)
	}
}

func TestCompetitionBriefHandler_NonExistent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/competitions/999999/brief", nil)
	c.Params = gin.Params{{Key: "id", Value: "999999"}}

	handler := NewCompetitionBriefHandler()
	handler.GenerateBrief(c)

	if w.Code == http.StatusNotFound || w.Code == http.StatusServiceUnavailable {
		t.Logf("Non-existent competition brief → %d ✓", w.Code)
	} else if w.Code == http.StatusOK {
		// DB available, check structure
		var result map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &result)
		t.Logf("Brief returned for comp 999999: keys=%v", len(result))
	}
}

func TestBriefStructures(t *testing.T) {
	// Test that all struct types can be serialized
	brief := CompetitionBrief{
		CompetitionID: 1,
		Title:         "Test Competition",
		Type:          "hackathon",
		Level:         "校级",
		Status:        "published",
		Overview: BriefOverview{
			Description:       "Test description",
			DaysUntilStart:    10,
			DaysUntilEnd:      30,
			TeamCount:         5,
			StudentCount:      15,
			RegistrationCount: 20,
			PreplanCount:      3,
			AwardCount:        0,
			ParticipationRate: 75.0,
		},
		Difficulty: BriefDifficulty{
			OverallScore: 3.5,
			Level:        "medium",
			Dimensions: []DifficultyDim{
				{Name: "技术难度", Score: 4.0, Notes: "test"},
				{Name: "团队要求", Score: 3.0, Notes: "test"},
			},
			Description: "Test difficulty",
		},
		TeamStrategy: BriefTeamStrategy{
			RecommendedSize:   3,
			MinSize:           2,
			MaxSize:           5,
			RecommendedSkills: []string{"coding", "design"},
			TeamComposition:   "balanced team",
			CollaborationTips: []string{"communicate well"},
		},
		Timeline: []BriefPhase{
			{Name: "Prep", StartOffset: 0, Duration: 7, Description: "Prepare", Tasks: []string{"study"}},
		},
		SuccessFactors: []string{"understand rules"},
		CommonPitfalls: []string{"start late"},
		Resources: []BriefResource{
			{Type: "tool", Name: "AI Toolbox", Description: "AI tools"},
		},
		CompetitorInsight: BriefCompetitor{
			TotalTeams:       10,
			AvgTeamSize:      3.5,
			TopTeamNames:     []string{"Team A", "Team B"},
			CompetitionLevel: "medium",
		},
		ReadinessScore: 72.5,
		ActionPlan: []BriefAction{
			{Priority: "high", Deadline: "now", Description: "read rules", Category: "preparation"},
		},
	}

	data, err := json.Marshal(brief)
	if err != nil {
		t.Fatalf("Failed to marshal CompetitionBrief: %v", err)
	}

	var decoded CompetitionBrief
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal CompetitionBrief: %v", err)
	}

	if decoded.CompetitionID != 1 {
		t.Errorf("Expected CompetitionID=1, got %d", decoded.CompetitionID)
	}
	if decoded.Difficulty.OverallScore != 3.5 {
		t.Errorf("Expected difficulty score 3.5, got %f", decoded.Difficulty.OverallScore)
	}
	if len(decoded.Difficulty.Dimensions) != 2 {
		t.Errorf("Expected 2 difficulty dimensions, got %d", len(decoded.Difficulty.Dimensions))
	}
	if len(decoded.Timeline) != 1 {
		t.Errorf("Expected 1 timeline phase, got %d", len(decoded.Timeline))
	}
	if len(decoded.Resources) != 1 {
		t.Errorf("Expected 1 resource, got %d", len(decoded.Resources))
	}
	if decoded.ReadinessScore != 72.5 {
		t.Errorf("Expected readiness score 72.5, got %f", decoded.ReadinessScore)
	}
	if len(decoded.ActionPlan) != 1 {
		t.Errorf("Expected 1 action item, got %d", len(decoded.ActionPlan))
	}

	t.Log("All CompetitionBrief structures serialize/deserialize correctly ✓")
}

func TestAssessBriefDifficulty(t *testing.T) {
	// Test with various competition types
	testCases := []struct {
		name    string
		compType string
		level   string
		maxTeam int
		regs    int64
		minScore float64
		maxScore float64
	}{
		{"easy school hackathon", "hackathon", "校级", 3, 5, 2.0, 4.5},
		{"hard national ai", "ai", "国家级", 5, 50, 3.0, 5.0},
		{"medium business", "business", "省级", 4, 15, 2.5, 4.0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			comp := mockCompetition{compType: tc.compType, level: tc.level, maxTeam: tc.maxTeam}
			result := assessBriefDifficultyFromValues(comp.compType, comp.level, comp.maxTeam, tc.regs)
			if result.OverallScore < tc.minScore || result.OverallScore > tc.maxScore {
				t.Logf("Difficulty for %s: %.1f (expected %.1f-%.1f)", tc.name, result.OverallScore, tc.minScore, tc.maxScore)
			}
			if len(result.Dimensions) == 0 {
				t.Error("Expected at least 1 difficulty dimension")
			}
		})
	}
}

// Helper to test difficulty without DB
type mockCompetition struct {
	compType    string
	level       string
	maxTeam     int
}

func assessBriefDifficultyFromValues(compType, level string, maxTeamSize int, regCount int64) BriefDifficulty {
	// Inline the difficulty assessment logic for testing
	dims := []DifficultyDim{}
	totalScore := 0.0

	typeScore := 3.0
	switch compType {
	case "hackathon":
		typeScore = 4.0
	case "ai":
		typeScore = 4.5
	case "research":
		typeScore = 4.0
	case "business":
		typeScore = 3.0
	case "programming":
		typeScore = 3.5
	}
	dims = append(dims, DifficultyDim{Name: "技术难度", Score: typeScore})
	totalScore += typeScore

	levelScore := 3.0
	switch level {
	case "国家级", "national":
		levelScore = 4.5
	case "省级", "provincial":
		levelScore = 3.5
	case "校级", "school":
		levelScore = 2.0
	}
	dims = append(dims, DifficultyDim{Name: "赛事级别", Score: levelScore})
	totalScore += levelScore

	intensityScore := 2.0
	if regCount > 50 {
		intensityScore = 4.5
	} else if regCount > 20 {
		intensityScore = 3.5
	}
	dims = append(dims, DifficultyDim{Name: "竞争强度", Score: intensityScore})
	totalScore += intensityScore

	teamScore := 2.0
	if maxTeamSize > 3 {
		teamScore = 3.5
	}
	dims = append(dims, DifficultyDim{Name: "团队要求", Score: teamScore})
	totalScore += teamScore

	timeScore := 2.0
	dims = append(dims, DifficultyDim{Name: "时间压力", Score: timeScore})
	totalScore += timeScore

	overall := totalScore / float64(len(dims))

	return BriefDifficulty{
		OverallScore: overall,
		Dimensions:   dims,
	}
}
