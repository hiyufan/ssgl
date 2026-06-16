package config

import (
	"os"
	"testing"
	"time"
)

func TestDBConfigDSN(t *testing.T) {
	tests := []struct {
		name string
		cfg  DBConfig
		want string
	}{
		{
			name: "default config",
			cfg: DBConfig{
				Host: "localhost", Port: "5432", User: "postgres",
				Password: "testpw", Name: "ssgl", SSLMode: "disable", TimeZone: "Asia/Shanghai",
			},
			want: "host=localhost user=postgres password=testpw dbname=ssgl port=5432 sslmode=disable TimeZone=Asia/Shanghai",
		},
		{
			name: "custom config",
			cfg: DBConfig{
				Host: "db.example.com", Port: "5433", User: "admin",
				Password: "custompw", Name: "mydb", SSLMode: "require", TimeZone: "UTC",
			},
			want: "host=db.example.com user=admin password=custompw dbname=mydb port=5433 sslmode=require TimeZone=UTC",
		},
		{
			name: "empty password",
			cfg: DBConfig{
				Host: "localhost", Port: "5432", User: "cyf",
				Password: "", Name: "ssgl", SSLMode: "disable", TimeZone: "Asia/Shanghai",
			},
			want: "host=localhost user=cyf password= dbname=ssgl port=5432 sslmode=disable TimeZone=Asia/Shanghai",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.cfg.DSN()
			if got != tt.want {
				t.Errorf("DSN() =\n  %q\nwant:\n  %q", got, tt.want)
			}
		})
	}
}

func TestGetEnv(t *testing.T) {
	// Test with existing env var
	os.Setenv("SSGL_TEST_KEY", "test_value")
	defer os.Unsetenv("SSGL_TEST_KEY")

	val := getEnv("SSGL_TEST_KEY", "fallback")
	if val != "test_value" {
		t.Errorf("getEnv() = %q, want %q", val, "test_value")
	}

	// Test with missing env var (should return fallback)
	val = getEnv("SSGL_NONEXISTENT_KEY_xyz", "fallback_val")
	if val != "fallback_val" {
		t.Errorf("getEnv() = %q, want %q", val, "fallback_val")
	}

	// Test with empty env var (should return fallback)
	os.Setenv("SSGL_TEST_EMPTY", "")
	defer os.Unsetenv("SSGL_TEST_EMPTY")
	val = getEnv("SSGL_TEST_EMPTY", "fallback_empty")
	if val != "fallback_empty" {
		t.Errorf("getEnv() with empty = %q, want %q", val, "fallback_empty")
	}
}

func TestGetEnvInt(t *testing.T) {
	// Test with valid int
	os.Setenv("SSGL_TEST_INT", "42")
	defer os.Unsetenv("SSGL_TEST_INT")

	val := getEnvInt("SSGL_TEST_INT", 0)
	if val != 42 {
		t.Errorf("getEnvInt() = %d, want 42", val)
	}

	// Test with invalid int (should return fallback)
	os.Setenv("SSGL_TEST_BAD_INT", "abc")
	defer os.Unsetenv("SSGL_TEST_BAD_INT")
	val = getEnvInt("SSGL_TEST_BAD_INT", 10)
	if val != 10 {
		t.Errorf("getEnvInt() with bad int = %d, want 10", val)
	}

	// Test with missing env var (should return fallback)
	val = getEnvInt("SSGL_NONEXISTENT_INT_xyz", 99)
	if val != 99 {
		t.Errorf("getEnvInt() missing = %d, want 99", val)
	}
}

func TestParseDuration(t *testing.T) {
	// Test with seconds
	os.Setenv("SSGL_TEST_DUR", "3600")
	defer os.Unsetenv("SSGL_TEST_DUR")

	d := parseDuration("SSGL_TEST_DUR", time.Hour)
	if d != 3600*time.Second {
		t.Errorf("parseDuration() = %v, want %v", d, 3600*time.Second)
	}

	// Test with Go duration string
	os.Setenv("SSGL_TEST_DUR2", "2h30m")
	defer os.Unsetenv("SSGL_TEST_DUR2")
	d = parseDuration("SSGL_TEST_DUR2", time.Hour)
	if d != 2*time.Hour+30*time.Minute {
		t.Errorf("parseDuration() = %v, want %v", d, 2*time.Hour+30*time.Minute)
	}

	// Test with missing env var (should return fallback)
	d = parseDuration("SSGL_NONEXISTENT_DUR_xyz", 24*time.Hour)
	if d != 24*time.Hour {
		t.Errorf("parseDuration() missing = %v, want %v", d, 24*time.Hour)
	}

	// Test with invalid duration (should return fallback)
	os.Setenv("SSGL_TEST_BAD_DUR", "not_a_duration")
	defer os.Unsetenv("SSGL_TEST_BAD_DUR")
	d = parseDuration("SSGL_TEST_BAD_DUR", 5*time.Hour)
	if d != 5*time.Hour {
		t.Errorf("parseDuration() bad = %v, want %v", d, 5*time.Hour)
	}
}

