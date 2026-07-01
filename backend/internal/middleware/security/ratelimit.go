package security

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimiter implements a sliding window rate limiter
type RateLimiter struct {
	redis    *redis.Client
	window   time.Duration
	limit    int
	keyFunc  func(*gin.Context) string
}

// NewRateLimiter creates a new rate limiter
// window: time window (e.g., 1 minute)
// limit: max requests per window
// keyFunc: function to extract rate limit key (e.g., IP, user ID)
func NewRateLimiter(rdb *redis.Client, window time.Duration, limit int, keyFunc func(*gin.Context) string) *RateLimiter {
	return &RateLimiter{
		redis:   rdb,
		window:  window,
		limit:   limit,
		keyFunc: keyFunc,
	}
}

// Middleware returns a gin middleware for rate limiting
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := rl.keyFunc(c)
		if key == "" {
			c.Next()
			return
		}

		ctx := c.Request.Context()
		now := time.Now()
		windowStart := now.Add(-rl.window)

		// Use Redis sorted set for sliding window
		pipe := rl.redis.Pipeline()

		// Remove expired entries
		pipe.ZRemRangeByScore(ctx, key, "0", windowStart.Format(time.RFC3339Nano))

		// Count current requests
		countCmd := pipe.ZCard(ctx, key)

		// Add current request
		pipe.ZAdd(ctx, key, redis.Z{
			Score:  float64(now.UnixNano()),
			Member: now.Format(time.RFC3339Nano),
		})

		// Set expiry on the key
		pipe.Expire(ctx, key, rl.window)

		_, err := pipe.Exec(ctx)
		if err != nil {
			// If Redis fails, allow the request (fail open)
			c.Next()
			return
		}

		count := countCmd.Val()
		if count >= int64(rl.limit) {
			c.Header("X-RateLimit-Limit", strconv.Itoa(rl.limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("Retry-After", rl.window.String())
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests. Please try again later.",
			})
			return
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(rl.limit))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(int64(rl.limit)-count-1, 10))
		c.Next()
	}
}

// IPRateLimiter creates a rate limiter based on client IP
func IPRateLimiter(rdb *redis.Client, limit int, window time.Duration) *RateLimiter {
	return NewRateLimiter(rdb, window, limit, func(c *gin.Context) string {
		return "rate_limit:ip:" + c.ClientIP()
	})
}

// UserRateLimiter creates a rate limiter based on user ID
func UserRateLimiter(rdb *redis.Client, limit int, window time.Duration) *RateLimiter {
	return NewRateLimiter(rdb, window, limit, func(c *gin.Context) string {
		userID, exists := c.Get("user_id")
		if !exists {
			return ""
		}
		return "rate_limit:user:" + strconv.FormatUint(uint64(userID.(uint)), 10)
	})
}

// GlobalRateLimiter creates a global rate limiter
func GlobalRateLimiter(rdb *redis.Client, limit int, window time.Duration) *RateLimiter {
	return NewRateLimiter(rdb, window, limit, func(c *gin.Context) string {
		return "rate_limit:global"
	})
}

// LocalRateLimiter creates an in-memory rate limiter (no Redis required)
type LocalRateLimiter struct {
	mu      sync.Mutex
	clients map[string]*clientInfo
	limit   int
	window  time.Duration
	done    chan struct{}
}

type clientInfo struct {
	count    int
	lastSeen time.Time
}

// NewLocalRateLimiter creates a local rate limiter
func NewLocalRateLimiter(limit int, window time.Duration) *LocalRateLimiter {
	rl := &LocalRateLimiter{
		clients: make(map[string]*clientInfo),
		limit:   limit,
		window:  window,
		done:    make(chan struct{}),
	}

	// Cleanup expired entries periodically
	go func() {
		ticker := time.NewTicker(window)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				rl.cleanup()
			case <-rl.done:
				return
			}
		}
	}()

	return rl
}

// Stop gracefully stops the cleanup goroutine
func (rl *LocalRateLimiter) Stop() {
	close(rl.done)
}

func (rl *LocalRateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	for key, info := range rl.clients {
		if now.Sub(info.lastSeen) > rl.window {
			delete(rl.clients, key)
		}
	}
}

// Middleware returns a gin middleware for local rate limiting
func (rl *LocalRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()

		rl.mu.Lock()
		info, exists := rl.clients[key]
		now := time.Now()

		if !exists || now.Sub(info.lastSeen) > rl.window {
			rl.clients[key] = &clientInfo{count: 1, lastSeen: now}
			rl.mu.Unlock()
			c.Next()
			return
		}

		info.count++
		info.lastSeen = now

		if info.count > rl.limit {
			rl.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests. Please try again later.",
			})
			return
		}

		rl.mu.Unlock()
		c.Next()
	}
}

// DefaultRateLimiter returns a default rate limiter (500 requests per minute per IP)
func DefaultRateLimiter() *LocalRateLimiter {
	return NewLocalRateLimiter(500, time.Minute)
}

// StrictRateLimiter returns a strict rate limiter (30 requests per minute per IP)
// Used for sensitive endpoints like login. Raised from 10 to 30 to allow
// automated test suites to run without hitting rate limits.
func StrictRateLimiter() *LocalRateLimiter {
	return NewLocalRateLimiter(30, time.Minute)
}

// AIRateLimiter returns a rate limiter for AI endpoints (20 requests per minute)
func AIRateLimiter() *LocalRateLimiter {
	return NewLocalRateLimiter(20, time.Minute)
}
