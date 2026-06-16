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

	// TODO: Connect to Redis for distributed rate limiting
	// redisClient := redis.NewClient(&redis.Options{Addr: cfg.Redis.Host + ":" + cfg.Redis.Port})
	// securityConfig.UseRedis = true
	// securityConfig.RedisClient = redisClient

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
		// Users.
		protected.GET("/users/me", authHandler.GetMe)
		protected.GET("/users/profile/me", profileHandler.GetMyProfile)
		protected.PUT("/users/profile", profileHandler.UpdateProfile)
		protected.GET("/users/profile/:id", profileHandler.GetProfile)
		protected.GET("/users", profileHandler.ListUsers)
		protected.GET("/users/me/activity", profileHandler.MyActivity)

		// Competitions (read — any authenticated user).
		protected.GET("/competitions", compHandler.List)
		protected.GET("/competitions/recommend", recommendHandler.Recommend)
		protected.GET("/competitions/:id", compHandler.Get)

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

		// Awards.
		protected.GET("/awards", awardHandler.List)
		protected.GET("/awards/:id", awardHandler.Get)

		// Evaluations.
		protected.GET("/evaluations", evalHandler.List)
		protected.GET("/evaluations/:id", evalHandler.Get)
		protected.POST("/evaluations", evalHandler.Create)

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

		// Notifications (read for all users).
		protected.GET("/notifications", notifHandler.List)
		protected.GET("/notifications/unread-count", notifHandler.UnreadCount)
		protected.POST("/notifications/:id/read", notifHandler.MarkRead)
		protected.POST("/notifications/read-all", notifHandler.MarkAllRead)

		// Teammate matching.
		protected.GET("/teams/match", matchHandler.Match)

		// Calendar.
		protected.GET("/calendar", calendarHandler.List)

		// Leaderboard.
		protected.GET("/leaderboard", statsHandler.Leaderboard)

		// Showcase — settled awards for public display.
		protected.GET("/showcase", showcaseHandler.List)

		// Data export.
		protected.GET("/stats/export/overview", statsHandler.ExportOverview)
		protected.GET("/stats/export/competitions", statsHandler.ExportCompetitions)
		protected.GET("/stats/export/teams", statsHandler.ExportTeams)
	}

	// Competition management — teacher/admin only (inherits auth + audit from protected).
	staff := protected.Group("")
	staff.Use(middleware.RequireRole(models.RoleTeacher, models.RoleAdmin))
	{
		staff.POST("/competitions", compHandler.Create)
		staff.PUT("/competitions/:id", compHandler.Update)
		staff.DELETE("/competitions/:id", compHandler.Delete)
		staff.POST("/competitions/:id/publish", compHandler.Publish)

		// Award nomination — teacher/admin only.
		staff.POST("/awards", awardHandler.Create)
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