func TestConfigStructs(t *testing.T) {
	// Test that all config structs can be created and fields assigned
	cfg := &Config{
		DB: DBConfig{
			Host: "localhost", Port: "5432", User: "test",
			Password: "pass", Name: "testdb", SSLMode: "disable", TimeZone: "UTC",
		},
		Redis: RedisConfig{
			Host: "localhost", Port: "6379", Password: "", DB: 0,
		},
		JWT: JWTConfig{
			Secret:     "test-secret-key-for-unit-testing-32chars",
			Expiration: 24 * time.Hour,
		},
		Server: ServerConfig{
			Port: "8080", Mode: "debug",
		},
		AI: AIConfig{
			APIKey: "key", BaseURL: "http://localhost:8000", Model: "test",
		},
	}

	if cfg.DB.Host != "localhost" {
		t.Errorf("DB.Host = %q, want %q", cfg.DB.Host, "localhost")
	}
	if cfg.JWT.Expiration != 24*time.Hour {
		t.Errorf("JWT.Expiration = %v, want %v", cfg.JWT.Expiration, 24*time.Hour)
	}
	if cfg.Server.Port != "8080" {
		t.Errorf("Server.Port = %q, want %q", cfg.Server.Port, "8080")
	}
	if cfg.AI.BaseURL != "http://localhost:8000" {
		t.Errorf("AI.BaseURL = %q, want %q", cfg.AI.BaseURL, "http://localhost:8000")
	}
	if cfg.Redis.DB != 0 {
		t.Errorf("Redis.DB = %d, want 0", cfg.Redis.DB)
	}
}

func TestLoadDefaults(t *testing.T) {
	// Clear any existing env vars that might interfere
	envVars := []string{"DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "DB_SSLMODE", "DB_TIMEZONE",
		"REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD", "REDIS_DB",
		"JWT_SECRET", "JWT_EXPIRATION", "SERVER_PORT", "GIN_MODE",
		"AI_API_KEY", "AI_BASE_URL", "AI_MODEL"}
	for _, v := range envVars {
		os.Unsetenv(v)
	}

	cfg := Load()

	// Check defaults
	if cfg.DB.Host != "localhost" {
		t.Errorf("default DB.Host = %q, want %q", cfg.DB.Host, "localhost")
	}
	if cfg.DB.Port != "5432" {
		t.Errorf("default DB.Port = %q, want %q", cfg.DB.Port, "5432")
	}
	if cfg.DB.User != "postgres" {
		t.Errorf("default DB.User = %q, want %q", cfg.DB.User, "postgres")
	}
	if cfg.DB.Name != "ssgl" {
		t.Errorf("default DB.Name = %q, want %q", cfg.DB.Name, "ssgl")
	}
	if cfg.DB.SSLMode != "disable" {
		t.Errorf("default DB.SSLMode = %q, want %q", cfg.DB.SSLMode, "disable")
	}
	if cfg.DB.TimeZone != "Asia/Shanghai" {
		t.Errorf("default DB.TimeZone = %q, want %q", cfg.DB.TimeZone, "Asia/Shanghai")
	}
	if cfg.Redis.Host != "localhost" {
		t.Errorf("default Redis.Host = %q, want %q", cfg.Redis.Host, "localhost")
	}
	if cfg.Redis.Port != "6379" {
		t.Errorf("default Redis.Port = %q, want %q", cfg.Redis.Port, "6379")
	}
	if cfg.JWT.Secret != defaultJWTSecret {
		t.Errorf("default JWT.Secret = %q, want %q", cfg.JWT.Secret, defaultJWTSecret)
	}
	if cfg.JWT.Expiration != 24*time.Hour {
		t.Errorf("default JWT.Expiration = %v, want %v", cfg.JWT.Expiration, 24*time.Hour)
	}
	if cfg.Server.Port != "8080" {
		t.Errorf("default Server.Port = %q, want %q", cfg.Server.Port, "8080")
	}
	if cfg.Server.Mode != "debug" {
		t.Errorf("default Server.Mode = %q, want %q", cfg.Server.Mode, "debug")
	}
}

func TestLoadWithEnvOverrides(t *testing.T) {
	// Set custom env vars
	os.Setenv("DB_HOST", "custom-host")
	os.Setenv("DB_PORT", "5433")
	os.Setenv("DB_NAME", "custom_db")
	os.Setenv("JWT_SECRET", "my-super-secret-key-that-is-long-enough")
	os.Setenv("SERVER_PORT", "9090")
	os.Setenv("GIN_MODE", "release")
	defer func() {
		os.Unsetenv("DB_HOST")
		os.Unsetenv("DB_PORT")
		os.Unsetenv("DB_NAME")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("SERVER_PORT")
		os.Unsetenv("GIN_MODE")
	}()

	cfg := Load()

	if cfg.DB.Host != "custom-host" {
		t.Errorf("DB.Host = %q, want %q", cfg.DB.Host, "custom-host")
	}
	if cfg.DB.Port != "5433" {
		t.Errorf("DB.Port = %q, want %q", cfg.DB.Port, "5433")
	}
	if cfg.DB.Name != "custom_db" {
		t.Errorf("DB.Name = %q, want %q", cfg.DB.Name, "custom_db")
	}
	if cfg.JWT.Secret != "my-super-secret-key-that-is-long-enough" {
		t.Errorf("JWT.Secret = %q, want %q", cfg.JWT.Secret, "my-super-secret-key-that-is-long-enough")
	}
	if cfg.Server.Port != "9090" {
		t.Errorf("Server.Port = %q, want %q", cfg.Server.Port, "9090")
	}
	if cfg.Server.Mode != "release" {
		t.Errorf("Server.Mode = %q, want %q", cfg.Server.Mode, "release")
	}
}
