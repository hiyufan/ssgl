package security

import (
	"testing"
	"time"
)

// --- AIAuthServiceConfig tests ---

func TestAIAuthServiceConfig_Fields(t *testing.T) {
	cfg := AIAuthServiceConfig{
		APIKey:     "test-api-key-12345",
		SigningKey: "test-signing-key-67890",
		Expiry:     5 * time.Minute,
	}

	if cfg.APIKey != "test-api-key-12345" {
		t.Errorf("expected APIKey 'test-api-key-12345', got '%s'", cfg.APIKey)
	}
	if cfg.SigningKey != "test-signing-key-67890" {
		t.Errorf("expected SigningKey 'test-signing-key-67890', got '%s'", cfg.SigningKey)
	}
	if cfg.Expiry != 5*time.Minute {
		t.Errorf("expected Expiry 5m, got %v", cfg.Expiry)
	}
}

func TestAIAuthServiceConfig_ZeroValue(t *testing.T) {
	cfg := AIAuthServiceConfig{}
	if cfg.APIKey != "" {
		t.Errorf("expected empty APIKey, got '%s'", cfg.APIKey)
	}
	if cfg.SigningKey != "" {
		t.Errorf("expected empty SigningKey, got '%s'", cfg.SigningKey)
	}
	if cfg.Expiry != 0 {
		t.Errorf("expected zero Expiry, got %v", cfg.Expiry)
	}
}

// --- GenerateAIRequestSignature tests ---

func TestGenerateAIRequestSignature_Deterministic(t *testing.T) {
	sig1 := GenerateAIRequestSignature("key123", "/api/v1/test", "2024-01-01T00:00:00Z")
	sig2 := GenerateAIRequestSignature("key123", "/api/v1/test", "2024-01-01T00:00:00Z")
	if sig1 != sig2 {
		t.Errorf("expected deterministic signature, got %s and %s", sig1, sig2)
	}
}

func TestGenerateAIRequestSignature_DifferentKeys(t *testing.T) {
	sig1 := GenerateAIRequestSignature("key1", "/api/v1/test", "2024-01-01T00:00:00Z")
	sig2 := GenerateAIRequestSignature("key2", "/api/v1/test", "2024-01-01T00:00:00Z")
	if sig1 == sig2 {
		t.Error("expected different signatures for different keys")
	}
}

func TestGenerateAIRequestSignature_DifferentPaths(t *testing.T) {
	sig1 := GenerateAIRequestSignature("key", "/api/v1/test1", "2024-01-01T00:00:00Z")
	sig2 := GenerateAIRequestSignature("key", "/api/v1/test2", "2024-01-01T00:00:00Z")
	if sig1 == sig2 {
		t.Error("expected different signatures for different paths")
	}
}

func TestGenerateAIRequestSignature_DifferentTimestamps(t *testing.T) {
	sig1 := GenerateAIRequestSignature("key", "/api/v1/test", "2024-01-01T00:00:00Z")
	sig2 := GenerateAIRequestSignature("key", "/api/v1/test", "2024-01-02T00:00:00Z")
	if sig1 == sig2 {
		t.Error("expected different signatures for different timestamps")
	}
}

func TestGenerateAIRequestSignature_NonEmpty(t *testing.T) {
	sig := GenerateAIRequestSignature("key", "/path", "2024-01-01T00:00:00Z")
	if sig == "" {
		t.Error("expected non-empty signature")
	}
}

// --- AIRequestHeaders tests ---

func TestAIRequestHeaders_ContainsAllKeys(t *testing.T) {
	headers := AIRequestHeaders("api-key", "signing-key", "/api/v1/test")

	requiredKeys := []string{"X-API-Key", "X-Timestamp", "X-Signature", "Content-Type"}
	for _, key := range requiredKeys {
		if _, ok := headers[key]; !ok {
			t.Errorf("expected header key '%s' to be present", key)
		}
	}
}

func TestAIRequestHeaders_SetsAPIKey(t *testing.T) {
	headers := AIRequestHeaders("my-api-key", "signing-key", "/api/v1/test")
	if headers["X-API-Key"] != "my-api-key" {
		t.Errorf("expected X-API-Key 'my-api-key', got '%s'", headers["X-API-Key"])
	}
}

func TestAIRequestHeaders_SetsContentType(t *testing.T) {
	headers := AIRequestHeaders("api-key", "signing-key", "/api/v1/test")
	if headers["Content-Type"] != "application/json" {
		t.Errorf("expected Content-Type 'application/json', got '%s'", headers["Content-Type"])
	}
}

func TestAIRequestHeaders_TimestampIsValidRFC3339(t *testing.T) {
	headers := AIRequestHeaders("api-key", "signing-key", "/api/v1/test")
	ts := headers["X-Timestamp"]
	_, err := time.Parse(time.RFC3339, ts)
	if err != nil {
		t.Errorf("expected valid RFC3339 timestamp, got error: %v", err)
	}
}

func TestAIRequestHeaders_SignatureMatchesExpected(t *testing.T) {
	key := "signing-key"
	path := "/api/v1/test"
	headers := AIRequestHeaders("api-key", key, path)

	ts := headers["X-Timestamp"]
	expected := GenerateAIRequestSignature(key, path, ts)
	if headers["X-Signature"] != expected {
		t.Errorf("expected signature '%s', got '%s'", expected, headers["X-Signature"])
	}
}
