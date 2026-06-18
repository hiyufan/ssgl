package router

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/handlers"
	"github.com/ssgl/competition-platform/internal/middleware"
	"github.com/ssgl/competition-platform/internal/middleware/security"
	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
)

// Setup creates and configures the gin.Engine with all routes.
func Setup(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// Public health endpoint (no auth).
	r.GET("/health", func(c *gin.Context) {
		db := database.GetDB()
		dbOK := db != nil
		if dbOK {
			sqlDB, err := db.DB()
			if err != nil || sqlDB.Ping() != nil {
				dbOK = false
			}
		}
		status := "healthy"
		code := http.StatusOK
		if !dbOK {
			status = "degraded"
			code = http.StatusServiceUnavailable
		}
		c.JSON(code, gin.H{
			"status":   status,
			"database": dbOK,
			"service":  "ssgl-backend",
			"version":  "1.0.0",
		})
	})

	// Apply security middleware
	securityConfig := security.DefaultSecurityConfig()
	securityConfig.AllowedOrigins = []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:5173",
	}

	// NOTE: Distributed rate limiting via Redis is available as a future enhancement.
	// To enable, configure Redis connection in config.yaml and uncomment below:
	//   redisClient := redis.NewClient(&redis.Options{Addr: cfg.Redis.Host + ":" + cfg.Redis.Port})
	//   securityConfig.UseRedis = true
	//   securityConfig.RedisClient = redisClient
	// Currently using in-memory rate limiting which is sufficient for single-instance deployments.

	security.ApplySecurity(r, securityConfig)

	// Create services.
	authService := services.NewAuthService(&cfg.JWT)
	workflowService := services.NewWorkflowService()
	aiClient := services.NewAIServiceClient(&cfg.AI)

	// Create handlers.
	authHandler := handlers.NewAuthHandler(authService)
	compHandler := handlers.NewCompetitionHandler()
	teamHandler := handlers.NewTeamHandler()
	workflowHandler := handlers.NewWorkflowHandler(workflowService)
	preplanHandler := handlers.NewPrePlanHandler(aiClient)
	awardHandler := handlers.NewAwardHandler()
	evalHandler := handlers.NewEvaluationHandler()
	statsHandler := handlers.NewStatsHandler()
	calendarHandler := handlers.NewCalendarHandler()
	auditHandler := handlers.NewAuditHandler(database.GetDB())
	recommendHandler := handlers.NewRecommendHandler()
	notifHandler := handlers.NewNotificationHandler()
	showcaseHandler := handlers.NewShowcaseHandler()
	matchHandler := handlers.NewMatchHandler()
	profileHandler := handlers.NewProfileHandler()
	milestoneHandler := handlers.NewMilestoneHandler()
	globalSearchHandler := handlers.NewGlobalSearchHandler()
	diagnosticsHandler := handlers.NewDiagnosticsHandler()
	importHandler := handlers.NewImportHandler()
	registrationHandler := handlers.NewRegistrationHandler()
	teamAnalysisHandler := handlers.NewTeamAnalysisHandler()
	healthScoreHandler := handlers.NewHealthScoreHandler()

	v1 := r.Group("/api/v1")

	// Public routes with strict rate limiting.
	auth := v1.Group("/auth")
	security.ApplyAuthSecurity(auth, securityConfig)
	{
		auth.POST("/login", authHandler.Login)
		auth.POST("/register", authHandler.Register)
		auth.POST("/refresh", authHandler.Refresh)
	}

	// Protected routes.
	protected := v1.Group("")
	protected.Use(middleware.AuthMiddleware(&cfg.JWT))
	protected.Use(security.AuditMiddleware(database.GetDB()))
	{
		// Auth — change password.
		protected.PUT("/auth/password", authHandler.ChangePassword)

		// Users.
		protected.GET("/users/me", authHandler.GetMe)
		protected.GET("/users/profile/me", profileHandler.GetMyProfile)
		protected.PUT("/users/profile", profileHandler.UpdateProfile)
		protected.GET("/users/profile/:id", profileHandler.GetProfile)
		protected.GET("/users", profileHandler.ListUsers)
		protected.GET("/users/me/activity", profileHandler.MyActivity)

		// Global search.
		protected.GET("/search", globalSearchHandler.Search)

		// Competitions (read — any authenticated user).
		protected.GET("/competitions", compHandler.List)
		protected.GET("/competitions/recommend", recommendHandler.Recommend)
		protected.GET("/competitions/:id", compHandler.Get)
		protected.GET("/competitions/:id/stats", compHandler.CompetitionStats)

		// Teams.
		protected.GET("/teams", teamHandler.List)
		protected.POST("/teams", teamHandler.Create)
		protected.GET("/teams/:id", teamHandler.Get)
		protected.POST("/teams/:id/join", teamHandler.Join)
		protected.DELETE("/teams/:id/leave", teamHandler.Leave)
		protected.PUT("/teams/:id", teamHandler.Update)
		protected.DELETE("/teams/:id", teamHandler.Delete)
		protected.POST("/teams/:id/invite", teamHandler.Invite)
		protected.GET("/teams/:id/invites", teamHandler.ListInvites)
		protected.POST("/teams/invite/:code/accept", teamHandler.AcceptInvite)
		protected.POST("/teams/invite/:code/decline", teamHandler.DeclineInvite)
		protected.GET("/teams/invites/me", teamHandler.MyInvites)

		// Workflows.
		protected.GET("/workflows", workflowHandler.List)
		protected.GET("/workflows/:id", workflowHandler.Get)
		protected.POST("/workflows/:id/approve", workflowHandler.Approve)
		protected.POST("/workflows/:id/reject", workflowHandler.Reject)

		// Pre-plans.
		protected.GET("/pre-plans", preplanHandler.List)
		protected.POST("/pre-plans", preplanHandler.Create)
		protected.GET("/pre-plans/:id", preplanHandler.Get)
		protected.PUT("/pre-plans/:id", preplanHandler.Update)
		protected.POST("/pre-plans/:id/review", preplanHandler.AIReview)
		protected.POST("/pre-plans/:id/teacher-review", preplanHandler.TeacherReview)
		protected.DELETE("/pre-plans/:id", preplanHandler.Delete)

		// Awards.
		protected.GET("/awards", awardHandler.List)
		protected.GET("/awards/:id", awardHandler.Get)

		// Evaluations.
		protected.GET("/evaluations", evalHandler.List)
		protected.GET("/evaluations/:id", evalHandler.Get)
		protected.POST("/evaluations", evalHandler.Create)

		// Competition registrations (student self-register).
		protected.GET("/registrations", registrationHandler.List)
		protected.GET("/registrations/:id", registrationHandler.Get)
		protected.POST("/competitions/:id/register", registrationHandler.Register)
		protected.DELETE("/competitions/:id/register", registrationHandler.Deregister)
		protected.GET("/competitions/:id/registrations", registrationHandler.CompetitionRegistrations)

		// Stats.
		protected.GET("/stats/overview", statsHandler.Overview)
		protected.GET("/stats/competitions", statsHandler.Competitions)
		protected.GET("/stats/teachers", statsHandler.Teachers)
		protected.GET("/stats/students", statsHandler.Students)
		protected.GET("/stats/progress", statsHandler.Progress)
		protected.GET("/stats/type-distribution", statsHandler.TypeDistribution)
		protected.GET("/stats/recent-activity", statsHandler.RecentActivity)
		protected.GET("/stats/trends", statsHandler.Trends)
		protected.GET("/stats/engagement", statsHandler.Engagement)
		protected.GET("/stats/kanban", statsHandler.KanbanBoard)
		protected.GET("/stats/countdown", statsHandler.Countdown)

		// Platform health score.
		protected.GET("/stats/health-score", healthScoreHandler.Score)

		// Notifications (read for all users).
		protected.GET("/notifications", notifHandler.List)
		protected.GET("/notifications/unread-count", notifHandler.UnreadCount)
		protected.POST("/notifications/:id/read", notifHandler.MarkRead)
		protected.POST("/notifications/read-all", notifHandler.MarkAllRead)

		// Teammate matching.
		protected.GET("/teams/match", matchHandler.Match)

		// Team capability analysis.
		protected.GET("/teams/:id/analysis", teamAnalysisHandler.Analyze)

		// Calendar.
		protected.GET("/calendar", calendarHandler.List)
		protected.GET("/calendar/export", calendarHandler.ExportICS)

		// Leaderboard.
		protected.GET("/leaderboard", statsHandler.Leaderboard)

		// Showcase — settled awards for public display.
		protected.GET("/showcase", showcaseHandler.List)

		// System diagnostics.
		protected.GET("/system/diagnostics", diagnosticsHandler.Diagnostics)

		// Data export.
		protected.GET("/stats/export/overview", statsHandler.ExportOverview)
		protected.GET("/stats/export/competitions", statsHandler.ExportCompetitions)
		protected.GET("/stats/export/teams", statsHandler.ExportTeams)
		protected.GET("/stats/export/full", importHandler.ExportFull)

		// Milestones (read — any authenticated user).
		protected.GET("/competitions/:id/milestones", milestoneHandler.List)
		protected.GET("/milestones/:id", milestoneHandler.Get)
	}

	// Competition management — teacher/admin only (inherits auth + audit from protected).
	staff := protected.Group("")
	staff.Use(middleware.RequireRole(models.RoleTeacher, models.RoleAdmin))
	{
		staff.POST("/competitions", compHandler.Create)
		staff.PUT("/competitions/:id", compHandler.Update)
		staff.DELETE("/competitions/:id", compHandler.Delete)
		staff.POST("/competitions/:id/publish", compHandler.Publish)

		// Batch import — teacher/admin only.
		staff.POST("/competitions/import", importHandler.BatchImport)

		// Award nomination — teacher/admin only.
		staff.POST("/awards", awardHandler.Create)

		// Milestones — teacher/admin only.
		staff.POST("/milestones", milestoneHandler.Create)
		staff.PUT("/milestones/:id", milestoneHandler.Update)
		staff.DELETE("/milestones/:id", milestoneHandler.Delete)
		staff.POST("/competitions/:id/milestones/batch", milestoneHandler.BatchCreate)

		// Registration approval — teacher/admin only.
		staff.POST("/registrations/:id/approve", registrationHandler.Approve)
		staff.POST("/registrations/:id/reject", registrationHandler.Reject)
	}

	// Admin-only routes.
	admin := v1.Group("")
	admin.Use(middleware.AuthMiddleware(&cfg.JWT))
	admin.Use(security.AuditMiddleware(database.GetDB()))
	admin.Use(middleware.RequireRole("admin"))
	{
		admin.POST("/awards/:id/settle", awardHandler.Settle)

		// Notification management — admin only.
		admin.POST("/notifications", notifHandler.Create)

		// Audit logs
		admin.GET("/audit-logs", auditHandler.List)
		admin.GET("/audit-logs/stats", auditHandler.GetStats)
	}

	log.Println("✅ Security middleware applied")
	return r
}
