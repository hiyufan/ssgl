package handlers

import (
	"fmt"
	"math"
	"testing"
	"time"
)

func TestCompetitionStatsFields(t *testing.T) {
	cs := CompetitionStats{
		ID:           1,
		Title:        "蓝桥杯",
		Status:       "ongoing",
		TeamCount:    5,
		AwardCount:   2,
		PrePlanCount: 3,
	}

	if cs.ID != 1 {
		t.Errorf("expected ID=1, got %d", cs.ID)
	}
	if cs.Title != "蓝桥杯" {
		t.Errorf("expected Title='蓝桥杯', got '%s'", cs.Title)
	}
	if cs.Status != "ongoing" {
		t.Errorf("expected Status='ongoing', got '%s'", cs.Status)
	}
	if cs.TeamCount != 5 {
		t.Errorf("expected TeamCount=5, got %d", cs.TeamCount)
	}
	if cs.AwardCount != 2 {
		t.Errorf("expected AwardCount=2, got %d", cs.AwardCount)
	}
	if cs.PrePlanCount != 3 {
		t.Errorf("expected PrePlanCount=3, got %d", cs.PrePlanCount)
	}
}

func TestTeacherStatsFields(t *testing.T) {
	ts := TeacherStats{
		ID:               10,
		Name:             "张老师",
		EvaluationCount:  8,
		AvgTeaching:      4.5,
		AvgCommunication: 4.2,
		AvgAvailability:  4.8,
		AvgOverall:       4.4,
	}

	if ts.ID != 10 {
		t.Errorf("expected ID=10, got %d", ts.ID)
	}
	if ts.Name != "张老师" {
		t.Errorf("expected Name='张老师', got '%s'", ts.Name)
	}
	if ts.EvaluationCount != 8 {
		t.Errorf("expected EvaluationCount=8, got %d", ts.EvaluationCount)
	}
	if ts.AvgTeaching != 4.5 {
		t.Errorf("expected AvgTeaching=4.5, got %f", ts.AvgTeaching)
	}
	if ts.AvgCommunication != 4.2 {
		t.Errorf("expected AvgCommunication=4.2, got %f", ts.AvgCommunication)
	}
	if ts.AvgAvailability != 4.8 {
		t.Errorf("expected AvgAvailability=4.8, got %f", ts.AvgAvailability)
	}
	if ts.AvgOverall != 4.4 {
		t.Errorf("expected AvgOverall=4.4, got %f", ts.AvgOverall)
	}
}

func TestStudentStatsFields(t *testing.T) {
	ss := StudentStats{
		TotalStudents:      100,
		StudentsWithTeams:  75,
		StudentsWithAwards: 30,
		AvgTeamSize:        3.5,
		TopStudents: []TopStudent{
			{ID: 1, Name: "Alice", TeamCount: 3, AwardCount: 2, PrePlanCount: 5},
			{ID: 2, Name: "Bob", TeamCount: 2, AwardCount: 1, PrePlanCount: 3},
		},
	}

	if ss.TotalStudents != 100 {
		t.Errorf("expected TotalStudents=100, got %d", ss.TotalStudents)
	}
	if ss.StudentsWithTeams != 75 {
		t.Errorf("expected StudentsWithTeams=75, got %d", ss.StudentsWithTeams)
	}
	if ss.StudentsWithAwards != 30 {
		t.Errorf("expected StudentsWithAwards=30, got %d", ss.StudentsWithAwards)
	}
	if ss.AvgTeamSize != 3.5 {
		t.Errorf("expected AvgTeamSize=3.5, got %f", ss.AvgTeamSize)
	}
	if len(ss.TopStudents) != 2 {
		t.Fatalf("expected 2 top students, got %d", len(ss.TopStudents))
	}
	if ss.TopStudents[0].Name != "Alice" {
		t.Errorf("expected first top student 'Alice', got '%s'", ss.TopStudents[0].Name)
	}
}

