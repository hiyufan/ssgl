package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCompetencyHandler_New(t *testing.T) {
	h := NewCompetencyHandler()
	if h == nil {
		t.Fatal("NewCompetencyHandler returned nil")
	}
}

func TestCompetencyHandler_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := NewCompetencyHandler()
	router.GET("/api/v1/students/:id/competency", h.GetCompetencyMap)

	req := httptest.NewRequest("GET", "/api/v1/students/1/competency", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestCompetencyHandler_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := NewCompetencyHandler()

	// Simulate auth middleware setting user_id
	router.GET("/api/v1/students/:id/competency", func(c *gin.Context) {
		c.Set("user_id", uint(1))
		h.GetCompetencyMap(c)
	})

	req := httptest.NewRequest("GET", "/api/v1/students/abc/competency", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCompLevel(t *testing.T) {
	tests := []struct {
		score float64
		want  string
	}{
		{95, "专家"},
		{90, "专家"},
		{80, "精通"},
		{75, "精通"},
		{60, "熟练"},
		{55, "熟练"},
		{40, "进阶"},
		{30, "进阶"},
		{10, "初学"},
		{0, "初学"},
	}
	for _, tt := range tests {
		got := compLevel(tt.score)
		if got != tt.want {
			t.Errorf("compLevel(%v) = %q, want %q", tt.score, got, tt.want)
		}
	}
}

func TestCompGrade(t *testing.T) {
	tests := []struct {
		score float64
		want  string
	}{
		{95, "S"},
		{90, "S"},
		{80, "A"},
		{75, "A"},
		{60, "B"},
		{55, "B"},
		{40, "C"},
		{35, "C"},
		{20, "D"},
		{0, "D"},
	}
	for _, tt := range tests {
		got := compGrade(tt.score)
		if got != tt.want {
			t.Errorf("compGrade(%v) = %q, want %q", tt.score, got, tt.want)
		}
	}
}

func TestCalcDimScore(t *testing.T) {
	t.Run("zero input gives zero", func(t *testing.T) {
		got := calcDimScore(compTypeStat{}, compTypeStat{}, compTypeStat{})
		if got != 0 {
			t.Errorf("expected 0, got %v", got)
		}
	})

	t.Run("primary count contributes 15 each", func(t *testing.T) {
		got := calcDimScore(compTypeStat{count: 2}, compTypeStat{}, compTypeStat{})
		if got != 30 {
			t.Errorf("expected 30, got %v", got)
		}
	})

	t.Run("primary awards contribute 20 each", func(t *testing.T) {
		got := calcDimScore(compTypeStat{awards: 1}, compTypeStat{}, compTypeStat{})
		if got != 20 {
			t.Errorf("expected 20, got %v", got)
		}
	})

	t.Run("capped at 100", func(t *testing.T) {
		got := calcDimScore(compTypeStat{count: 10, awards: 5, teams: 5}, compTypeStat{count: 5, awards: 3}, compTypeStat{count: 3, awards: 2})
		if got != 100 {
			t.Errorf("expected 100 (capped), got %v", got)
		}
	})

	t.Run("secondary contributes less", func(t *testing.T) {
		primary := calcDimScore(compTypeStat{count: 2}, compTypeStat{}, compTypeStat{})
		secondary := calcDimScore(compTypeStat{}, compTypeStat{count: 2}, compTypeStat{})
		if secondary >= primary {
			t.Errorf("secondary (%v) should be less than primary (%v)", secondary, primary)
		}
	})
}

func TestBuildCompEvidence(t *testing.T) {
	t.Run("programming evidence", func(t *testing.T) {
		stats := map[string]compTypeStat{
			"hackathon":   {count: 3, awards: 1},
			"programming": {count: 2, awards: 1},
		}
		ev := buildCompEvidence("programming", stats, 5, 2, 3)
		if ev == "" {
			t.Error("evidence should not be empty")
		}
	})

	t.Run("teamwork evidence", func(t *testing.T) {
		ev := buildCompEvidence("teamwork", map[string]compTypeStat{}, 5, 2, 4)
		if ev == "" {
			t.Error("evidence should not be empty")
		}
	})

	t.Run("unknown key returns empty", func(t *testing.T) {
		ev := buildCompEvidence("unknown", map[string]compTypeStat{}, 0, 0, 0)
		if ev != "" {
			t.Errorf("expected empty, got %q", ev)
		}
	})
}

func TestBuildCompRoadmap(t *testing.T) {
	t.Run("empty dims gives empty roadmap", func(t *testing.T) {
		roadmap := buildCompRoadmap([]CompetencyDimension{})
		if len(roadmap) != 0 {
			t.Errorf("expected empty, got %d", len(roadmap))
		}
	})

	t.Run("strong dims (>=80) are skipped", func(t *testing.T) {
		dims := []CompetencyDimension{
			{Name: "编程能力", Score: 90},
			{Name: "创新思维", Score: 85},
			{Name: "商业素养", Score: 80},
		}
		roadmap := buildCompRoadmap(dims)
		if len(roadmap) != 0 {
			t.Errorf("expected 0 (all strong), got %d", len(roadmap))
		}
	})

	t.Run("weak dims produce roadmap steps", func(t *testing.T) {
		dims := []CompetencyDimension{
			{Name: "编程能力", Score: 90},
			{Name: "创新思维", Score: 40},
			{Name: "商业素养", Score: 20},
			{Name: "团队协作", Score: 10},
			{Name: "项目管理", Score: 50},
		}
		roadmap := buildCompRoadmap(dims)
		if len(roadmap) == 0 {
			t.Fatal("expected non-empty roadmap")
		}
		// First step should be the weakest
		if roadmap[0].Dimension != "团队协作" {
			t.Errorf("expected first step to be 团队协作 (weakest), got %s", roadmap[0].Dimension)
		}
		if roadmap[0].Priority != 1 {
			t.Errorf("expected priority 1, got %d", roadmap[0].Priority)
		}
		if roadmap[0].Gap <= 0 {
			t.Error("gap should be positive")
		}
		if len(roadmap[0].Actions) == 0 {
			t.Error("actions should not be empty")
		}
	})

	t.Run("max 3 steps", func(t *testing.T) {
		dims := []CompetencyDimension{
			{Name: "A", Score: 10},
			{Name: "B", Score: 20},
			{Name: "C", Score: 30},
			{Name: "D", Score: 40},
			{Name: "E", Score: 50},
		}
		roadmap := buildCompRoadmap(dims)
		if len(roadmap) > 3 {
			t.Errorf("expected max 3, got %d", len(roadmap))
		}
	})
}

func TestCompRoadmapActions(t *testing.T) {
	dims := []string{"编程能力", "创新思维", "商业素养", "团队协作", "项目管理", "学术研究", "AI应用", "未知"}
	for _, dim := range dims {
		actions := compRoadmapActions(dim, 30)
		if len(actions) == 0 {
			t.Errorf("compRoadmapActions(%q) returned empty actions", dim)
		}
	}

	t.Run("low score programming adds extra action", func(t *testing.T) {
		actions := compRoadmapActions("编程能力", 20)
		if len(actions) < 3 {
			t.Errorf("expected 3+ actions for low score, got %d", len(actions))
		}
	})
}

func TestBuildCompBadges(t *testing.T) {
	t.Run("first competition earns badge", func(t *testing.T) {
		result := CompetencyMap{Grade: "D", Dimensions: []CompetencyDimension{}}
		badges := buildCompBadges(result, 0, 1, 1)
		found := false
		for _, b := range badges {
			if b.Name == "初出茅庐" {
				found = true
			}
		}
		if !found {
			t.Error("expected '初出茅庐' badge")
		}
	})

	t.Run("S grade earns badge", func(t *testing.T) {
		result := CompetencyMap{Grade: "S", Dimensions: []CompetencyDimension{}}
		badges := buildCompBadges(result, 0, 0, 0)
		found := false
		for _, b := range badges {
			if b.Name == "全能王者" {
				found = true
			}
		}
		if !found {
			t.Error("expected '全能王者' badge for S grade")
		}
	})

	t.Run("expert dimension earns badge", func(t *testing.T) {
		result := CompetencyMap{
			Grade:      "B",
			Dimensions: []CompetencyDimension{{Name: "编程能力", Score: 95}},
		}
		badges := buildCompBadges(result, 0, 0, 0)
		found := false
		for _, b := range badges {
			if b.Name == "编程能力专家" {
				found = true
			}
		}
		if !found {
			t.Error("expected '编程能力专家' badge")
		}
	})

	t.Run("multiple awards earn multiple badges", func(t *testing.T) {
		result := CompetencyMap{Grade: "D", Dimensions: []CompetencyDimension{}}
		badges := buildCompBadges(result, 5, 10, 5)
		names := map[string]bool{}
		for _, b := range badges {
			names[b.Name] = true
		}
		if !names["首战告捷"] {
			t.Error("missing '首战告捷'")
		}
		if !names["获奖常客"] {
			t.Error("missing '获奖常客'")
		}
		if !names["赛事达人"] {
			t.Error("missing '赛事达人'")
		}
		if !names["社交达人"] {
			t.Error("missing '社交达人'")
		}
	})
}

func TestCompetencyResponseJSON(t *testing.T) {
	result := CompetencyMap{
		StudentID:    1,
		StudentName:  "测试学生",
		OverallScore: 72.5,
		Grade:        "A",
		Dimensions: []CompetencyDimension{
			{Name: "编程能力", Score: 85, Level: "精通", Weight: 0.20, Description: "test", Evidence: "test evidence"},
		},
		Strengths:  []string{"编程能力"},
		Weaknesses: []string{"商业素养"},
		Roadmap: []RoadmapStep{
			{Dimension: "商业素养", Target: 50, Current: 25, Gap: 25, Actions: []string{"参加商业赛事"}, Priority: 1},
		},
		Badges: []CompetencyBadge{
			{Name: "测试徽章", Description: "test", Icon: "🏆"},
		},
	}

	data, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded CompetencyMap
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.StudentID != 1 {
		t.Errorf("expected student_id=1, got %d", decoded.StudentID)
	}
	if decoded.Grade != "A" {
		t.Errorf("expected grade=A, got %s", decoded.Grade)
	}
	if len(decoded.Dimensions) != 1 {
		t.Errorf("expected 1 dimension, got %d", len(decoded.Dimensions))
	}
	if decoded.Dimensions[0].Level != "精通" {
		t.Errorf("expected level=精通, got %s", decoded.Dimensions[0].Level)
	}
	if len(decoded.Badges) != 1 {
		t.Errorf("expected 1 badge, got %d", len(decoded.Badges))
	}
}

func TestCompetencyDimensionDefinitions(t *testing.T) {
	// Ensure all dimension definitions are valid
	totalWeight := 0.0
	for _, def := range competencyDimDefs {
		if def.Name == "" {
			t.Error("dimension name should not be empty")
		}
		if def.Key == "" {
			t.Error("dimension key should not be empty")
		}
		if def.Weight <= 0 || def.Weight > 1 {
			t.Errorf("dimension %q has invalid weight: %v", def.Name, def.Weight)
		}
		totalWeight += def.Weight
	}

	// Weights should approximately sum to 1.0
	if math.Abs(totalWeight-1.0) > 0.01 {
		t.Errorf("dimension weights sum to %v, expected ~1.0", totalWeight)
	}
}
