package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestGrowthHandler_Constructor(t *testing.T) {
	h := NewGrowthHandler()
	if h == nil {
		t.Fatal("NewGrowthHandler returned nil")
	}
}

func TestGrowthHandler_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewGrowthHandler()
	r.GET("/students/:id/growth", h.GetGrowthProfile)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/students/5/growth", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestGrowthHandler_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewGrowthHandler()

	// Inject user_id into context.
	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.GET("/students/:id/growth", h.GetGrowthProfile)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/students/abc/growth", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid id, got %d", w.Code)
	}
}

func TestGrowthHandler_ZeroID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewGrowthHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.GET("/students/:id/growth", h.GetGrowthProfile)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/students/0/growth", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero id, got %d", w.Code)
	}
}

func TestGrowthProfile_JSON(t *testing.T) {
	now := time.Now()
	profile := GrowthProfile{
		StudentID:   5,
		StudentName: "张明",
		GeneratedAt: now,
		Summary: GrowthSummary{
			TotalCompetitions:  5,
			TotalAwards:        2,
			TotalTeams:         3,
			TotalPrePlans:      4,
			AwardRate:          40.0,
			ParticipationDays:  120,
			TopCompetitionType: "hackathon",
		},
		Competitions: []GrowthComp{
			{ID: 1, Title: "蓝桥杯", Type: "programming", Level: "national", Status: "approved"},
		},
		Awards: []GrowthAward{
			{ID: 1, CompetitionID: 1, CompTitle: "蓝桥杯", RankName: "一等奖", PrizeAmount: 5000, Status: "settled"},
		},
		Skills: []SkillEntry{
			{Name: "编程能力", Score: 100, Count: 3},
			{Name: "创新实践", Score: 66.7, Count: 2},
		},
		Timeline: []GrowthEvent{
			{Date: now, Type: "award", Title: "获得奖项: 一等奖", Details: "蓝桥杯"},
		},
		Recommendations: []string{"表现优秀！继续保持"},
	}

	data, err := json.Marshal(profile)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}

	var decoded GrowthProfile
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("json.Unmarshal failed: %v", err)
	}

	if decoded.StudentID != 5 {
		t.Errorf("expected student_id=5, got %d", decoded.StudentID)
	}
	if decoded.Summary.TotalCompetitions != 5 {
		t.Errorf("expected total_competitions=5, got %d", decoded.Summary.TotalCompetitions)
	}
	if decoded.Summary.AwardRate != 40.0 {
		t.Errorf("expected award_rate=40.0, got %f", decoded.Summary.AwardRate)
	}
	if len(decoded.Skills) != 2 {
		t.Errorf("expected 2 skills, got %d", len(decoded.Skills))
	}
	if decoded.Skills[0].Name != "编程能力" {
		t.Errorf("expected first skill=编程能力, got %s", decoded.Skills[0].Name)
	}
	if len(decoded.Recommendations) != 1 {
		t.Errorf("expected 1 recommendation, got %d", len(decoded.Recommendations))
	}
}

func TestGrowthComp_Fields(t *testing.T) {
	comp := GrowthComp{
		ID:        42,
		Title:     "全国大学生创新创业大赛",
		Type:      "hackathon",
		Level:     "national",
		Status:    "approved",
		TeamName:  "梦之队",
		Role:      "leader",
		AwardRank: "特等奖",
	}

	if comp.ID != 42 {
		t.Errorf("expected id=42, got %d", comp.ID)
	}
	if comp.TeamName != "梦之队" {
		t.Errorf("expected team_name=梦之队, got %s", comp.TeamName)
	}
	if comp.Role != "leader" {
		t.Errorf("expected role=leader, got %s", comp.Role)
	}
}

func TestGrowthAward_Fields(t *testing.T) {
	now := time.Now()
	award := GrowthAward{
		ID:            10,
		CompetitionID: 5,
		CompTitle:     "蓝桥杯",
		RankName:      "一等奖",
		PrizeAmount:   5000.50,
		Status:        "settled",
		SettledAt:     &now,
	}

	if award.PrizeAmount != 5000.50 {
		t.Errorf("expected prize_amount=5000.50, got %f", award.PrizeAmount)
	}
	if award.SettledAt == nil {
		t.Error("expected settled_at to be set")
	}
}

