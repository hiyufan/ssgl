package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/models"
)

func TestNewAchievementPointsHandler(t *testing.T) {
	h := NewAchievementPointsHandler()
	if h == nil {
		t.Fatal("NewAchievementPointsHandler returned nil")
	}
}

func TestAchievementPoints_ListPoints_NoDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewAchievementPointsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/points", nil)
	c.Set("user_id", uint(1))

	h.ListPoints(c)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestAchievementPoints_GetMyPoints_NoDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewAchievementPointsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/points/me", nil)
	c.Set("user_id", uint(1))

	h.GetMyPoints(c)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestAchievementPoints_ListPoints_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewAchievementPointsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/points", nil)
	// No user_id set

	h.ListPoints(c)

	// Without DB, returns 503 before auth check
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestAchievementPoints_Leaderboard_NoDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewAchievementPointsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/points/leaderboard", nil)

	h.Leaderboard(c)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestAchievementPoints_AwardPoints_NoDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewAchievementPointsHandler()

	body, _ := json.Marshal(map[string]interface{}{
		"user_id": 1,
		"points":  10,
		"reason":  "test",
	})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/points/award", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.AwardPoints(c)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestAchievementPoints_PointHistory_BadID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewAchievementPointsHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/points/history/abc", nil)
	c.Params = gin.Params{{Key: "user_id", Value: "abc"}}

	h.PointHistory(c)

	// Without DB, returns 503 before parsing ID
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestAchievementPointModel(t *testing.T) {
	p := models.AchievementPoint{
		UserID:   1,
		Points:   10,
		Reason:   "test",
		SourceID: 42,
		Source:   "competition",
	}

	if p.TableName() != "achievement_points" {
		t.Errorf("expected table name 'achievement_points', got '%s'", p.TableName())
	}

	data, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("failed to marshal AchievementPoint: %v", err)
	}

	var decoded models.AchievementPoint
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AchievementPoint: %v", err)
	}

	if decoded.UserID != 1 {
		t.Errorf("expected user_id 1, got %d", decoded.UserID)
	}
	if decoded.Points != 10 {
		t.Errorf("expected points 10, got %d", decoded.Points)
	}
	if decoded.Reason != "test" {
		t.Errorf("expected reason 'test', got '%s'", decoded.Reason)
	}
	if decoded.SourceID != 42 {
		t.Errorf("expected source_id 42, got %d", decoded.SourceID)
	}
}

func TestPointConstants(t *testing.T) {
	if models.PointRegister <= 0 {
		t.Error("PointRegister should be positive")
	}
	if models.PointTeamCreate <= 0 {
		t.Error("PointTeamCreate should be positive")
	}
	if models.PointAwardWin <= models.PointRegister {
		t.Error("Award points should be more than register points")
	}
	if models.PointPrePlan <= 0 {
		t.Error("PointPrePlan should be positive")
	}
	if models.PointTeamJoin <= 0 {
		t.Error("PointTeamJoin should be positive")
	}
	if models.PointAIReview <= 0 {
		t.Error("PointAIReview should be positive")
	}
	if models.PointMilestone <= 0 {
		t.Error("PointMilestone should be positive")
	}
	if models.PointEval <= 0 {
		t.Error("PointEval should be positive")
	}
}

func TestPointReasons(t *testing.T) {
	expectedReasons := []string{
		"competition_register", "team_create", "team_join",
		"preplan_submit", "ai_review", "award_win",
		"milestone_complete", "evaluation_submit", "showcase_feature",
	}

	for _, reason := range expectedReasons {
		if label, ok := models.PointReasons[reason]; !ok {
			t.Errorf("missing label for reason '%s'", reason)
		} else if label == "" {
			t.Errorf("empty label for reason '%s'", reason)
		}
	}
}

func TestAchievementPoints_AwardPoints_InvalidPoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewAchievementPointsHandler()

	// Test with negative points
	body, _ := json.Marshal(map[string]interface{}{
		"user_id": 1,
		"points":  -5,
		"reason":  "test",
	})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/points/award", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	h.AwardPoints(c)

	// Without DB, returns 503
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

func TestLeaderboardEntry_JSON(t *testing.T) {
	type LeaderboardEntry struct {
		UserID      uint   `json:"user_id"`
		Username    string `json:"username"`
		RealName    string `json:"real_name"`
		Dept        string `json:"dept"`
		TotalPoints int    `json:"total_points"`
		Rank        int    `json:"rank"`
	}

	entry := LeaderboardEntry{
		UserID:      42,
		Username:    "test_user",
		RealName:    "测试用户",
		Dept:        "计算机系",
		TotalPoints: 150,
		Rank:        1,
	}

	data, err := json.Marshal(entry)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded LeaderboardEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.TotalPoints != 150 {
		t.Errorf("expected 150 points, got %d", decoded.TotalPoints)
	}
	if decoded.Rank != 1 {
		t.Errorf("expected rank 1, got %d", decoded.Rank)
	}
}
