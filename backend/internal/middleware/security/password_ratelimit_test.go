package security

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// --- Password tests ---

func TestDefaultPasswordConfig(t *testing.T) {
	cfg := DefaultPasswordConfig()
	if cfg.MinLength != 8 {
		t.Errorf("expected MinLength=8, got %d", cfg.MinLength)
	}
	if cfg.MaxLength != 128 {
		t.Errorf("expected MaxLength=128, got %d", cfg.MaxLength)
	}
	if !cfg.RequireUppercase {
		t.Error("expected RequireUppercase=true")
	}
	if !cfg.RequireLowercase {
		t.Error("expected RequireLowercase=true")
	}
	if !cfg.RequireDigit {
		t.Error("expected RequireDigit=true")
	}
	if cfg.RequireSpecial {
		t.Error("expected RequireSpecial=false")
	}
	if cfg.BcryptCost != 12 {
		t.Errorf("expected BcryptCost=12, got %d", cfg.BcryptCost)
	}
}

func TestHashPassword_Success(t *testing.T) {
	hash, err := HashPassword("TestPass1", 4) // low cost for speed
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if hash == "" {
		t.Error("expected non-empty hash")
	}
	if hash == "TestPass1" {
		t.Error("hash should not equal plaintext")
	}
}

func TestCheckPassword_Correct(t *testing.T) {
	hash, _ := HashPassword("TestPass1", 4)
	if !CheckPassword("TestPass1", hash) {
		t.Error("expected password to match")
	}
}

func TestCheckPassword_Incorrect(t *testing.T) {
	hash, _ := HashPassword("TestPass1", 4)
	if CheckPassword("WrongPass", hash) {
		t.Error("expected password not to match")
	}
}

func TestValidatePassword_TooShort(t *testing.T) {
	cfg := DefaultPasswordConfig()
	ok, msg := ValidatePasswordWithConfig("Ab1", cfg)
	if ok {
		t.Error("expected validation to fail for short password")
	}
	if msg == "" {
		t.Error("expected error message")
	}
}

func TestValidatePassword_TooLong(t *testing.T) {
	cfg := DefaultPasswordConfig()
	long := make([]byte, 200)
	for i := range long {
		long[i] = 'A'
	}
	ok, _ := ValidatePasswordWithConfig(string(long)+"1a", cfg)
	if ok {
		t.Error("expected validation to fail for long password")
	}
}

func TestValidatePassword_NoUppercase(t *testing.T) {
	cfg := DefaultPasswordConfig()
	ok, _ := ValidatePasswordWithConfig("testpass1", cfg)
	if ok {
		t.Error("expected validation to fail for no uppercase")
	}
}

func TestValidatePassword_NoDigit(t *testing.T) {
	cfg := DefaultPasswordConfig()
	ok, _ := ValidatePasswordWithConfig("TestPass", cfg)
	if ok {
		t.Error("expected validation to fail for no digit")
	}
}

func TestValidatePassword_Valid(t *testing.T) {
	cfg := DefaultPasswordConfig()
	ok, msg := ValidatePasswordWithConfig("TestPass1", cfg)
	if !ok {
		t.Errorf("expected validation to pass, got: %s", msg)
	}
}

func TestValidatePassword_WithSpecialRequired(t *testing.T) {
	cfg := DefaultPasswordConfig()
	cfg.RequireSpecial = true
	ok, _ := ValidatePasswordWithConfig("TestPass1", cfg)
	if ok {
		t.Error("expected validation to fail without special char")
	}
	ok, _ = ValidatePasswordWithConfig("TestPass1!", cfg)
	if !ok {
		t.Error("expected validation to pass with special char")
	}
}

func TestValidatePassword_CustomConfig(t *testing.T) {
	cfg := &PasswordConfig{
		MinLength:        4,
		MaxLength:        20,
		RequireUppercase: false,
		RequireLowercase: false,
		RequireDigit:     false,
		RequireSpecial:   false,
		BcryptCost:       4,
	}
	ok, _ := ValidatePasswordWithConfig("abcd", cfg)
	if !ok {
		t.Error("expected validation to pass with relaxed config")
	}
}

func TestGenerateRandomPassword_Length(t *testing.T) {
	pw, err := GenerateRandomPassword(16)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pw) != 16 {
		t.Errorf("expected length 16, got %d", len(pw))
	}
}

func TestGenerateRandomPassword_Unique(t *testing.T) {
	pw1, _ := GenerateRandomPassword(16)
	pw2, _ := GenerateRandomPassword(16)
	if pw1 == pw2 {
		t.Error("expected two random passwords to differ")
	}
}

func TestGenerateAPIKey_Format(t *testing.T) {
	key, err := GenerateAPIKey()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(key) < 10 {
		t.Errorf("API key too short: %d chars", len(key))
	}
}

func TestIsPasswordBreached_CommonPasswords(t *testing.T) {
	common := []string{"password", "123456", "password123", "qwerty", "letmein"}
	for _, pw := range common {
		if !IsPasswordBreached(pw) {
			t.Errorf("expected %q to be detected as breached", pw)
		}
	}
}

func TestIsPasswordBreached_SafePassword(t *testing.T) {
	safe := []string{"X9k#mP2!vR7@", "MyUniqueP@ssw0rd", "c0mpl3x!Pass"}
	for _, pw := range safe {
		if IsPasswordBreached(pw) {
			t.Errorf("expected %q to NOT be detected as breached", pw)
		}
	}
}

// --- Rate limiter tests ---

func TestLocalRateLimiter_AllowsWithinLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rl := NewLocalRateLimiter(5, time.Minute)
	r := gin.New()
	r.Use(rl.Middleware())
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		r.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("request %d: expected 200, got %d", i+1, w.Code)
		}
	}
}

func TestLocalRateLimiter_BlocksOverLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rl := NewLocalRateLimiter(3, time.Minute)
	r := gin.New()
	r.Use(rl.Middleware())
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	// First 3 should pass
	for i := 0; i < 3; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		r.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("request %d: expected 200, got %d", i+1, w.Code)
		}
	}

	// 4th should be blocked
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)
	if w.Code != 429 {
		t.Errorf("expected 429, got %d", w.Code)
	}
}

func TestLocalRateLimiter_DifferentIPs(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rl := NewLocalRateLimiter(2, time.Minute)
	r := gin.New()
	r.Use(rl.Middleware())
	r.GET("/test", func(c *gin.Context) { c.String(200, "ok") })

	// IP 1: 2 requests
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		r.ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("IP1 request %d: expected 200, got %d", i+1, w.Code)
		}
	}

	// IP 2: should still pass
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "5.6.7.8:5678"
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Errorf("IP2: expected 200, got %d", w.Code)
	}
}

func TestDefaultRateLimiter_Limit300(t *testing.T) {
	rl := DefaultRateLimiter()
	if rl.limit != 300 {
		t.Errorf("expected limit=300, got %d", rl.limit)
	}
	if rl.window != time.Minute {
		t.Errorf("expected window=1m, got %v", rl.window)
	}
}

func TestStrictRateLimiter_Limit10(t *testing.T) {
	rl := StrictRateLimiter()
	if rl.limit != 10 {
		t.Errorf("expected limit=10, got %d", rl.limit)
	}
}

func TestAIRateLimiter_Limit20(t *testing.T) {
	rl := AIRateLimiter()
	if rl.limit != 20 {
		t.Errorf("expected limit=20, got %d", rl.limit)
	}
}
