package database

import (
	"log"

	"github.com/ssgl/competition-platform/internal/models"
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
		&models.AIAnalysisLog{},
	); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	log.Println("database migrations completed")
}