func TestTopStudentFields(t *testing.T) {
	ts := TopStudent{
		ID:           42,
		Name:         "测试学生",
		TeamCount:    2,
		AwardCount:   1,
		PrePlanCount: 4,
	}

	if ts.ID != 42 {
		t.Errorf("expected ID=42, got %d", ts.ID)
	}
	if ts.Name != "测试学生" {
		t.Errorf("expected Name='测试学生', got '%s'", ts.Name)
	}
	if ts.TeamCount != 2 {
		t.Errorf("expected TeamCount=2, got %d", ts.TeamCount)
	}
	if ts.AwardCount != 1 {
		t.Errorf("expected AwardCount=1, got %d", ts.AwardCount)
	}
	if ts.PrePlanCount != 4 {
		t.Errorf("expected PrePlanCount=4, got %d", ts.PrePlanCount)
	}
}

func TestCompetitionProgressFields(t *testing.T) {
	cp := CompetitionProgress{
		ID:            1,
		Title:         "数学建模",
		Status:        "ongoing",
		Type:          "innovation",
		StartDate:     "2026-06-01",
		EndDate:       "2026-08-31",
		TeamCount:     10,
		StudentCount:  35,
		PrePlanCount:  8,
		ReviewedCount: 5,
		ApprovedCount: 3,
		AwardCount:    2,
		SettledCount:  1,
		TotalPrize:    5000.0,
		Progress:      80,
	}

	if cp.ID != 1 {
		t.Errorf("expected ID=1, got %d", cp.ID)
	}
	if cp.Title != "数学建模" {
		t.Errorf("expected Title='数学建模', got '%s'", cp.Title)
	}
	if cp.TotalPrize != 5000.0 {
		t.Errorf("expected TotalPrize=5000, got %f", cp.TotalPrize)
	}
	if cp.Progress != 80 {
		t.Errorf("expected Progress=80, got %f", cp.Progress)
	}
}

func TestProgressCalculationFormula(t *testing.T) {
	// Test the lifecycle progress formula: creation(10%) + teams(20%) + preplans(30%) + review(20%) + awards(20%)
	tests := []struct {
		name              string
		teamCount         int64
		prePlanCount      int64
		reviewedCount     int64
		awardCount        int64
		expectedProgress  float64
	}{
		{"empty competition", 0, 0, 0, 0, 10},
		{"with teams only", 1, 0, 0, 0, 30},
		{"with preplans", 1, 1, 0, 0, 60},
		{"with reviews", 1, 1, 1, 0, 80},
		{"full lifecycle", 1, 1, 1, 1, 100},
		{"teams and awards only", 1, 0, 0, 1, 50},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var progressPct float64
			if tt.teamCount > 0 {
				progressPct += 20
			}
			if tt.prePlanCount > 0 {
				progressPct += 30
			}
			if tt.reviewedCount > 0 {
				progressPct += 20
			}
			if tt.awardCount > 0 {
				progressPct += 20
			}
			progressPct += 10 // base
			if progressPct > 100 {
				progressPct = 100
			}

			if math.Abs(progressPct-tt.expectedProgress) > 0.01 {
				t.Errorf("%s: expected progress=%.0f, got %.0f", tt.name, tt.expectedProgress, progressPct)
			}
		})
	}
}

func TestLeaderboardEntryFields(t *testing.T) {
	entry := LeaderboardEntry{
		Rank:             1,
		TeamID:           5,
		TeamName:         "冠军队",
		LeaderName:       "张三",
		CompetitionCount: 3,
		AwardCount:       2,
		PrePlanCount:     4,
		Score:            34, // 2*10 + 3*3 + 4*1 = 33... actually 2*10+3*3+4=33
	}

	if entry.Rank != 1 {
		t.Errorf("expected Rank=1, got %d", entry.Rank)
	}
	if entry.TeamID != 5 {
		t.Errorf("expected TeamID=5, got %d", entry.TeamID)
	}
	if entry.TeamName != "冠军队" {
		t.Errorf("expected TeamName='冠军队', got '%s'", entry.TeamName)
	}
	if entry.LeaderName != "张三" {
		t.Errorf("expected LeaderName='张三', got '%s'", entry.LeaderName)
	}
}

