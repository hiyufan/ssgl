package security

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// SecurityConfig holds all security configuration
type SecurityConfig struct {
	// CORS
	AllowedOrigins []string

	// Rate Limiting
	GlobalRateLimit    int
	IPRateLimit        int
	UserRateLimit      int
	AuthRateLimit      int
	RateLimitWindow    time.Duration
	UseRedis           bool
	RedisClient        *redis.Client

	// AI Service
	AIApiKey     string
	AISigningKey string

	// Password
	PasswordConfig *PasswordConfig
}

// DefaultSecurityConfig returns default security configuration
func DefaultSecurityConfig() *SecurityConfig {
	return &SecurityConfig{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"},
		GlobalRateLimit:  1000,
		IPRateLimit:      100,
		UserRateLimit:    200,
		AuthRateLimit:    10,
		RateLimitWindow:  time.Minute,
		UseRedis:         false,
		RedisClient:      nil,
		AIApiKey:         "",
		AISigningKey:     "",
		PasswordConfig:   DefaultPasswordConfig(),
	}
}

// ApplySecurity applies all security middleware to the router
func ApplySecurity(r *gin.Engine, config *SecurityConfig) {
	// 1. Request ID
	r.Use(RequestID())

	// 2. Security Headers
	r.Use(SecurityHeaders())

	// 3. Secure CORS
	r.Use(CORSSecure(config.AllowedOrigins))

	// 4. Rate Limiting (Redis or local)
	if config.UseRedis && config.RedisClient != nil {
		r.Use(RedisIPRateLimiter(config.RedisClient, config.IPRateLimit, config.RateLimitWindow).Middleware())
	} else {
		r.Use(DefaultRateLimiter().Middleware())
	}

	// 5. Input Validation
	r.Use(InputValidation())

	// 6. Recovery (panic recovery)
	r.Use(gin.Recovery())
}

// ApplyAuthSecurity applies security middleware for auth routes
func ApplyAuthSecurity(r *gin.RouterGroup, config *SecurityConfig) {
	// Strict rate limiting for auth endpoints
	if config.UseRedis && config.RedisClient != nil {
		r.Use(RedisAuthRateLimiter(config.RedisClient).Middleware())
	} else {
		r.Use(StrictRateLimiter().Middleware())
	}
}

// ApplyAISecurity applies security middleware for AI routes
func ApplyAISecurity(r *gin.RouterGroup, config *SecurityConfig) {
	// Rate limiting for AI endpoints
	if config.UseRedis && config.RedisClient != nil {
		r.Use(RedisAIRateLimiter(config.RedisClient).Middleware())
	} else {
		r.Use(AIRateLimiter().Middleware())
	}

	// AI service authentication if configured
	if config.AIApiKey != "" {
		r.Use(AIAuthMiddleware(&AIAuthServiceConfig{
			APIKey:     config.AIApiKey,
			SigningKey: config.AISigningKey,
			Expiry:     5 * time.Minute,
		}))
	}
}
