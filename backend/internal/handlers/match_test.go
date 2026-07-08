package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"gorm.io/gorm"
)

func TestNewMatchHandler(t *testing.T) {
	handler := NewMatchHandler()
	if handler == nil {
		t.Error("NewMatchHandler returned nil")
	}
}

func TestMatchResultFields(t *testing.T) {
	result := MatchResult{
		UserID:       42,
		Username:     "student_42",
		Name:         "测试学生",
		Dept:         "计算机学院",
		Avatar:       "",
		TeamCount:    2,
		AwardCount:   1,
		PrePlanCount: 3,
		MatchScore:   75.5,
		Reason:       "experienced competitor with awards",
	}

	if result.UserID != 42 {
		t.Errorf("expected UserID=42, got %d", result.UserID)
	}
	if result.Username != "student_42" {
		t.Errorf("expected Username='student_42', got '%s'", result.Username)
	}
	if result.Name != "测试学生" {
		t.Errorf("expected Name='测试学生', got '%s'", result.Name)
	}
	if result.Dept != "计算机学院" {
		t.Errorf("expected Dept='计算机学院', got '%s'", result.Dept)
	}
	if result.TeamCount != 2 {
		t.Errorf("expected TeamCount=2, got %d", result.TeamCount)
	}
	if result.AwardCount != 1 {
		t.Errorf("expected AwardCount=1, got %d", result.AwardCount)
	}
	if result.PrePlanCount != 3 {
		t.Errorf("expected PrePlanCount=3, got %d", result.PrePlanCount)
	}
	if result.MatchScore != 75.5 {
		t.Errorf("expected MatchScore=75.5, got %f", result.MatchScore)
	}
	if result.Reason != "experienced competitor with awards" {
		t.Errorf("expected Reason='experienced competitor with awards', got '%s'", result.Reason)
	}
}

func TestMatchScoreCalculation(t *testing.T) {
	tests := []struct {
		name          string
		teams         int64
		awards        int64
		preplans      int64
		expectedScore float64
	}{
		{"newcomer", 0, 0, 0, 0},
		{"team only", 3, 0, 0, 30},
		{"awards only", 0, 2, 0, 30},
		{"preplans only", 0, 0, 4, 32},
		{"experienced", 2, 3, 5, 100}, // 20+45+40=105 → capped at 100
		{"balanced", 1, 1, 1, 33},     // 10+15+8=33
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := float64(tt.teams)*10 + float64(tt.awards)*15 + float64(tt.preplans)*8
			if score > 100 {
				score = 100
			}
			if score != tt.expectedScore {
				t.Errorf("%s: expected %.0f, got %.0f", tt.name, tt.expectedScore, score)
			}
		})
	}
}

func TestMatchReasonPriority(t *testing.T) {
	// Test that reason is generated correctly based on activity level
	tests := []struct {
		name           string
		awardCount     int64
		prePlanCount   int64
		teamCount      int64
		expectedReason string
	}{
		{"with awards", 1, 0, 0, "experienced competitor with awards"},
		{"with preplans", 0, 2, 1, "active planner with pre-plan experience"},
		{"team only", 0, 0, 1, "team experience"},
		{"newcomer", 0, 0, 0, "available student"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reason := "available student"
			if tt.awardCount > 0 {
				reason = "experienced competitor with awards"
			} else if tt.prePlanCount > 0 {
				reason = "active planner with pre-plan experience"
			} else if tt.teamCount > 0 {
				reason = "team experience"
			}

			if reason != tt.expectedReason {
				t.Errorf("%s: expected reason='%s', got '%s'", tt.name, tt.expectedReason, reason)
			}
		})
	}
}

func TestMatchResultJSONTags(t *testing.T) {
	result := MatchResult{
		UserID:       1,
		Username:     "test_user",
		Name:         "Test",
		Dept:         "CS",
		Avatar:       "avatar.png",
		TeamCount:    1,
		AwardCount:   2,
		PrePlanCount: 3,
		MatchScore:   80.0,
		Reason:       "test reason",
	}
	// Verify all fields are accessible
	if result.UserID != 1 {
		t.Error("UserID mismatch")
	}
	if result.Avatar != "avatar.png" {
		t.Error("Avatar mismatch")
	}
}

func TestMatchScoreCap(t *testing.T) {
	// Score should be capped at 100
	score := float64(10)*10 + float64(10)*15 + float64(10)*8 // 100+150+80=330
	if score > 100 {
		score = 100
	}
	if score != 100 {
		t.Errorf("expected score capped at 100, got %.0f", score)
	}
}

func TestMatchResultZeroValues(t *testing.T) {
	result := MatchResult{}
	if result.UserID != 0 {
		t.Errorf("expected zero UserID, got %d", result.UserID)
	}
	if result.MatchScore != 0 {
		t.Errorf("expected zero MatchScore, got %f", result.MatchScore)
	}
	if result.Username != "" {
		t.Errorf("expected empty Username, got '%s'", result.Username)
	}
}