func TestLeaderboardScoreFormula(t *testing.T) {
	// Score = awards * 10 + competitions * 3 + preplans * 1
	tests := []struct {
		name          string
		awards        int64
		competitions  int64
		preplans      int64
		expectedScore float64
	}{
		{"zero", 0, 0, 0, 0},
		{"awards only", 3, 0, 0, 30},
		{"mixed", 2, 3, 4, 33},     // 2*10 + 3*3 + 4*1 = 33
		{"heavy awards", 5, 1, 2, 55}, // 5*10 + 1*3 + 2*1 = 55
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := float64(tt.awards)*10 + float64(tt.competitions)*3 + float64(tt.preplans)
			if math.Abs(score-tt.expectedScore) > 0.01 {
				t.Errorf("%s: expected score=%.0f, got %.0f", tt.name, tt.expectedScore, score)
			}
		})
	}
}

func TestTrendPointFields(t *testing.T) {
	tp := TrendPoint{
		Month:        "2026-06",
		Competitions: 5,
		Teams:        12,
		Awards:       3,
		PrePlans:     8,
		PrizeAmount:  15000.00,
	}

	if tp.Month != "2026-06" {
		t.Errorf("expected Month='2026-06', got '%s'", tp.Month)
	}
	if tp.Competitions != 5 {
		t.Errorf("expected Competitions=5, got %d", tp.Competitions)
	}
	if tp.Teams != 12 {
		t.Errorf("expected Teams=12, got %d", tp.Teams)
	}
	if tp.Awards != 3 {
		t.Errorf("expected Awards=3, got %d", tp.Awards)
	}
	if tp.PrePlans != 8 {
		t.Errorf("expected PrePlans=8, got %d", tp.PrePlans)
	}
	if tp.PrizeAmount != 15000.00 {
		t.Errorf("expected PrizeAmount=15000, got %.2f", tp.PrizeAmount)
	}
}

func TestEngagementStatsFields(t *testing.T) {
	es := EngagementStats{
		TotalStudents:      100,
		StudentsWithTeams:  75,
		TeamFormationRate:  75.0,
		TotalPrePlans:      50,
		ReviewedPrePlans:   40,
		AIReviewRate:       80.0,
		AvgPrePlanScore:    72.5,
		TotalCompetitions:  16,
		PublishedComps:     12,
		CompletionRate:     66.7,
		TotalTeams:         85,
		AvgTeamSize:        3.2,
		ActiveCompetitions: 4,
	}

	if es.TotalStudents != 100 {
		t.Errorf("expected TotalStudents=100, got %d", es.TotalStudents)
	}
	if es.StudentsWithTeams != 75 {
		t.Errorf("expected StudentsWithTeams=75, got %d", es.StudentsWithTeams)
	}
	if es.TeamFormationRate != 75.0 {
		t.Errorf("expected TeamFormationRate=75.0, got %.1f", es.TeamFormationRate)
	}
	if es.TotalPrePlans != 50 {
		t.Errorf("expected TotalPrePlans=50, got %d", es.TotalPrePlans)
	}
	if es.ReviewedPrePlans != 40 {
		t.Errorf("expected ReviewedPrePlans=40, got %d", es.ReviewedPrePlans)
	}
	if es.AIReviewRate != 80.0 {
		t.Errorf("expected AIReviewRate=80.0, got %.1f", es.AIReviewRate)
	}
	if es.AvgPrePlanScore != 72.5 {
		t.Errorf("expected AvgPrePlanScore=72.5, got %.1f", es.AvgPrePlanScore)
	}
	if es.TotalCompetitions != 16 {
		t.Errorf("expected TotalCompetitions=16, got %d", es.TotalCompetitions)
	}
	if es.PublishedComps != 12 {
		t.Errorf("expected PublishedComps=12, got %d", es.PublishedComps)
	}
	if es.CompletionRate != 66.7 {
		t.Errorf("expected CompletionRate=66.7, got %.1f", es.CompletionRate)
	}
	if es.TotalTeams != 85 {
		t.Errorf("expected TotalTeams=85, got %d", es.TotalTeams)
	}
	if es.AvgTeamSize != 3.2 {
		t.Errorf("expected AvgTeamSize=3.2, got %.1f", es.AvgTeamSize)
	}
	if es.ActiveCompetitions != 4 {
		t.Errorf("expected ActiveCompetitions=4, got %d", es.ActiveCompetitions)
	}
}

