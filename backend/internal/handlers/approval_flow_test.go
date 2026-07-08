package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
	"gorm.io/gorm"
)

func setupApprovalFlowTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	oldDB := database.DB
	dsnName := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	db, err := gorm.Open(sqlite.Open("file:"+dsnName+"?mode=memory&cache=shared"), &gorm.Config{})
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
		&models.CompetitionRegistration{},
		&models.PrePlan{},
		&models.Award{},
		&models.StudentEvaluation{},
		&models.ExecutionPlan{},
		&models.Notification{},
		&models.ApprovalWorkflow{},
		&models.ApprovalStep{},
	); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}

	return db
}

func postJSONRequest(t *testing.T, path string, body map[string]interface{}) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("failed to marshal request: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	return httptest.NewRecorder(), req
}

func TestRegistrationCreatesApprovalWorkflow(t *testing.T) {
	db := setupApprovalFlowTestDB(t)
	gin.SetMode(gin.TestMode)

	student := models.User{Username: "student", Email: "student@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive}
	teacher := models.User{Username: "teacher", Email: "teacher@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive}
	if err := db.Create(&student).Error; err != nil {
		t.Fatalf("failed to create student: %v", err)
	}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatalf("failed to create teacher: %v", err)
	}
	comp := models.Competition{
		Title:                "Innovation Cup",
		Type:                 models.CompTypeInnovation,
		Status:               models.CompStatusPublished,
		OrganizerID:          teacher.ID,
		RegistrationDeadline: time.Now().Add(24 * time.Hour),
	}
	if err := db.Create(&comp).Error; err != nil {
		t.Fatalf("failed to create competition: %v", err)
	}

	r := gin.New()
	h := NewRegistrationHandler()
	r.POST("/competitions/:id/register", func(c *gin.Context) {
		c.Set("user_id", student.ID)
		c.Set("role", models.RoleStudent)
		h.Register(c)
	})

	w, req := postJSONRequest(t, "/competitions/"+strconvFormatUint(comp.ID)+"/register", map[string]interface{}{"remark": "join"})
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var reg models.CompetitionRegistration
	if err := db.First(&reg, "competition_id = ? AND user_id = ?", comp.ID, student.ID).Error; err != nil {
		t.Fatalf("failed to load registration: %v", err)
	}

	var workflow models.ApprovalWorkflow
	if err := db.Preload("Steps").First(&workflow, "type = ? AND target_id = ?", models.WorkflowTypeRegistration, reg.ID).Error; err != nil {
		t.Fatalf("expected registration workflow: %v", err)
	}
	if workflow.SubmitterID != student.ID || workflow.TotalSteps != 1 {
		t.Fatalf("unexpected workflow submitter/steps: submitter=%d total=%d", workflow.SubmitterID, workflow.TotalSteps)
	}
	if len(workflow.Steps) != 1 || workflow.Steps[0].ApproverID != teacher.ID {
		t.Fatalf("expected organizer as approver, got steps=%+v", workflow.Steps)
	}
}

func TestPrePlanCreateCreatesApprovalWorkflow(t *testing.T) {
	db := setupApprovalFlowTestDB(t)
	gin.SetMode(gin.TestMode)

	student := models.User{Username: "student2", Email: "student2@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive}
	teacher := models.User{Username: "teacher2", Email: "teacher2@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive}
	if err := db.Create(&student).Error; err != nil {
		t.Fatalf("failed to create student: %v", err)
	}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatalf("failed to create teacher: %v", err)
	}
	comp := models.Competition{Title: "Plan Cup", Type: models.CompTypeBusinessPlan, OrganizerID: teacher.ID, Status: models.CompStatusOngoing}
	if err := db.Create(&comp).Error; err != nil {
		t.Fatalf("failed to create competition: %v", err)
	}
	team := models.Team{Name: "Team A", CompetitionID: comp.ID, LeaderID: student.ID, Status: models.TeamStatusActive}
	if err := db.Create(&team).Error; err != nil {
		t.Fatalf("failed to create team: %v", err)
	}

	r := gin.New()
	h := NewPrePlanHandler(nil)
	r.POST("/pre-plans", func(c *gin.Context) {
		c.Set("user_id", student.ID)
		c.Set("role", models.RoleStudent)
		h.Create(c)
	})

	w, req := postJSONRequest(t, "/pre-plans", map[string]interface{}{
		"competition_id": comp.ID,
		"team_id":        team.ID,
		"title":          "Plan A",
	})
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var preplan models.PrePlan
	if err := db.First(&preplan, "team_id = ? AND title = ?", team.ID, "Plan A").Error; err != nil {
		t.Fatalf("failed to load preplan: %v", err)
	}
	var workflow models.ApprovalWorkflow
	if err := db.Preload("Steps").First(&workflow, "type = ? AND target_id = ?", models.WorkflowTypePrePlan, preplan.ID).Error; err != nil {
		t.Fatalf("expected preplan workflow: %v", err)
	}
	if workflow.SubmitterID != student.ID || len(workflow.Steps) != 1 || workflow.Steps[0].ApproverID != teacher.ID {
		t.Fatalf("unexpected preplan workflow: %+v steps=%+v", workflow, workflow.Steps)
	}
}

func TestAwardCreateCreatesTeacherAndAdminWorkflow(t *testing.T) {
	db := setupApprovalFlowTestDB(t)
	gin.SetMode(gin.TestMode)

	teacher := models.User{Username: "teacher3", Email: "teacher3@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive}
	admin := models.User{Username: "admin", Email: "admin@example.com", Password: "x", Role: models.RoleAdmin, Status: models.StatusActive}
	student := models.User{Username: "student3", Email: "student3@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatalf("failed to create teacher: %v", err)
	}
	if err := db.Create(&admin).Error; err != nil {
		t.Fatalf("failed to create admin: %v", err)
	}
	if err := db.Create(&student).Error; err != nil {
		t.Fatalf("failed to create student: %v", err)
	}
	comp := models.Competition{Title: "Award Cup", Type: models.CompTypeHackathon, OrganizerID: teacher.ID, Status: models.CompStatusCompleted}
	if err := db.Create(&comp).Error; err != nil {
		t.Fatalf("failed to create competition: %v", err)
	}
	team := models.Team{Name: "Winner", CompetitionID: comp.ID, LeaderID: student.ID, Status: models.TeamStatusCompleted}
	if err := db.Create(&team).Error; err != nil {
		t.Fatalf("failed to create team: %v", err)
	}

	r := gin.New()
	h := NewAwardHandler()
	r.POST("/awards", func(c *gin.Context) {
		c.Set("user_id", teacher.ID)
		c.Set("role", models.RoleTeacher)
		h.Create(c)
	})

	w, req := postJSONRequest(t, "/awards", map[string]interface{}{
		"competition_id": comp.ID,
		"team_id":        team.ID,
		"rank":           1,
		"rank_name":      "一等奖",
		"prize_amount":   5000,
		"final_score":    92.5,
	})
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var award models.Award
	if err := db.First(&award, "competition_id = ? AND team_id = ?", comp.ID, team.ID).Error; err != nil {
		t.Fatalf("failed to load award: %v", err)
	}
	if award.FinalScore != 92.5 {
		t.Fatalf("expected final score 92.5, got %.1f", award.FinalScore)
	}
	var workflow models.ApprovalWorkflow
	if err := db.Preload("Steps").First(&workflow, "type = ? AND target_id = ?", models.WorkflowTypeReward, award.ID).Error; err != nil {
		t.Fatalf("expected award workflow: %v", err)
	}
	if workflow.TotalSteps != 2 || len(workflow.Steps) != 2 {
		t.Fatalf("expected two workflow steps, got total=%d steps=%+v", workflow.TotalSteps, workflow.Steps)
	}
	if workflow.Steps[0].ApproverID != teacher.ID || workflow.Steps[1].ApproverID != admin.ID {
		t.Fatalf("expected teacher then admin approvers, got steps=%+v", workflow.Steps)
	}
}

func TestEvaluationCreateRequiresEndedCompetitionAndParticipation(t *testing.T) {
	db := setupApprovalFlowTestDB(t)
	gin.SetMode(gin.TestMode)

	student := models.User{Username: "student4", Email: "student4@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive}
	teacher := models.User{Username: "teacher4", Email: "teacher4@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive}
	if err := db.Create(&student).Error; err != nil {
		t.Fatalf("failed to create student: %v", err)
	}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatalf("failed to create teacher: %v", err)
	}
	comp := models.Competition{
		Title:       "Running Cup",
		Type:        models.CompTypeHackathon,
		Status:      models.CompStatusOngoing,
		OrganizerID: teacher.ID,
		EndDate:     time.Now().Add(24 * time.Hour),
	}
	if err := db.Create(&comp).Error; err != nil {
		t.Fatalf("failed to create competition: %v", err)
	}
	reg := models.CompetitionRegistration{CompetitionID: comp.ID, UserID: student.ID, Status: models.RegStatusApproved}
	if err := db.Create(&reg).Error; err != nil {
		t.Fatalf("failed to create registration: %v", err)
	}

	r := gin.New()
	h := NewEvaluationHandler()
	r.POST("/evaluations", func(c *gin.Context) {
		c.Set("user_id", student.ID)
		c.Set("role", models.RoleStudent)
		h.Create(c)
	})

	body := map[string]interface{}{
		"teacher_id":     teacher.ID,
		"competition_id": comp.ID,
		"teaching":       5,
		"communication":  5,
		"availability":   5,
		"overall":        5,
	}
	w, req := postJSONRequest(t, "/evaluations", body)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 before competition ends, got %d: %s", w.Code, w.Body.String())
	}

	if err := db.Model(&comp).Updates(map[string]interface{}{
		"status":   models.CompStatusCompleted,
		"end_date": time.Now().Add(-24 * time.Hour),
	}).Error; err != nil {
		t.Fatalf("failed to mark competition completed: %v", err)
	}
	w, req = postJSONRequest(t, "/evaluations", body)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 after completion with participation, got %d: %s", w.Code, w.Body.String())
	}

	outsider := models.User{Username: "outsider", Email: "outsider@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive}
	if err := db.Create(&outsider).Error; err != nil {
		t.Fatalf("failed to create outsider: %v", err)
	}
	r = gin.New()
	r.POST("/evaluations", func(c *gin.Context) {
		c.Set("user_id", outsider.ID)
		c.Set("role", models.RoleStudent)
		h.Create(c)
	})
	body["teacher_id"] = teacher.ID
	w, req = postJSONRequest(t, "/evaluations", body)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-participant, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPrePlanExecutionMatchPersistsResult(t *testing.T) {
	db := setupApprovalFlowTestDB(t)
	gin.SetMode(gin.TestMode)

	teacher := models.User{Username: "teacher5", Email: "teacher5@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive}
	student := models.User{Username: "student5", Email: "student5@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatalf("failed to create teacher: %v", err)
	}
	if err := db.Create(&student).Error; err != nil {
		t.Fatalf("failed to create student: %v", err)
	}
	comp := models.Competition{Title: "AI Cup", Type: models.CompTypeAIInnovation, OrganizerID: teacher.ID, Status: models.CompStatusOngoing}
	if err := db.Create(&comp).Error; err != nil {
		t.Fatalf("failed to create competition: %v", err)
	}
	team := models.Team{Name: "AI Team", CompetitionID: comp.ID, LeaderID: student.ID}
	if err := db.Create(&team).Error; err != nil {
		t.Fatalf("failed to create team: %v", err)
	}
	preplan := models.PrePlan{
		CompetitionID:   comp.ID,
		TeamID:          team.ID,
		Title:           "AI Plan",
		TechStack:       "Vue Go FastAPI",
		TargetAudience:  "Students",
		MarketAnalysis:  "Education market",
		Innovation:      "LLM assistant",
		ExpectedOutcome: "Demo",
		Timeline:        "8 weeks",
		Status:          models.PrePlanStatusApproved,
	}
	if err := db.Create(&preplan).Error; err != nil {
		t.Fatalf("failed to create preplan: %v", err)
	}

	aiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ai/api/v1/review/execution-match" {
			t.Fatalf("unexpected AI path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"match_score":82,"dimension_scores":{"alignment":80},"summary":"基本一致","gaps":[{"area":"scope","severity":"medium","description":"范围略缩小"}],"recommendations":["补齐验收材料"]}`))
	}))
	defer aiServer.Close()

	h := NewPrePlanHandler(&services.AIServiceClient{BaseURL: aiServer.URL, HTTPClient: aiServer.Client()})
	r := gin.New()
	r.POST("/pre-plans/:id/execution-match", func(c *gin.Context) {
		c.Set("user_id", student.ID)
		c.Set("role", models.RoleStudent)
		h.ExecutionMatch(c)
	})

	w, req := postJSONRequest(t, "/pre-plans/"+strconvFormatUint(preplan.ID)+"/execution-match", map[string]interface{}{
		"execution_text": "完成 MVP，但暂未上线数据看板",
	})
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var execution models.ExecutionPlan
	if err := db.First(&execution, "pre_plan_id = ?", preplan.ID).Error; err != nil {
		t.Fatalf("expected persisted execution plan: %v", err)
	}
	if execution.AIMatchScore == nil || *execution.AIMatchScore != 82 {
		t.Fatalf("expected match score 82, got %v", execution.AIMatchScore)
	}
	if !strings.Contains(execution.Deviations, "范围略缩小") {
		t.Fatalf("expected stored AI result in deviations, got %q", execution.Deviations)
	}
}

func strconvFormatUint(v uint) string {
	return strconv.FormatUint(uint64(v), 10)
}
