package services

import (
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"gorm.io/gorm"
)

func setupWorkflowBusinessTestDB(t *testing.T) *gorm.DB {
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
		&models.CompetitionRegistration{},
		&models.PrePlan{},
		&models.Award{},
		&models.ApprovalWorkflow{},
		&models.ApprovalStep{},
	); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}

	return db
}

func TestWorkflowApproveSyncsRegistrationStatus(t *testing.T) {
	db := setupWorkflowBusinessTestDB(t)

	student := models.User{Username: "student", Email: "student@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive}
	teacher := models.User{Username: "teacher", Email: "teacher@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive}
	if err := db.Create(&student).Error; err != nil {
		t.Fatalf("failed to create student: %v", err)
	}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatalf("failed to create teacher: %v", err)
	}

	reg := models.CompetitionRegistration{CompetitionID: 10, UserID: student.ID, Status: models.RegStatusPending}
	if err := db.Create(&reg).Error; err != nil {
		t.Fatalf("failed to create registration: %v", err)
	}

	svc := NewWorkflowService()
	workflow, err := svc.Create(CreateWorkflowInput{
		Type:        models.WorkflowTypeRegistration,
		TargetID:    reg.ID,
		SubmitterID: student.ID,
		ApproverIDs: []uint{teacher.ID},
	})
	if err != nil {
		t.Fatalf("failed to create workflow: %v", err)
	}

	if _, err := svc.Approve(workflow.ID, teacher.ID, "ok"); err != nil {
		t.Fatalf("failed to approve workflow: %v", err)
	}

	var updated models.CompetitionRegistration
	if err := db.First(&updated, reg.ID).Error; err != nil {
		t.Fatalf("failed to reload registration: %v", err)
	}
	if updated.Status != models.RegStatusApproved {
		t.Fatalf("expected registration status %q, got %q", models.RegStatusApproved, updated.Status)
	}
}

func TestWorkflowRejectSyncsPrePlanStatus(t *testing.T) {
	db := setupWorkflowBusinessTestDB(t)

	student := models.User{Username: "student2", Email: "student2@example.com", Password: "x", Role: models.RoleStudent, Status: models.StatusActive}
	teacher := models.User{Username: "teacher2", Email: "teacher2@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive}
	if err := db.Create(&student).Error; err != nil {
		t.Fatalf("failed to create student: %v", err)
	}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatalf("failed to create teacher: %v", err)
	}

	preplan := models.PrePlan{CompetitionID: 1, TeamID: 1, Title: "Plan", Status: models.PrePlanStatusSubmitted}
	if err := db.Create(&preplan).Error; err != nil {
		t.Fatalf("failed to create preplan: %v", err)
	}

	svc := NewWorkflowService()
	workflow, err := svc.Create(CreateWorkflowInput{
		Type:        models.WorkflowTypePrePlan,
		TargetID:    preplan.ID,
		SubmitterID: student.ID,
		ApproverIDs: []uint{teacher.ID},
	})
	if err != nil {
		t.Fatalf("failed to create workflow: %v", err)
	}

	if _, err := svc.Reject(workflow.ID, teacher.ID, "needs work"); err != nil {
		t.Fatalf("failed to reject workflow: %v", err)
	}

	var updated models.PrePlan
	if err := db.First(&updated, preplan.ID).Error; err != nil {
		t.Fatalf("failed to reload preplan: %v", err)
	}
	if updated.Status != models.PrePlanStatusRejected {
		t.Fatalf("expected preplan status %q, got %q", models.PrePlanStatusRejected, updated.Status)
	}
}

func TestWorkflowRewardStepsConfirmAndSettleAward(t *testing.T) {
	db := setupWorkflowBusinessTestDB(t)

	teacher := models.User{Username: "teacher3", Email: "teacher3@example.com", Password: "x", Role: models.RoleTeacher, Status: models.StatusActive}
	admin := models.User{Username: "admin", Email: "admin@example.com", Password: "x", Role: models.RoleAdmin, Status: models.StatusActive}
	if err := db.Create(&teacher).Error; err != nil {
		t.Fatalf("failed to create teacher: %v", err)
	}
	if err := db.Create(&admin).Error; err != nil {
		t.Fatalf("failed to create admin: %v", err)
	}

	award := models.Award{CompetitionID: 1, TeamID: 1, Rank: 1, PrizeAmount: 3000, Status: models.AwardStatusPending}
	if err := db.Create(&award).Error; err != nil {
		t.Fatalf("failed to create award: %v", err)
	}

	svc := NewWorkflowService()
	workflow, err := svc.Create(CreateWorkflowInput{
		Type:        models.WorkflowTypeReward,
		TargetID:    award.ID,
		SubmitterID: teacher.ID,
		ApproverIDs: []uint{teacher.ID, admin.ID},
	})
	if err != nil {
		t.Fatalf("failed to create workflow: %v", err)
	}

	if _, err := svc.Approve(workflow.ID, teacher.ID, "confirmed"); err != nil {
		t.Fatalf("failed to approve teacher step: %v", err)
	}
	var afterTeacher models.Award
	if err := db.First(&afterTeacher, award.ID).Error; err != nil {
		t.Fatalf("failed to reload award after teacher step: %v", err)
	}
	if afterTeacher.Status != models.AwardStatusTeacherConfirm {
		t.Fatalf("expected award status %q after first step, got %q", models.AwardStatusTeacherConfirm, afterTeacher.Status)
	}

	if _, err := svc.Approve(workflow.ID, admin.ID, "settle"); err != nil {
		t.Fatalf("failed to approve admin step: %v", err)
	}
	var settled models.Award
	if err := db.First(&settled, award.ID).Error; err != nil {
		t.Fatalf("failed to reload settled award: %v", err)
	}
	if settled.Status != models.AwardStatusSettled {
		t.Fatalf("expected award status %q, got %q", models.AwardStatusSettled, settled.Status)
	}
	if settled.SettledAt == nil {
		t.Fatal("expected settled_at to be set")
	}
	if settled.SettledBy == nil || *settled.SettledBy != admin.ID {
		t.Fatalf("expected settled_by %d, got %v", admin.ID, settled.SettledBy)
	}
}