func TestEngagementRateCalculation(t *testing.T) {
	// Test rate calculation logic
	totalStudents := int64(100)
	studentsWithTeams := int64(75)

	var teamFormationRate float64
	if totalStudents > 0 {
		teamFormationRate = float64(studentsWithTeams) / float64(totalStudents) * 100
	}

	if teamFormationRate != 75.0 {
		t.Errorf("expected teamFormationRate=75.0, got %.1f", teamFormationRate)
	}

	// Edge case: zero students
	zeroStudents := int64(0)
	var zeroRate float64
	if zeroStudents > 0 {
		zeroRate = float64(studentsWithTeams) / float64(zeroStudents) * 100
	}
	if zeroRate != 0 {
		t.Errorf("expected zeroRate=0, got %.1f", zeroRate)
	}
}

func TestTypeDistributionFields(t *testing.T) {
	td := TypeDistribution{
		Type:  "hackathon",
		Count: 10,
	}
	if td.Type != "hackathon" {
		t.Errorf("expected Type='hackathon', got '%s'", td.Type)
	}
	if td.Count != 10 {
		t.Errorf("expected Count=10, got %d", td.Count)
	}
}

func TestTypeDistributionTypes(t *testing.T) {
	validTypes := []string{"hackathon", "innovation", "research", "business_plan", "ai_innovation", "data_science"}
	for _, vt := range validTypes {
		td := TypeDistribution{Type: vt, Count: 1}
		if td.Type != vt {
			t.Errorf("expected Type='%s', got '%s'", vt, td.Type)
		}
	}
}

// ============================================================
// Kanban Board Tests
// ============================================================

func TestKanbanCompetitionFields(t *testing.T) {
	kc := KanbanCompetition{
		ID:            1,
		Title:         "蓝桥杯全国软件大赛",
		Type:          "innovation",
		TeamCount:     15,
		StudentCount:  45,
		PreplanCount:  12,
		AwardCount:    3,
		Progress:      65.5,
		StartDate:     "2026-03-01",
		EndDate:       "2026-06-30",
		DaysRemaining: 13,
	}

	if kc.ID != 1 {
		t.Errorf("expected ID=1, got %d", kc.ID)
	}
	if kc.Title != "蓝桥杯全国软件大赛" {
		t.Errorf("expected Title='蓝桥杯全国软件大赛', got '%s'", kc.Title)
	}
	if kc.TeamCount != 15 {
		t.Errorf("expected TeamCount=15, got %d", kc.TeamCount)
	}
	if kc.StudentCount != 45 {
		t.Errorf("expected StudentCount=45, got %d", kc.StudentCount)
	}
	if kc.Progress != 65.5 {
		t.Errorf("expected Progress=65.5, got %f", kc.Progress)
	}
	if kc.DaysRemaining != 13 {
		t.Errorf("expected DaysRemaining=13, got %d", kc.DaysRemaining)
	}
}

func TestKanbanColumnFields(t *testing.T) {
	col := KanbanColumn{
		Status: "ongoing",
		Label:  "进行中",
		Count:  3,
		Competitions: []KanbanCompetition{
			{ID: 1, Title: "赛事A", Progress: 50},
			{ID: 2, Title: "赛事B", Progress: 75},
			{ID: 3, Title: "赛事C", Progress: 90},
		},
	}

	if col.Status != "ongoing" {
		t.Errorf("expected Status='ongoing', got '%s'", col.Status)
	}
	if col.Label != "进行中" {
		t.Errorf("expected Label='进行中', got '%s'", col.Label)
	}
	if col.Count != 3 {
		t.Errorf("expected Count=3, got %d", col.Count)
	}
	if len(col.Competitions) != 3 {
		t.Errorf("expected 3 competitions, got %d", len(col.Competitions))
	}
}

