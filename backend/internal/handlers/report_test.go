package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ensureDB initializes the database connection if not already done.
// Skips the test if the database is not available.
func ensureDB(t *testing.T) {
	t.Helper()
	if database.GetDB() != nil {
		return
	}
	cfg := &config.DBConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "cyf"),
		Password: getEnv("DB_PASSWORD", "cyf123"),
		Name:     getEnv("DB_NAME", "ssgl"),
		SSLMode:  "disable",
		TimeZone: "Asia/Shanghai",
	}
	database.Connect(cfg)
	if database.GetDB() == nil {
		t.Skip("database not available, skipping report test")
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func setupReportTest(t *testing.T) (*gin.Engine, *ReportHandler) {
	t.Helper()
	ensureDB(t)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewReportHandler()
	return r, h
}

func TestReportHandler_GenerateReport_Success(t *testing.T) {
	r, h := setupReportTest(t)
	db := database.GetDB()

	// Create test competition
	comp := models.Competition{
		Title:       "Test Report Competition " + time.Now().Format("150405"),
		Type:        models.CompTypeHackathon,
		Status:      models.CompStatusPublished,
		Level:       "省级",
		OrganizerID: 1,
	}
	db.Create(&comp)

	// Create a team
	team := models.Team{
		Name:          "Report Team " + time.Now().Format("150405"),
		CompetitionID: comp.ID,
		LeaderID:      1,
	}
	db.Create(&team)

	// Create a registration
	reg := models.CompetitionRegistration{
		CompetitionID: comp.ID,
		UserID:        1,
		Status:        models.RegStatusApproved,
	}
	db.Create(&reg)

	// Create a preplan
	score := 85
	preplan := models.PrePlan{
		CompetitionID: comp.ID,
		TeamID:        team.ID,
		Title:         "Test Preplan",
		Status:        models.PrePlanStatusApproved,
		AIReviewScore: &score,
	}
	db.Create(&preplan)

	// Create an award
	award := models.Award{
		CompetitionID: comp.ID,
		TeamID:        team.ID,
		Rank:          1,
		RankName:      "一等奖",
		PrizeName:     "最佳创新奖",
		PrizeAmount:   5000,
		Status:        models.AwardStatusSettled,
	}
	db.Create(&award)

	// Create a milestone
	milestone := models.Milestone{
		CompetitionID: comp.ID,
		Title:         "提交截止",
		Type:          models.MilestoneTypeSubmission,
		Status:        models.MilestoneStatusCompleted,
		SortOrder:     1,
	}
	db.Create(&milestone)

	r.GET("/api/v1/competitions/:id/report", h.GenerateReport)
	req := httptest.NewRequest("GET", "/api/v1/competitions/"+fmtUint(comp.ID)+"/report", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var report CompetitionReport
	if err := json.Unmarshal(w.Body.Bytes(), &report); err != nil {
		t.Fatalf("failed to unmarshal report: %v", err)
	}

	if report.CompetitionID != comp.ID {
		t.Errorf("expected competition ID %d, got %d", comp.ID, report.CompetitionID)
	}
	if report.Title != comp.Title {
		t.Errorf("expected title %q, got %q", comp.Title, report.Title)
	}
	if report.RegistrationStats.Total != 1 {
		t.Errorf("expected 1 registration, got %d", report.RegistrationStats.Total)
	}
	if report.RegistrationStats.Approved != 1 {
		t.Errorf("expected 1 approved, got %d", report.RegistrationStats.Approved)
	}
	if report.TeamStats.TotalTeams != 1 {
		t.Errorf("expected 1 team, got %d", report.TeamStats.TotalTeams)
	}
	if report.PrePlanStats.Total != 1 {
		t.Errorf("expected 1 preplan, got %d", report.PrePlanStats.Total)
	}
	if report.PrePlanStats.Approved != 1 {
		t.Errorf("expected 1 approved preplan, got %d", report.PrePlanStats.Approved)
	}
	if report.PrePlanStats.AvgAIScore != 85 {
		t.Errorf("expected avg AI score 85, got %f", report.PrePlanStats.AvgAIScore)
	}
	if report.AwardStats.TotalAwards != 1 {
		t.Errorf("expected 1 award, got %d", report.AwardStats.TotalAwards)
	}
	if report.AwardStats.TotalPrize != 5000 {
		t.Errorf("expected total prize 5000, got %f", report.AwardStats.TotalPrize)
	}
	if report.AwardStats.Settled != 1 {
		t.Errorf("expected 1 settled award, got %d", report.AwardStats.Settled)
	}
	if report.MilestoneStats.Total != 1 {
		t.Errorf("expected 1 milestone, got %d", report.MilestoneStats.Total)
	}
	if report.MilestoneStats.Completed != 1 {
		t.Errorf("expected 1 completed milestone, got %d", report.MilestoneStats.Completed)
	}
	if report.MilestoneStats.Progress != 100 {
		t.Errorf("expected milestone progress 100, got %f", report.MilestoneStats.Progress)
	}

	// Cleanup
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.Award{})
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.Milestone{})
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.PrePlan{})
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.CompetitionRegistration{})
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.Team{})
	db.Unscoped().Delete(&comp)
}

