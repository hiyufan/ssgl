package database

import (
	"log"

	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/middleware/security"
)

// Migrate auto-migrates all database models.
// Passing all models in a single call lets GORM resolve dependency order.
func Migrate() {
	db := GetDB()

	log.Println("running database migrations...")

	if err := db.AutoMigrate(
		&models.User{},
		&models.Competition{},
		&models.Team{},
		&models.TeamMember{},
		&models.ApprovalWorkflow{},
		&models.ApprovalStep{},
		&models.PrePlan{},
		&models.ExecutionPlan{},
		&models.Award{},
		&models.StudentEvaluation{},
		&models.Notification{},
		&models.TeamInvite{},
		&models.AIAnalysisLog{},
		&security.AuditLog{},
		&models.Milestone{},
		&models.CompetitionRegistration{},
	); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	log.Println("database migrations completed")
}
