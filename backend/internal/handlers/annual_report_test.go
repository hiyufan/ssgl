package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestNewAnnualReportHandler(t *testing.T) {
	handler := NewAnnualReportHandler()
	if handler == nil {
		t.Error("NewAnnualReportHandler returned nil")
	}
}

func TestAnnualReportHandler_NoDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/report/annual", nil)

	h := NewAnnualReportHandler()
	h.Generate(c)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500 when DB unavailable, got %d", w.Code)
	}
}

func TestAnnualReport_StructJSON(t *testing.T) {
	report := AnnualReport{
		GeneratedAt: time.Date(2026, 6, 20, 0, 0, 0, 0, time.UTC),
		Year:        2026,
		Platform: PlatformOverview{
			TotalUsers:        100,
			TotalStudents:     80,
			TotalTeachers:     15,
			TotalAdmins:       5,
			TotalCompetitions: 20,
			TotalTeams:        50,
			TotalAwards:       30,
			TotalPrePlans:     40,
			TotalEvaluations:  25,
			ActiveCompetitions: 5,
			SettledAwards:     20,
			AvgTeamSize:       3.5,
			StudentParticipation: 75.0,
		},
		Competitions: CompetitionBreakdown{
			Total:     20,
			Published: 8,
			Ongoing:   5,
			Completed: 5,
			Draft:     2,
			ByType: []TypeCount{
				{Type: "hackathon", Count: 8},
				{Type: "innovation", Count: 6},
				{Type: "research", Count: 6},
			},
			AvgTeamsPerComp: 2.5,
		},
		Teams: TeamReport{
			Total:       50,
			WithMembers: 45,
			WithPlans:   30,
			AvgSize:     3.5,
			MaxSize:     6,
		},
		Students: StudentReport{
			Total:           80,
			WithTeams:       60,
			WithAwards:      30,
			WithPrePlans:    40,
			TeamRate:        75.0,
			AwardRate:       37.5,
			AvgCompetitions: 0.625,
		},
		Awards: AwardReport{
			Total:        30,
			Settled:      20,
			Pending:      10,
			TotalPrize:   50000,
			AvgPrize:     1666.67,
			TopRankCount: 15,
		},
		AIUsage: AIUsageReport{
			TotalPrePlanReviews: 35,
			TotalAIAnalyses:     20,
			TotalRAGDocuments:   15,
		},
		Trends: []MonthlyTrend{
			{Month: "2026-01", Competitions: 2, Teams: 5, Awards: 3, PrePlans: 4},
			{Month: "2026-02", Competitions: 3, Teams: 8, Awards: 5, PrePlans: 6},
		},
		TopCompetitions: []TopCompetition{
			{ID: 1, Title: "蓝桥杯", Type: "hackathon", TeamCount: 15, AwardCount: 8, PrePlanCount: 10},
		},
		TopTeams: []TopTeam{
			{ID: 1, Name: "梦之队", CompetitionID: 1, CompTitle: "蓝桥杯", MemberCount: 4, AwardCount: 3, PrePlanCount: 2},
		},
		Highlights: []Highlight{
			{Type: "platform", Title: "平台规模", Details: "累计 20 个赛事、50 支团队、30 个奖项", Icon: "🏗️"},
			{Type: "engagement", Title: "高参与率", Details: "75.0% 的学生已组建团队参赛", Icon: "🎯"},
		},
	}

	data, err := json.Marshal(report)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded AnnualReport
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.Year != 2026 {
		t.Errorf("expected year=2026, got %d", decoded.Year)
	}
	if decoded.Platform.TotalUsers != 100 {
		t.Errorf("expected total_users=100, got %d", decoded.Platform.TotalUsers)
	}
	if decoded.Platform.TotalStudents != 80 {
		t.Errorf("expected total_students=80, got %d", decoded.Platform.TotalStudents)
	}
	if len(decoded.Competitions.ByType) != 3 {
		t.Errorf("expected 3 type counts, got %d", len(decoded.Competitions.ByType))
	}
	if len(decoded.Trends) != 2 {
		t.Errorf("expected 2 trends, got %d", len(decoded.Trends))
	}
	if len(decoded.TopCompetitions) != 1 {
		t.Errorf("expected 1 top competition, got %d", len(decoded.TopCompetitions))
	}
	if decoded.TopCompetitions[0].Title != "蓝桥杯" {
		t.Errorf("expected title=蓝桥杯, got %s", decoded.TopCompetitions[0].Title)
	}
	if len(decoded.TopTeams) != 1 {
		t.Errorf("expected 1 top team, got %d", len(decoded.TopTeams))
	}
	if len(decoded.Highlights) != 2 {
		t.Errorf("expected 2 highlights, got %d", len(decoded.Highlights))
	}
	if decoded.AIUsage.TotalPrePlanReviews != 35 {
		t.Errorf("expected preplan_reviews=35, got %d", decoded.AIUsage.TotalPrePlanReviews)
	}
}