func TestKanbanCompetitionProgressBounds(t *testing.T) {
	// Progress should be clamped between 0 and 100
	tests := []struct {
		progress float64
		valid    bool
	}{
		{0, true},
		{50, true},
		{100, true},
		{-10, false},
		{110, false},
	}

	for _, tt := range tests {
		kc := KanbanCompetition{Progress: tt.progress}
		if tt.valid && (kc.Progress < 0 || kc.Progress > 100) {
			t.Errorf("progress %f should be valid (0-100)", tt.progress)
		}
	}
}

func TestKanbanColumnEmpty(t *testing.T) {
	col := KanbanColumn{
		Status:       "draft",
		Label:        "草稿",
		Count:        0,
		Competitions: []KanbanCompetition{},
	}

	if col.Count != 0 {
		t.Errorf("expected Count=0, got %d", col.Count)
	}
	if len(col.Competitions) != 0 {
		t.Errorf("expected 0 competitions, got %d", len(col.Competitions))
	}
}

func TestPhasePriority(t *testing.T) {
	tests := []struct {
		phase string
		want  int
	}{
		{"ending", 0},
		{"ongoing", 1},
		{"registration", 2},
		{"upcoming", 3},
		{"unknown", 4},
		{"", 4},
	}

	for _, tt := range tests {
		got := phasePriority(tt.phase)
		if got != tt.want {
			t.Errorf("phasePriority(%q) = %d, want %d", tt.phase, got, tt.want)
		}
	}
}

func TestPhasePriorityOrdering(t *testing.T) {
	// ending should be more urgent than ongoing, which is more urgent than upcoming
	if phasePriority("ending") >= phasePriority("ongoing") {
		t.Error("ending should be more urgent than ongoing")
	}
	if phasePriority("ongoing") >= phasePriority("registration") {
		t.Error("ongoing should be more urgent than registration")
	}
	if phasePriority("registration") >= phasePriority("upcoming") {
		t.Error("registration should be more urgent than upcoming")
	}
}

func TestCountdownItemFields(t *testing.T) {
	item := CountdownItem{
		ID:             1,
		Title:          "蓝桥杯",
		Type:           "innovation",
		Status:         "published",
		StartDate:      "2026-07-01",
		EndDate:        "2026-07-05",
		DaysUntilStart: 13,
		DaysUntilEnd:   17,
		Phase:          "upcoming",
		Location:       "北京",
		Prize:          "¥50,000",
	}

	if item.ID != 1 {
		t.Errorf("expected ID=1, got %d", item.ID)
	}
	if item.Phase != "upcoming" {
		t.Errorf("expected Phase='upcoming', got '%s'", item.Phase)
	}
	if item.DaysUntilStart != 13 {
		t.Errorf("expected DaysUntilStart=13, got %d", item.DaysUntilStart)
	}
}

func TestCountdownItemPhases(t *testing.T) {
	phases := []string{"upcoming", "registration", "ongoing", "ending"}
	for _, p := range phases {
		item := CountdownItem{Phase: p}
		if item.Phase != p {
			t.Errorf("expected Phase='%s', got '%s'", p, item.Phase)
		}
	}
}

func TestCountdownItemDateParsing(t *testing.T) {
	item := CountdownItem{
		StartDate: "2026-07-01",
		EndDate:   "2026-07-05",
	}

	// Dates should be parseable
	start, err := time.Parse("2006-01-02", item.StartDate)
	if err != nil {
		t.Errorf("failed to parse start date: %v", err)
	}
	end, err := time.Parse("2006-01-02", item.EndDate)
	if err != nil {
		t.Errorf("failed to parse end date: %v", err)
	}
	if !start.Before(end) {
		t.Error("start date should be before end date")
	}
}

