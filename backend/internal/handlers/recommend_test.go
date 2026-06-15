package handlers

import (
	"testing"
	"time"

	"github.com/ssgl/competition-platform/internal/models"
)

func TestNewRecommendHandler(t *testing.T) {
	handler := NewRecommendHandler()
	if handler == nil {
		t.Fatal("NewRecommendHandler() returned nil")
	}
}

func TestScoreCompetition_NoKeywords(t *testing.T) {
	comp := models.Competition{
		ID:          1,
		Title:       "Test Competition",
		Type:        "hackathon",
		Tags:        "test,go,python",
		MaxTeamSize: 5,
		MinTeamSize: 1,
	}
	prePlans := []models.PrePlan{}
	userKeywords := map[string]bool{}

	score, tags, reason := scoreCompetition(comp, prePlans, userKeywords)

	// Base score should be 30 + 5 for team size
	if score < 30 || score > 100 {
		t.Errorf("expected score 30-100, got %f", score)
	}
	if len(tags) != 0 {
		t.Errorf("expected 0 tags, got %d", len(tags))
	}
	if reason == "" {
		t.Error("expected non-empty reason")
	}
}

func TestScoreCompetition_WithKeywordMatch(t *testing.T) {
	comp := models.Competition{
		ID:          1,
		Title:       "Hackathon",
		Type:        "hackathon",
		Tags:        "go,web,api",
		MaxTeamSize: 5,
		MinTeamSize: 1,
	}
	prePlans := []models.PrePlan{
		{TechStack: "Go Vue3 PostgreSQL", TargetAudience: "大学生", Innovation: "AI辅助"},
	}
	userKeywords := map[string]bool{
		"go": true, "vue3": true, "web": true,
	}

	score, tags, reason := scoreCompetition(comp, prePlans, userKeywords)

	// Should have tag match bonus + tech stack match
	if score <= 30 {
		t.Errorf("expected score > 30 with matches, got %f", score)
	}
	if len(tags) == 0 {
		t.Error("expected matched tags")
	}
	if reason == "" {
		t.Error("expected non-empty reason")
	}
}

func TestScoreCompetition_InnovationMatch(t *testing.T) {
	comp := models.Competition{
		ID:          2,
		Title:       "Innovation Contest",
		Type:        "innovation",
		Tags:        "创业,创新",
		MaxTeamSize: 4,
		MinTeamSize: 2,
	}
	prePlans := []models.PrePlan{
		{TechStack: "Python", TargetAudience: "高校", Innovation: "AI辅助,智能推荐"},
	}
	userKeywords := map[string]bool{
		"创新": true, "ai辅助": true,
	}

	score, tags, _ := scoreCompetition(comp, prePlans, userKeywords)

	// Should have tag match + innovation match
	if score <= 30 {
		t.Errorf("expected score > 30, got %f", score)
	}
	if len(tags) == 0 {
		t.Error("expected matched tags for innovation")
	}
}

func TestScoreCompetition_CapsAt100(t *testing.T) {
	// All possible bonuses
	comp := models.Competition{
		ID:                 3,
		Title:              "Max Score Comp",
		Type:               "hackathon",
		Tags:               "go,web,api,python,ai",
		MaxTeamSize:        4,
		MinTeamSize:        1,
		RegistrationDeadline: futureTime(10),
	}
	prePlans := []models.PrePlan{
		{TechStack: "Go Python", TargetAudience: "大学生", Innovation: "AI"},
	}
	userKeywords := map[string]bool{
		"go": true, "web": true, "api": true, "python": true, "ai": true,
	}

	score, _, _ := scoreCompetition(comp, prePlans, userKeywords)

	if score > 100 {
		t.Errorf("score should be capped at 100, got %f", score)
	}
}

func TestCompetitionRecommendation_Fields(t *testing.T) {
	rec := CompetitionRecommendation{}
	if rec.MatchScore != 0 {
		t.Error("expected zero match score by default")
	}
	if rec.Reason != "" {
		t.Error("expected empty reason by default")
	}
	if len(rec.MatchTags) != 0 {
		t.Error("expected empty match tags by default")
	}
}

// Helper to create a future time for testing
func futureTime(daysFromNow int) time.Time {
	return time.Now().AddDate(0, 0, daysFromNow)
}
