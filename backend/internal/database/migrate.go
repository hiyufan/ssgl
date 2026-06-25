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
		&models.CompetitionFavorite{},
		&models.CompetitionSubscription{},
		&models.AchievementPoint{},
		&models.CompetitionNote{},
		&models.CompetitionFeedback{},
	); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	log.Println("database migrations completed")

	// Create indexes for frequently queried columns
	log.Println("creating performance indexes...")
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_teams_competition_id ON teams(competition_id)",
		"CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id)",
		"CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)",
		"CREATE INDEX IF NOT EXISTS idx_awards_competition_id ON awards(competition_id)",
		"CREATE INDEX IF NOT EXISTS idx_awards_team_id ON awards(team_id)",
		"CREATE INDEX IF NOT EXISTS idx_awards_status ON awards(status)",
		"CREATE INDEX IF NOT EXISTS idx_pre_plans_competition_id ON pre_plans(competition_id)",
		"CREATE INDEX IF NOT EXISTS idx_pre_plans_team_id ON pre_plans(team_id)",
		"CREATE INDEX IF NOT EXISTS idx_pre_plans_status ON pre_plans(status)",
		"CREATE INDEX IF NOT EXISTS idx_competition_registrations_competition_id ON competition_registrations(competition_id)",
		"CREATE INDEX IF NOT EXISTS idx_student_evaluations_teacher_id ON student_evaluations(teacher_id)",
		"CREATE INDEX IF NOT EXISTS idx_student_evaluations_student_id ON student_evaluations(student_id)",
		"CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status)",
		"CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
	}
	for _, idx := range indexes {
		if err := db.Exec(idx).Error; err != nil {
			log.Printf("warning: failed to create index: %v", err)
		}
	}
	log.Println("performance indexes created")
}