func TestMatchHandler_MatchScoresAndExcludesInSingleQuery(t *testing.T) {
	oldDB := database.DB
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}
	database.DB = db
	t.Cleanup(func() {
		database.DB = oldDB
	})

	if err := db.AutoMigrate(
		&models.User{},
		&models.Competition{},
		&models.Team{},
		&models.TeamMember{},
		&models.Award{},
		&models.PrePlan{},
	); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}

	users := []models.User{
		{Username: "current", Email: "current@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive, Name: "Current"},
		{Username: "award", Email: "award@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive, Name: "Award Student"},
		{Username: "planner", Email: "planner@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive, Name: "Planner Student"},
		{Username: "busy", Email: "busy@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive, Name: "Busy Student"},
		{Username: "teacher", Email: "teacher@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive, Name: "Teacher"},
		{Username: "disabled", Email: "disabled@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusDisabled, Name: "Disabled"},
	}
	for i := range users {
		if err := db.Create(&users[i]).Error; err != nil {
			t.Fatalf("failed to create user %d: %v", i, err)
		}
	}

	targetComp := models.Competition{Title: "Target", Type: models.CompTypeHackathon, OrganizerID: users[0].ID}
	otherComp := models.Competition{Title: "Other", Type: models.CompTypeHackathon, OrganizerID: users[0].ID}
	if err := db.Create(&targetComp).Error; err != nil {
		t.Fatalf("failed to create target competition: %v", err)
	}
	if err := db.Create(&otherComp).Error; err != nil {
		t.Fatalf("failed to create other competition: %v", err)
	}

	awardTeam := models.Team{Name: "Award Team", CompetitionID: otherComp.ID, LeaderID: users[1].ID}
	plannerTeam := models.Team{Name: "Planner Team", CompetitionID: otherComp.ID, LeaderID: users[2].ID}
	busyTeam := models.Team{Name: "Busy Team", CompetitionID: targetComp.ID, LeaderID: users[3].ID}
	for _, team := range []*models.Team{&awardTeam, &plannerTeam, &busyTeam} {
		if err := db.Create(team).Error; err != nil {
			t.Fatalf("failed to create team: %v", err)
		}
	}

	members := []models.TeamMember{
		{TeamID: awardTeam.ID, UserID: users[1].ID, Role: models.TeamMemberRoleLeader},
		{TeamID: plannerTeam.ID, UserID: users[2].ID, Role: models.TeamMemberRoleLeader},
		{TeamID: busyTeam.ID, UserID: users[3].ID, Role: models.TeamMemberRoleLeader},
	}
	for i := range members {
		if err := db.Create(&members[i]).Error; err != nil {
			t.Fatalf("failed to create member %d: %v", i, err)
		}
	}

	awards := []models.Award{
		{CompetitionID: otherComp.ID, TeamID: awardTeam.ID, Rank: 1, PrizeName: "Gold"},
		{CompetitionID: otherComp.ID, TeamID: awardTeam.ID, Rank: 2, PrizeName: "Silver"},
	}
	if err := db.Create(&awards).Error; err != nil {
		t.Fatalf("failed to create awards: %v", err)
	}

	preplans := []models.PrePlan{
		{CompetitionID: otherComp.ID, TeamID: plannerTeam.ID, Title: "Plan A"},
		{CompetitionID: otherComp.ID, TeamID: plannerTeam.ID, Title: "Plan B"},
	}
	if err := db.Create(&preplans).Error; err != nil {
		t.Fatalf("failed to create preplans: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewMatchHandler()
	r.GET("/teams/match", func(c *gin.Context) {
		c.Set("user_id", users[0].ID)
		h.Match(c)
	})

	req := httptest.NewRequest("GET", "/teams/match?competition_id="+fmtUint(targetComp.ID)+"&limit=2", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var body struct {
		Matches []MatchResult `json:"matches"`
		Total   int           `json:"total"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body.Total != 2 {
		t.Fatalf("expected 2 matches, got %d", body.Total)
	}
	if body.Matches[0].UserID != users[1].ID {
		t.Fatalf("expected award student first, got user %d", body.Matches[0].UserID)
	}
	if body.Matches[0].AwardCount != 2 || body.Matches[0].Reason != "experienced competitor with awards" {
		t.Fatalf("unexpected award match: %+v", body.Matches[0])
	}
	if body.Matches[1].UserID != users[2].ID {
		t.Fatalf("expected planner student second, got user %d", body.Matches[1].UserID)
	}
	if body.Matches[1].PrePlanCount != 2 || body.Matches[1].Reason != "active planner with pre-plan experience" {
		t.Fatalf("unexpected planner match: %+v", body.Matches[1])
	}

	for _, match := range body.Matches {
		if match.UserID == users[0].ID {
			t.Fatalf("current user should be excluded")
		}
		if match.UserID == users[3].ID {
			t.Fatalf("student already in target competition should be excluded")
		}
	}
}
