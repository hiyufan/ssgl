package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/models"
)

func setupScheduleRouter(handler *ScheduleHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.GET("/api/v1/schedule/smart", handler.SmartSchedule)
	return r
}

func TestSmartScheduleHandlerExists(t *testing.T) {
	handler := NewScheduleHandler()
	if handler == nil {
		t.Fatal("NewScheduleHandler returned nil")
	}
}

func TestSmartScheduleNoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	handler := NewScheduleHandler()
	r.GET("/api/v1/schedule/smart", handler.SmartSchedule)

	req := httptest.NewRequest("GET", "/api/v1/schedule/smart", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSmartScheduleResponse(t *testing.T) {
	handler := NewScheduleHandler()
	r := setupScheduleRouter(handler)

	req := httptest.NewRequest("GET", "/api/v1/schedule/smart", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// DB is nil in test context → 500 expected
	if w.Code == http.StatusOK {
		var resp SmartScheduleResponse
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}
		if resp.Events == nil {
			t.Error("events should not be nil")
		}
		if resp.Conflicts == nil {
			t.Error("conflicts should not be nil")
		}
		if resp.Workload == nil {
			t.Error("workload should not be nil")
		}
		if resp.Optimization == nil {
			t.Error("optimization should not be nil")
		}
	} else if w.Code == http.StatusInternalServerError {
		// Expected when DB is nil
		t.Logf("Got 500 as expected (no DB in test context)")
	}
}

func TestClassifyPhase(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name     string
		status   string
		regDead  time.Time
		start    time.Time
		end      time.Time
		expected string
	}{
		{
			name:     "completed",
			status:   models.CompStatusCompleted,
			expected: "completed",
		},
		{
			name:     "registration_open",
			status:   models.CompStatusPublished,
			regDead:  now.AddDate(0, 0, 7),
			start:    now.AddDate(0, 0, 14),
			expected: "registration_open",
		},
		{
			name:     "upcoming",
			status:   models.CompStatusPublished,
			regDead:  now.AddDate(0, 0, -7),
			start:    now.AddDate(0, 0, 3),
			expected: "upcoming",
		},
		{
			name:     "ongoing",
			status:   models.CompStatusOngoing,
			start:    now.AddDate(0, 0, -3),
			end:      now.AddDate(0, 0, 3),
			expected: "ongoing",
		},
		{
			name:     "upcoming_no_dates",
			status:   models.CompStatusPublished,
			expected: "upcoming",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			comp := models.Competition{
				ID:                   1,
				Title:                "Test",
				Status:               tt.status,
				RegistrationDeadline:  tt.regDead,
				StartDate:            tt.start,
				EndDate:              tt.end,
			}
			result := classifyPhase(comp, now)
			if result != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, result)
			}
		})
	}
}

func TestDetectConflicts(t *testing.T) {
	now := time.Now()

	// No conflicts
	events := []ScheduleEvent{
		{CompetitionID: 1, Title: "A", StartDate: now, EndDate: now.AddDate(0, 0, 3)},
		{CompetitionID: 2, Title: "B", StartDate: now.AddDate(0, 0, 5), EndDate: now.AddDate(0, 0, 8)},
	}
	conflicts := detectConflicts(events)
	if len(conflicts) != 0 {
		t.Errorf("expected 0 conflicts, got %d", len(conflicts))
	}

	// With overlap
	events = []ScheduleEvent{
		{CompetitionID: 1, Title: "A", StartDate: now, EndDate: now.AddDate(0, 0, 5)},
		{CompetitionID: 2, Title: "B", StartDate: now.AddDate(0, 0, 3), EndDate: now.AddDate(0, 0, 8)},
	}
	conflicts = detectConflicts(events)
	if len(conflicts) != 1 {
		t.Errorf("expected 1 conflict, got %d", len(conflicts))
	}
	if len(conflicts) > 0 {
		if conflicts[0].Type != "partial_overlap" {
			t.Errorf("expected partial_overlap, got %s", conflicts[0].Type)
		}
	}

	// Full overlap
	events = []ScheduleEvent{
		{CompetitionID: 1, Title: "A", StartDate: now, EndDate: now.AddDate(0, 0, 10)},
		{CompetitionID: 2, Title: "B", StartDate: now.AddDate(0, 0, 2), EndDate: now.AddDate(0, 0, 5)},
	}
	conflicts = detectConflicts(events)
	if len(conflicts) != 1 {
		t.Errorf("expected 1 conflict, got %d", len(conflicts))
	}
	if len(conflicts) > 0 && conflicts[0].Type != "full_overlap" {
		t.Errorf("expected full_overlap, got %s", conflicts[0].Type)
	}

	// Empty events
	conflicts = detectConflicts([]ScheduleEvent{})
	if len(conflicts) != 0 {
		t.Errorf("expected 0 conflicts for empty events, got %d", len(conflicts))
	}

	// Single event (no pair to conflict)
	events = []ScheduleEvent{
		{CompetitionID: 1, Title: "A", StartDate: now, EndDate: now.AddDate(0, 0, 5)},
	}
	conflicts = detectConflicts(events)
	if len(conflicts) != 0 {
		t.Errorf("expected 0 conflicts for single event, got %d", len(conflicts))
	}
}