func TestPlatformOverview_Fields(t *testing.T) {
	po := PlatformOverview{
		TotalUsers:        50,
		TotalStudents:     40,
		TotalTeachers:     8,
		TotalAdmins:       2,
		TotalCompetitions: 10,
		TotalTeams:        25,
		TotalAwards:       15,
		TotalPrePlans:     20,
		TotalEvaluations:  12,
		ActiveCompetitions: 3,
		SettledAwards:     10,
		AvgTeamSize:       3.2,
		StudentParticipation: 62.5,
	}

	data, err := json.Marshal(po)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded PlatformOverview
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.TotalUsers != 50 {
		t.Errorf("expected 50, got %d", decoded.TotalUsers)
	}
	if decoded.AvgTeamSize != 3.2 {
		t.Errorf("expected 3.2, got %f", decoded.AvgTeamSize)
	}
}

func TestCompetitionBreakdown_JSON(t *testing.T) {
	cb := CompetitionBreakdown{
		Total:     15,
		Published: 5,
		Ongoing:   3,
		Completed: 5,
		Draft:     2,
		ByType: []TypeCount{
			{Type: "hackathon", Count: 5},
			{Type: "innovation", Count: 10},
		},
		AvgTeamsPerComp: 3.0,
	}

	data, err := json.Marshal(cb)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded CompetitionBreakdown
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.Total != 15 {
		t.Errorf("expected total=15, got %d", decoded.Total)
	}
	if len(decoded.ByType) != 2 {
		t.Errorf("expected 2 types, got %d", len(decoded.ByType))
	}
	if decoded.ByType[0].Type != "hackathon" {
		t.Errorf("expected hackathon, got %s", decoded.ByType[0].Type)
	}
}

func TestHighlight_JSON(t *testing.T) {
	h := Highlight{
		Type:    "platform",
		Title:   "测试亮点",
		Details: "这是测试详情",
		Icon:    "🏆",
	}

	data, err := json.Marshal(h)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded Highlight
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.Type != "platform" {
		t.Errorf("expected platform, got %s", decoded.Type)
	}
	if decoded.Icon != "🏆" {
		t.Errorf("expected 🏆, got %s", decoded.Icon)
	}
}

func TestMonthlyTrend_JSON(t *testing.T) {
	trend := MonthlyTrend{
		Month:        "2026-06",
		Competitions: 5,
		Teams:        12,
		Awards:       8,
		PrePlans:     10,
	}

	data, err := json.Marshal(trend)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded MonthlyTrend
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.Month != "2026-06" {
		t.Errorf("expected 2026-06, got %s", decoded.Month)
	}
	if decoded.Competitions != 5 {
		t.Errorf("expected 5, got %d", decoded.Competitions)
	}
}

func TestAwardReport_JSON(t *testing.T) {
	ar := AwardReport{
		Total:        25,
		Settled:      18,
		Pending:      7,
		TotalPrize:   42000,
		AvgPrize:     1680,
		TopRankCount: 12,
	}

	data, err := json.Marshal(ar)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded AwardReport
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.Total != 25 {
		t.Errorf("expected 25, got %d", decoded.Total)
	}
	if decoded.Settled != 18 {
		t.Errorf("expected 18, got %d", decoded.Settled)
	}
	if decoded.TotalPrize != 42000 {
		t.Errorf("expected 42000, got %f", decoded.TotalPrize)
	}
}

func BenchmarkNewAnnualReportHandler(b *testing.B) {
	for i := 0; i < b.N; i++ {
		NewAnnualReportHandler()
	}
}