func TestSkillEntry_Fields(t *testing.T) {
	skill := SkillEntry{
		Name:  "人工智能",
		Score: 85.5,
		Count: 4,
	}

	if skill.Name != "人工智能" {
		t.Errorf("expected name=人工智能, got %s", skill.Name)
	}
	if skill.Score != 85.5 {
		t.Errorf("expected score=85.5, got %f", skill.Score)
	}
}

func TestGrowthEvent_Fields(t *testing.T) {
	now := time.Now()
	evt := GrowthEvent{
		Date:    now,
		Type:    "registration",
		Title:   "报名赛事: 测试",
		Details: "详细信息",
	}

	if evt.Type != "registration" {
		t.Errorf("expected type=registration, got %s", evt.Type)
	}
}

func TestGenerateRecommendations_LowParticipation(t *testing.T) {
	p := GrowthProfile{
		Summary: GrowthSummary{
			TotalCompetitions: 1,
			TotalAwards:       0,
			AwardRate:         0,
		},
	}
	recs := generateRecommendations(p)
	if len(recs) == 0 {
		t.Error("expected recommendations for low participation")
	}
	found := false
	for _, r := range recs {
		if r == "建议多参加不同类型的赛事，拓宽视野和技能栈" {
			found = true
		}
	}
	if !found {
		t.Error("expected low participation recommendation")
	}
}

func TestGenerateRecommendations_LowAwardRate(t *testing.T) {
	p := GrowthProfile{
		Summary: GrowthSummary{
			TotalCompetitions: 5,
			TotalAwards:       1,
			AwardRate:         20,
		},
	}
	recs := generateRecommendations(p)
	found := false
	for _, r := range recs {
		if r == "获奖率偏低，建议加强赛前准备，善用AI预案评审工具" {
			found = true
		}
	}
	if !found {
		t.Error("expected low award rate recommendation")
	}
}

func TestGenerateRecommendations_TopSkill(t *testing.T) {
	p := GrowthProfile{
		Summary: GrowthSummary{
			TotalCompetitions: 5,
			TotalAwards:       3,
			AwardRate:         60,
		},
		Skills: []SkillEntry{
			{Name: "编程能力", Score: 90, Count: 4},
		},
	}
	recs := generateRecommendations(p)
	found := false
	for _, r := range recs {
		if r == "在编程能力方向表现突出，建议尝试更高级别赛事" {
			found = true
		}
	}
	if !found {
		t.Error("expected top skill recommendation")
	}
}

func TestGenerateRecommendations_NoPreplans(t *testing.T) {
	p := GrowthProfile{
		Summary: GrowthSummary{
			TotalCompetitions: 3,
			TotalPrePlans:     0,
			TotalAwards:       1,
			AwardRate:         33,
		},
	}
	recs := generateRecommendations(p)
	found := false
	for _, r := range recs {
		if r == "尚未提交预案，建议使用AI预案工具提升项目质量" {
			found = true
		}
	}
	if !found {
		t.Error("expected no preplans recommendation")
	}
}

func TestGenerateRecommendations_Excellent(t *testing.T) {
	p := GrowthProfile{
		Summary: GrowthSummary{
			TotalCompetitions: 10,
			TotalAwards:       8,
			TotalPrePlans:     5,
			AwardRate:         80,
		},
		Skills: []SkillEntry{
			{Name: "编程能力", Score: 70, Count: 3},
		},
	}
	recs := generateRecommendations(p)
	if len(recs) != 1 {
		t.Errorf("expected 1 recommendation for excellent student, got %d", len(recs))
	}
	if recs[0] != "表现优秀！继续保持，可以尝试国家级或国际赛事挑战自我" {
		t.Errorf("unexpected recommendation: %s", recs[0])
	}
}

func TestGrowthSummary_EmptyJSON(t *testing.T) {
	s := GrowthSummary{}
	data, _ := json.Marshal(s)
	var decoded GrowthSummary
	json.Unmarshal(data, &decoded)

	if decoded.TotalCompetitions != 0 {
		t.Errorf("expected 0, got %d", decoded.TotalCompetitions)
	}
	if decoded.AwardRate != 0 {
		t.Errorf("expected 0, got %f", decoded.AwardRate)
	}
}