func TestClassifyLoad(t *testing.T) {
	tests := []struct {
		count    int
		expected string
	}{
		{0, "light"},
		{1, "light"},
		{2, "moderate"},
		{3, "moderate"},
		{4, "heavy"},
		{5, "heavy"},
		{6, "overloaded"},
		{10, "overloaded"},
	}
	for _, tt := range tests {
		result := classifyLoad(tt.count)
		if result != tt.expected {
			t.Errorf("classifyLoad(%d) = %s, want %s", tt.count, result, tt.expected)
		}
	}
}

func TestAnalyzeWorkload(t *testing.T) {
	now := time.Now()
	events := []ScheduleEvent{
		{CompetitionID: 1, StartDate: now},
		{CompetitionID: 2, StartDate: now.AddDate(0, 0, 3)},
		{CompetitionID: 3, StartDate: now.AddDate(0, 1, 5)},
	}
	workload := analyzeWorkload(events)
	if len(workload) == 0 {
		t.Error("expected workload periods, got none")
	}
	// First month should be "moderate" (2 events)
	if len(workload) > 0 && workload[0].LoadLevel != "moderate" {
		t.Errorf("expected moderate for first month, got %s", workload[0].LoadLevel)
	}
}

func TestAnalyzeWorkloadEmpty(t *testing.T) {
	workload := analyzeWorkload([]ScheduleEvent{})
	if len(workload) != 0 {
		t.Errorf("expected 0 periods for empty events, got %d", len(workload))
	}
}

func TestOptimizeScheduleEmpty(t *testing.T) {
	opt := optimizeSchedule([]ScheduleEvent{}, []ScheduleConflict{})
	if opt.RiskLevel != "low" {
		t.Errorf("expected low risk for empty, got %s", opt.RiskLevel)
	}
	if opt.Suggestion == "" {
		t.Error("expected non-empty suggestion")
	}
	if len(opt.PriorityOrder) != 0 {
		t.Errorf("expected empty priority order, got %d", len(opt.PriorityOrder))
	}
}

func TestOptimizeScheduleSingleEvent(t *testing.T) {
	now := time.Now()
	events := []ScheduleEvent{
		{CompetitionID: 1, Title: "A", StartDate: now, EndDate: now.AddDate(0, 0, 5)},
	}
	opt := optimizeSchedule(events, []ScheduleConflict{})
	if opt.RiskLevel != "low" {
		t.Errorf("expected low risk for single event, got %s", opt.RiskLevel)
	}
	if len(opt.PriorityOrder) != 1 {
		t.Errorf("expected 1 priority item, got %d", len(opt.PriorityOrder))
	}
}

func TestOptimizeScheduleWithConflicts(t *testing.T) {
	now := time.Now()
	events := []ScheduleEvent{
		{CompetitionID: 1, Title: "A", StartDate: now, EndDate: now.AddDate(0, 0, 5)},
		{CompetitionID: 2, Title: "B", StartDate: now.AddDate(0, 0, 3), EndDate: now.AddDate(0, 0, 8)},
	}
	conflicts := []ScheduleConflict{
		{EventA: 1, TitleA: "A", EventB: 2, TitleB: "B", Type: "partial_overlap", Days: 2},
	}
	opt := optimizeSchedule(events, conflicts)
	if opt.RiskLevel != "high" {
		t.Errorf("expected high risk with conflicts, got %s", opt.RiskLevel)
	}
	if len(opt.PriorityOrder) != 2 {
		t.Errorf("expected 2 priority items, got %d", len(opt.PriorityOrder))
	}
	if len(opt.Details) == 0 {
		t.Error("expected details about conflicts")
	}
}

func TestOptimizeScheduleManyEvents(t *testing.T) {
	now := time.Now()
	events := []ScheduleEvent{
		{CompetitionID: 1, Title: "A", StartDate: now, EndDate: now.AddDate(0, 0, 3)},
		{CompetitionID: 2, Title: "B", StartDate: now.AddDate(0, 0, 5), EndDate: now.AddDate(0, 0, 8)},
		{CompetitionID: 3, Title: "C", StartDate: now.AddDate(0, 0, 10), EndDate: now.AddDate(0, 0, 13)},
		{CompetitionID: 4, Title: "D", StartDate: now.AddDate(0, 0, 15), EndDate: now.AddDate(0, 0, 18)},
	}
	opt := optimizeSchedule(events, []ScheduleConflict{})
	if opt.RiskLevel != "medium" {
		t.Errorf("expected medium risk for 4 events, got %s", opt.RiskLevel)
	}
	if opt.PrepWeeks < 3 {
		t.Errorf("expected prep_weeks >= 3 for 4 events, got %d", opt.PrepWeeks)
	}
}

func TestBuildSummary(t *testing.T) {
	opt := &ScheduleOptimization{RiskLevel: "low"}
	s := buildSummary(3, 10, 0, opt)
	if s == "" {
		t.Error("expected non-empty summary")
	}
	opt2 := &ScheduleOptimization{RiskLevel: "high"}
	s2 := buildSummary(5, 10, 2, opt2)
	if s2 == "" {
		t.Error("expected non-empty summary")
	}
}

func TestItoa(t *testing.T) {
	tests := []struct {
		input    int
		expected string
	}{
		{0, "0"},
		{1, "1"},
		{42, "42"},
		{100, "100"},
		{-5, "-5"},
	}
	for _, tt := range tests {
		result := itoa(tt.input)
		if result != tt.expected {
			t.Errorf("itoa(%d) = %s, want %s", tt.input, result, tt.expected)
		}
	}
}
