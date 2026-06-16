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

func TestSanitizeHTML_ScriptTag(t *testing.T) {
	input := "<script>alert('xss')</script>"
	got := SanitizeHTML(input)
	want := "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
	if got != want {
		t.Errorf("SanitizeHTML(%q) = %q, want %q", input, got, want)
	}
}

func TestSanitizeHTML_Ampersand(t *testing.T) {
	got := SanitizeHTML("A & B")
	if got != "A &amp; B" {
		t.Errorf("expected 'A &amp; B', got %q", got)
	}
}

func TestSanitizeHTML_SafeString(t *testing.T) {
	input := "Hello World 123"
	got := SanitizeHTML(input)
	if got != input {
		t.Errorf("SanitizeHTML(%q) = %q, want unchanged", input, got)
	}
}

func TestSanitizeHTML_DoubleQuotes(t *testing.T) {
	got := SanitizeHTML(`say "hello"`)
	want := "say &quot;hello&quot;"
	if got != want {
		t.Errorf("expected %q, got %q", want, got)
	}
}

func TestSanitizeValue_Map(t *testing.T) {
	input := map[string]interface{}{
		"title":       "<script>alert('xss')</script>",
		"description": "normal text",
		"count":       42,
	}
	result := sanitizeValue(input).(map[string]interface{})

	// XSS title should be sanitized
	if result["title"] == input["title"] {
		t.Error("XSS in title was not sanitized")
	}
	if result["title"] != "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;" {
		t.Errorf("sanitized title = %q", result["title"])
	}

	// Safe description should pass through
	if result["description"] != "normal text" {
		t.Errorf("safe description was changed to %q", result["description"])
	}

	// Non-string should pass through
	if result["count"] != 42 {
		t.Error("non-string value was modified")
	}
}

func TestSanitizeValue_NestedSlice(t *testing.T) {
	input := []interface{}{
		"<img onerror=alert(1)>",
		"safe text",
	}
	result := sanitizeValue(input).([]interface{})
	if result[0] == input[0] {
		t.Error("XSS in slice was not sanitized")
	}
	if result[1] != "safe text" {
		t.Error("safe text in slice was changed")
	}
}

func TestSanitizeValue_NestedMap(t *testing.T) {
	input := map[string]interface{}{
		"outer": map[string]interface{}{
			"inner": "<iframe src=evil></iframe>",
		},
	}
	result := sanitizeValue(input).(map[string]interface{})
	outer := result["outer"].(map[string]interface{})
	if outer["inner"] == "<iframe src=evil></iframe>" {
		t.Error("nested XSS was not sanitized")
	}
}

func TestValidateBodyField_XSS(t *testing.T) {
	body := map[string]interface{}{
		"title": "<script>alert(1)</script>",
	}
	err := ValidateBodyField(body, "title")
	if err == nil {
		t.Error("expected error for XSS in title")
	}
}

func TestValidateBodyField_Safe(t *testing.T) {
	body := map[string]interface{}{
		"title": "正常标题",
	}
	err := ValidateBodyField(body, "title")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestValidateBodyField_MissingField(t *testing.T) {
	body := map[string]interface{}{}
	err := ValidateBodyField(body, "title")
	if err != nil {
		t.Errorf("unexpected error for missing field: %v", err)
	}
}
