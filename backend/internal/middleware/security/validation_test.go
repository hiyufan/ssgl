package security

import (
	"testing"
)

func TestValidatePasswordWithConfig_Strong(t *testing.T) {
	cfg := DefaultPasswordConfig()
	ok, msg := ValidatePasswordWithConfig("MyStr0ng!Pass", cfg)
	if !ok {
		t.Errorf("expected strong password to pass, got: %s", msg)
	}
}

func TestValidatePasswordWithConfig_TooShort(t *testing.T) {
	cfg := DefaultPasswordConfig()
	ok, _ := ValidatePasswordWithConfig("Sh0rt!", cfg)
	if ok {
		t.Error("expected short password to fail")
	}
}

func TestValidatePasswordWithConfig_NoDigit(t *testing.T) {
	cfg := DefaultPasswordConfig()
	ok, _ := ValidatePasswordWithConfig("NoDigitHere!", cfg)
	if ok {
		t.Error("expected password without digit to fail")
	}
}

func TestContainsSQLInjection_Safe(t *testing.T) {
	if containsSQLInjection("hello world") {
		t.Error("safe string flagged as SQL injection")
	}
}

func TestContainsSQLInjection_UnionSelect(t *testing.T) {
	if !containsSQLInjection("1 UNION SELECT * FROM users") {
		t.Error("UNION SELECT not detected")
	}
}

func TestContainsXSS_Safe(t *testing.T) {
	if containsXSS("normal text input") {
		t.Error("safe string flagged as XSS")
	}
}

func TestContainsXSS_ScriptTag(t *testing.T) {
	if !containsXSS("<script>alert('xss')</script>") {
		t.Error("script tag not detected")
	}
}

func TestSanitizeInput_NullBytes(t *testing.T) {
	got := SanitizeInput("hello\x00world")
	if got != "helloworld" {
		t.Errorf("expected 'helloworld', got %q", got)
	}
}

func TestValidateEmail_Valid(t *testing.T) {
	if !ValidateEmail("user@example.com") {
		t.Error("valid email rejected")
	}
}

func TestValidateEmail_Invalid(t *testing.T) {
	if ValidateEmail("not-an-email") {
		t.Error("invalid email accepted")
	}
}

func TestValidateUsername_Valid(t *testing.T) {
	if !ValidateUsername("test_user_123") {
		t.Error("valid username rejected")
	}
}

func TestValidateUsername_TooShort(t *testing.T) {
	if ValidateUsername("ab") {
		t.Error("short username accepted")
	}
}

func TestIsPasswordBreached_Common(t *testing.T) {
	if !IsPasswordBreached("password123") {
		t.Error("common password not detected as breached")
	}
}

func TestIsPasswordBreached_Strong(t *testing.T) {
	if IsPasswordBreached("X9kL#mP2!vR7@nQ") {
		t.Error("strong password incorrectly flagged as breached")
	}
}