func TestReportHandler_GenerateReport_NotFound(t *testing.T) {
	r, h := setupReportTest(t)
	r.GET("/api/v1/competitions/:id/report", h.GenerateReport)

	req := httptest.NewRequest("GET", "/api/v1/competitions/99999/report", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestReportHandler_GenerateReport_EmptyCompetition(t *testing.T) {
	r, h := setupReportTest(t)
	db := database.GetDB()

	comp := models.Competition{
		Title:       "Empty Report Comp " + time.Now().Format("150405"),
		Type:        models.CompTypeInnovation,
		Status:      models.CompStatusDraft,
		OrganizerID: 1,
	}
	db.Create(&comp)

	r.GET("/api/v1/competitions/:id/report", h.GenerateReport)
	req := httptest.NewRequest("GET", "/api/v1/competitions/"+fmtUint(comp.ID)+"/report", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var report CompetitionReport
	if err := json.Unmarshal(w.Body.Bytes(), &report); err != nil {
		t.Fatalf("failed to unmarshal report: %v", err)
	}

	if report.RegistrationStats.Total != 0 {
		t.Errorf("expected 0 registrations, got %d", report.RegistrationStats.Total)
	}
	if report.TeamStats.TotalTeams != 0 {
		t.Errorf("expected 0 teams, got %d", report.TeamStats.TotalTeams)
	}
	if report.AwardStats.TotalAwards != 0 {
		t.Errorf("expected 0 awards, got %d", report.AwardStats.TotalAwards)
	}

	// Cleanup
	db.Unscoped().Delete(&comp)
}

func TestReportHandler_GenerateReport_MultipleRegistrations(t *testing.T) {
	r, h := setupReportTest(t)
	db := database.GetDB()

	comp := models.Competition{
		Title:       "Multi Reg Report " + time.Now().Format("150405"),
		Type:        models.CompTypeHackathon,
		Status:      models.CompStatusOngoing,
		OrganizerID: 1,
	}
	db.Create(&comp)

	statuses := []string{
		models.RegStatusApproved,
		models.RegStatusApproved,
		models.RegStatusPending,
		models.RegStatusRejected,
	}
	// Use existing student user IDs (5, 6, 7, 8) to satisfy FK constraint
	userIDs := []uint{5, 6, 7, 8}
	for i, status := range statuses {
		reg := models.CompetitionRegistration{
			CompetitionID: comp.ID,
			UserID:        userIDs[i],
			Status:        status,
		}
		db.Create(&reg)
	}

	r.GET("/api/v1/competitions/:id/report", h.GenerateReport)
	req := httptest.NewRequest("GET", "/api/v1/competitions/"+fmtUint(comp.ID)+"/report", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var report CompetitionReport
	json.Unmarshal(w.Body.Bytes(), &report)

	if report.RegistrationStats.Total != 4 {
		t.Errorf("expected 4 registrations, got %d", report.RegistrationStats.Total)
	}
	if report.RegistrationStats.Approved != 2 {
		t.Errorf("expected 2 approved, got %d", report.RegistrationStats.Approved)
	}
	if report.RegistrationStats.Pending != 1 {
		t.Errorf("expected 1 pending, got %d", report.RegistrationStats.Pending)
	}
	if report.RegistrationStats.Rejected != 1 {
		t.Errorf("expected 1 rejected, got %d", report.RegistrationStats.Rejected)
	}
	if report.RegistrationStats.ApprovalRate != 50 {
		t.Errorf("expected approval rate 50, got %f", report.RegistrationStats.ApprovalRate)
	}

	// Cleanup
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.CompetitionRegistration{})
	db.Unscoped().Delete(&comp)
}

func TestReportHandler_GenerateReport_MilestoneProgress(t *testing.T) {
	r, h := setupReportTest(t)
	db := database.GetDB()

	comp := models.Competition{
		Title:       "Milestone Report " + time.Now().Format("150405"),
		Type:        models.CompTypeHackathon,
		Status:      models.CompStatusOngoing,
		OrganizerID: 1,
	}
	db.Create(&comp)

	milestones := []models.Milestone{
		{CompetitionID: comp.ID, Title: "报名截止", Type: models.MilestoneTypeRegistration, Status: models.MilestoneStatusCompleted, SortOrder: 1},
		{CompetitionID: comp.ID, Title: "初赛提交", Type: models.MilestoneTypeSubmission, Status: models.MilestoneStatusCompleted, SortOrder: 2},
		{CompetitionID: comp.ID, Title: "初赛评审", Type: models.MilestoneTypeReview, Status: models.MilestoneStatusInProgress, SortOrder: 3},
		{CompetitionID: comp.ID, Title: "决赛答辩", Type: models.MilestoneTypeDefense, Status: models.MilestoneStatusPending, SortOrder: 4},
	}
	for i := range milestones {
		db.Create(&milestones[i])
	}

	r.GET("/api/v1/competitions/:id/report", h.GenerateReport)
	req := httptest.NewRequest("GET", "/api/v1/competitions/"+fmtUint(comp.ID)+"/report", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var report CompetitionReport
	json.Unmarshal(w.Body.Bytes(), &report)

	if report.MilestoneStats.Total != 4 {
		t.Errorf("expected 4 milestones, got %d", report.MilestoneStats.Total)
	}
	if report.MilestoneStats.Completed != 2 {
		t.Errorf("expected 2 completed, got %d", report.MilestoneStats.Completed)
	}
	if report.MilestoneStats.InProgress != 1 {
		t.Errorf("expected 1 in progress, got %d", report.MilestoneStats.InProgress)
	}
	if report.MilestoneStats.Pending != 1 {
		t.Errorf("expected 1 pending, got %d", report.MilestoneStats.Pending)
	}
	if report.MilestoneStats.Progress != 50 {
		t.Errorf("expected progress 50, got %f", report.MilestoneStats.Progress)
	}

	// Cleanup
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.Milestone{})
	db.Unscoped().Delete(&comp)
}

func TestReportHandler_GenerateReport_TimelineEvents(t *testing.T) {
	r, h := setupReportTest(t)
	db := database.GetDB()

	comp := models.Competition{
		Title:       "Timeline Report " + time.Now().Format("150405"),
		Type:        models.CompTypeHackathon,
		Status:      models.CompStatusOngoing,
		OrganizerID: 1,
		StartDate:   time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
		EndDate:     time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC),
	}
	db.Create(&comp)

	milestone := models.Milestone{
		CompetitionID: comp.ID,
		Title:         "提交截止",
		Type:          models.MilestoneTypeSubmission,
		Status:        models.MilestoneStatusPending,
		DueDate:       time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC),
		SortOrder:     1,
	}
	db.Create(&milestone)

	award := models.Award{
		CompetitionID: comp.ID,
		TeamID:        1,
		Rank:          1,
		PrizeName:     "金奖",
		PrizeAmount:   10000,
		Status:        models.AwardStatusSettled,
		NominatedAt:   time.Date(2026, 7, 14, 0, 0, 0, 0, time.UTC),
	}
	db.Create(&award)

	r.GET("/api/v1/competitions/:id/report", h.GenerateReport)
	req := httptest.NewRequest("GET", "/api/v1/competitions/"+fmtUint(comp.ID)+"/report", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var report CompetitionReport
	json.Unmarshal(w.Body.Bytes(), &report)

	// Should have: start date, end date, milestone, award = 4 events
	if len(report.Timeline) != 4 {
		t.Errorf("expected 4 timeline events, got %d", len(report.Timeline))
	}

	// Cleanup
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.Award{})
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.Milestone{})
	db.Unscoped().Delete(&comp)
}

