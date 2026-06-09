package security

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RedisRateLimiter implements a distributed rate limiter using Redis
type RedisRateLimiter struct {
	client     *redis.Client
	window     time.Duration
	limit      int
	keyPrefix  string
	keyFunc    func(*gin.Context) string
}

// NewRedisRateLimiter creates a new Redis-based rate limiter
func NewRedisRateLimiter(client *redis.Client, window time.Duration, limit int, keyPrefix string, keyFunc func(*gin.Context) string) *RedisRateLimiter {
	return &RedisRateLimiter{
		client:    client,
		window:    window,
		limit:     limit,
		keyPrefix: keyPrefix,
		keyFunc:   keyFunc,
	}
}

// Middleware returns a gin middleware for Redis rate limiting
func (rl *RedisRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := rl.keyFunc(c)
		if key == "" {
			c.Next()
			return
		}

		ctx := context.Background()
		redisKey := fmt.Sprintf("%s:%s", rl.keyPrefix, key)

		// Use Redis Lua script for atomic sliding window
		script := redis.NewScript(`
			local key = KEYS[1]
			local window = tonumber(ARGV[1])
			local limit = tonumber(ARGV[2])
			local now = tonumber(ARGV[3])

			-- Remove expired entries
			redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

			-- Count current requests
			local count = redis.call('ZCARD', key)

			if count < limit then
				-- Add current request
				redis.call('ZADD', key, now, now .. '-' .. math.random())
				redis.call('EXPIRE', key, window / 1000)
				return count + 1
			else
				return -1
			end
		`)

		now := time.Now().UnixMilli()
		windowMs := rl.window.Milliseconds()

		result, err := script.Run(ctx, rl.client, []string{redisKey}, windowMs, rl.limit, now).Int()
		if err != nil {
			// If Redis fails, allow the request (fail open)
			c.Next()
			return
		}

		if result == -1 {
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("Retry-After", fmt.Sprintf("%d", int(rl.window.Seconds())))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests. Please try again later.",
			})
			return
		}

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", rl.limit-result))
		c.Next()
	}
}

// RedisIPRateLimiter creates a Redis rate limiter based on client IP
func RedisIPRateLimiter(client *redis.Client, limit int, window time.Duration) *RedisRateLimiter {
	return NewRedisRateLimiter(client, window, limit, "rate_limit:ip", func(c *gin.Context) string {
		return c.ClientIP()
	})
}

// RedisUserRateLimiter creates a Redis rate limiter based on user ID
func RedisUserRateLimiter(client *redis.Client, limit int, window time.Duration) *RedisRateLimiter {
	return NewRedisRateLimiter(client, window, limit, "rate_limit:user", func(c *gin.Context) string {
		userID, exists := c.Get("user_id")
		if !exists {
			return ""
		}
		return fmt.Sprintf("%d", userID.(uint))
	})
}

// RedisGlobalRateLimiter creates a global Redis rate limiter
func RedisGlobalRateLimiter(client *redis.Client, limit int, window time.Duration) *RedisRateLimiter {
	return NewRedisRateLimiter(client, window, limit, "rate_limit:global", func(c *gin.Context) string {
		return "all"
	})
}

// RedisAuthRateLimiter creates a Redis rate limiter for auth endpoints
func RedisAuthRateLimiter(client *redis.Client) *RedisRateLimiter {
	return NewRedisRateLimiter(client, time.Minute, 10, "rate_limit:auth", func(c *gin.Context) string {
		return c.ClientIP()
	})
}

// RedisAIRateLimiter creates a Redis rate limiter for AI endpoints
func RedisAIRateLimiter(client *redis.Client) *RedisRateLimiter {
	return NewRedisRateLimiter(client, time.Minute, 20, "rate_limit:ai", func(c *gin.Context) string {
		userID, exists := c.Get("user_id")
		if !exists {
			return c.ClientIP()
		}
		return fmt.Sprintf("%d", userID.(uint))
	})
}
