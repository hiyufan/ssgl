package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all application configuration.
type Config struct {
	DB     DBConfig
	Redis  RedisConfig
	JWT    JWTConfig
	Server ServerConfig
	AI     AIConfig
}

// DBConfig holds PostgreSQL connection settings.
type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
	TimeZone string
}

// DSN returns the PostgreSQL connection string.
func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		d.Host, d.User, d.Password, d.Name, d.Port, d.SSLMode, d.TimeZone,
	)
}

// RedisConfig holds Redis connection settings.
type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

// JWTConfig holds JWT authentication settings.
type JWTConfig struct {
	Secret     string
	Expiration time.Duration
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Port string
	Mode string
}

// AIConfig holds AI service settings.
type AIConfig struct {
	APIKey  string
	BaseURL string
	Model   string
}

// Load reads configuration from environment variables (and .env file).
func Load() *Config {
	// Load .env file if present; ignore error if it doesn't exist.
	_ = godotenv.Load()

	return &Config{
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			Name:     getEnv("DB_NAME", "ssgl"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			TimeZone: getEnv("DB_TIMEZONE", "Asia/Shanghai"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "change-me-in-production"),
			Expiration: parseDuration("JWT_EXPIRATION", 24*time.Hour),
		},
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
			Mode: getEnv("GIN_MODE", "debug"),
		},
		AI: AIConfig{
			APIKey:  getEnv("AI_API_KEY", ""),
			BaseURL: getEnv("AI_BASE_URL", ""),
			Model:   getEnv("AI_MODEL", ""),
		},
	}
}

// getEnv returns the environment variable value or the fallback.
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// getEnvInt returns the environment variable as an int or the fallback.
func getEnvInt(key string, fallback int) int {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		return fallback
	}
	return n
}

// parseDuration reads a duration in seconds from the environment or returns the fallback.
func parseDuration(key string, fallback time.Duration) time.Duration {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	// Try parsing as seconds first (e.g. "3600").
	if secs, err := strconv.ParseInt(val, 10, 64); err == nil {
		return time.Duration(secs) * time.Second
	}
	// Fall back to Go duration string (e.g. "24h").
	d, err := time.ParseDuration(val)
	if err != nil {
		return fallback
	}
	return d
}