func TestReportHandler_GenerateReport_PrePlanStats(t *testing.T) {
	r, h := setupReportTest(t)
	db := database.GetDB()

	comp := models.Competition{
		Title:       "Preplan Report " + time.Now().Format("150405"),
		Type:        models.CompTypeInnovation,
		Status:      models.CompStatusOngoing,
		OrganizerID: 1,
	}
	db.Create(&comp)

	score70 := 70
	score90 := 90
	preplans := []models.PrePlan{
		{CompetitionID: comp.ID, TeamID: 1, Title: "Plan A", Status: models.PrePlanStatusApproved, AIReviewScore: &score70},
		{CompetitionID: comp.ID, TeamID: 2, Title: "Plan B", Status: models.PrePlanStatusApproved, AIReviewScore: &score90},
		{CompetitionID: comp.ID, TeamID: 3, Title: "Plan C", Status: models.PrePlanStatusRejected},
		{CompetitionID: comp.ID, TeamID: 4, Title: "Plan D", Status: models.PrePlanStatusDraft},
		{CompetitionID: comp.ID, TeamID: 5, Title: "Plan E", Status: models.PrePlanStatusSubmitted},
	}
	for i := range preplans {
		db.Create(&preplans[i])
	}

	r.GET("/api/v1/competitions/:id/report", h.GenerateReport)
	req := httptest.NewRequest("GET", "/api/v1/competitions/"+fmtUint(comp.ID)+"/report", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var report CompetitionReport
	json.Unmarshal(w.Body.Bytes(), &report)

	if report.PrePlanStats.Total != 5 {
		t.Errorf("expected 5 preplans, got %d", report.PrePlanStats.Total)
	}
	if report.PrePlanStats.Approved != 2 {
		t.Errorf("expected 2 approved, got %d", report.PrePlanStats.Approved)
	}
	if report.PrePlanStats.Rejected != 1 {
		t.Errorf("expected 1 rejected, got %d", report.PrePlanStats.Rejected)
	}
	if report.PrePlanStats.AvgAIScore != 80 {
		t.Errorf("expected avg AI score 80, got %f", report.PrePlanStats.AvgAIScore)
	}

	// Cleanup
	db.Unscoped().Where("competition_id = ?", comp.ID).Delete(&models.PrePlan{})
	db.Unscoped().Delete(&comp)
}

func TestReportHandler_GenerateReport_ReportFields(t *testing.T) {
	r, h := setupReportTest(t)
	db := database.GetDB()

	comp := models.Competition{
		Title:       "Field Check Report " + time.Now().Format("150405"),
		Type:        models.CompTypeDataScience,
		Status:      models.CompStatusOngoing,
		Level:       "国家级",
		OrganizerID: 1,
		Location:    "北京",
	}
	db.Create(&comp)

	r.GET("/api/v1/competitions/:id/report", h.GenerateReport)
	req := httptest.NewRequest("GET", "/api/v1/competitions/"+fmtUint(comp.ID)+"/report", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var report CompetitionReport
	json.Unmarshal(w.Body.Bytes(), &report)

	if report.Type != models.CompTypeDataScience {
		t.Errorf("expected type %q, got %q", models.CompTypeDataScience, report.Type)
	}
	if report.Level != "国家级" {
		t.Errorf("expected level '国家级', got %q", report.Level)
	}
	if report.Location != "北京" {
		t.Errorf("expected location '北京', got %q", report.Location)
	}
	if report.GeneratedAt.IsZero() {
		t.Error("expected GeneratedAt to be set")
	}

	// Cleanup
	db.Unscoped().Delete(&comp)
}

// fmtUint converts a uint to string for URL building.
func fmtUint(n uint) string {
	return fmt.Sprintf("%d", n)
}