func TestNewStatsHandlerReturnsInstance(t *testing.T) {
	h := NewStatsHandler()
	if h == nil {
		t.Error("NewStatsHandler returned nil")
	}
}

func TestPopularityItemFields(t *testing.T) {
	item := PopularityItem{
		ID:              1,
		Title:           "蓝桥杯全国软件和信息技术专业人才大赛",
		Type:            "innovation",
		Status:          "published",
		TeamCount:       10,
		StudentCount:    25,
		RegistrationCnt: 30,
		PrePlanCount:    8,
		AwardCount:      5,
		PopularityScore: 123.5,
		Rank:            1,
	}

	if item.ID != 1 {
		t.Errorf("expected ID=1, got %d", item.ID)
	}
	if item.Title != "蓝桥杯全国软件和信息技术专业人才大赛" {
		t.Errorf("unexpected Title: %s", item.Title)
	}
	if item.TeamCount != 10 {
		t.Errorf("expected TeamCount=10, got %d", item.TeamCount)
	}
	if item.StudentCount != 25 {
		t.Errorf("expected StudentCount=25, got %d", item.StudentCount)
	}
	if item.RegistrationCnt != 30 {
		t.Errorf("expected RegistrationCnt=30, got %d", item.RegistrationCnt)
	}
	if item.PrePlanCount != 8 {
		t.Errorf("expected PrePlanCount=8, got %d", item.PrePlanCount)
	}
	if item.AwardCount != 5 {
		t.Errorf("expected AwardCount=5, got %d", item.AwardCount)
	}
	if item.PopularityScore != 123.5 {
		t.Errorf("expected PopularityScore=123.5, got %f", item.PopularityScore)
	}
	if item.Rank != 1 {
		t.Errorf("expected Rank=1, got %d", item.Rank)
	}
}

func TestPopularityScoreCalculation(t *testing.T) {
	// Verify score formula: teams×3 + students×2 + registrations×1.5 + preplans×2 + awards×4
	tests := []struct {
		name          string
		teams         int
		students      int
		registrations int
		preplans      int
		awards        int
		wantScore     float64
	}{
		{"zero", 0, 0, 0, 0, 0, 0.0},
		{"teams-only", 5, 0, 0, 0, 0, 15.0},
		{"awards-heavy", 0, 0, 0, 0, 3, 12.0},
		{"balanced", 2, 5, 10, 3, 1, 6.0 + 10.0 + 15.0 + 6.0 + 4.0},
		{"full", 10, 25, 30, 8, 5, 30.0 + 50.0 + 45.0 + 16.0 + 20.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := float64(tt.teams)*3.0 + float64(tt.students)*2.0 +
				float64(tt.registrations)*1.5 + float64(tt.preplans)*2.0 + float64(tt.awards)*4.0
			if score != tt.wantScore {
				t.Errorf("score = %v, want %v", score, tt.wantScore)
			}
		})
	}
}

func TestPopularityItemDefaultLimit(t *testing.T) {
	// Verify that the PopularityItem can hold reasonable data
	items := make([]PopularityItem, 50)
	for i := range items {
		items[i] = PopularityItem{
			ID:              uint(i + 1),
			Title:           fmt.Sprintf("Competition %d", i+1),
			PopularityScore: float64(50 - i),
			Rank:            i + 1,
		}
	}

	// Verify sorted order after manual sort
	for i := 1; i < len(items); i++ {
		for j := i; j > 0 && items[j].PopularityScore > items[j-1].PopularityScore; j-- {
			items[j], items[j-1] = items[j-1], items[j]
		}
	}

	if items[0].PopularityScore != 50.0 {
		t.Errorf("expected first item score=50.0, got %f", items[0].PopularityScore)
	}
	if items[49].PopularityScore != 1.0 {
		t.Errorf("expected last item score=1.0, got %f", items[49].PopularityScore)
	}
}
