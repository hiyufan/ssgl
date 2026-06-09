package security

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// PasswordConfig holds password configuration
type PasswordConfig struct {
	MinLength        int
	MaxLength        int
	RequireUppercase bool
	RequireLowercase bool
	RequireDigit     bool
	RequireSpecial   bool
	BcryptCost       int
}

// DefaultPasswordConfig returns default password configuration
func DefaultPasswordConfig() *PasswordConfig {
	return &PasswordConfig{
		MinLength:        8,
		MaxLength:        128,
		RequireUppercase: true,
		RequireLowercase: true,
		RequireDigit:     true,
		RequireSpecial:   false,
		BcryptCost:       12,
	}
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string, cost int) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPassword checks if a password matches a hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ValidatePassword validates a password against the configuration
func ValidatePasswordWithConfig(password string, config *PasswordConfig) (bool, string) {
	if len(password) < config.MinLength {
		return false, "Password must be at least 8 characters long"
	}

	if len(password) > config.MaxLength {
		return false, "Password must be less than 128 characters"
	}

	var hasUpper, hasLower, hasDigit, hasSpecial bool

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if config.RequireUppercase && !hasUpper {
		return false, "Password must contain at least one uppercase letter"
	}

	if config.RequireLowercase && !hasLower {
		return false, "Password must contain at least one lowercase letter"
	}

	if config.RequireDigit && !hasDigit {
		return false, "Password must contain at least one digit"
	}

	if config.RequireSpecial && !hasSpecial {
		return false, "Password must contain at least one special character"
	}

	return true, ""
}

// GenerateRandomPassword generates a random password
func GenerateRandomPassword(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes)[:length], nil
}

// GenerateAPIKey generates a random API key
func GenerateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "sk-" + hex.EncodeToString(bytes), nil
}

// IsPasswordBreached checks if a password is in a list of common passwords
// This is a simplified version - in production, use HaveIBeenPwned API
func IsPasswordBreached(password string) bool {
	commonPasswords := []string{
		"password", "123456", "12345678", "qwerty", "abc123",
		"monkey", "1234567", "letmein", "trustno1", "dragon",
		"baseball", "iloveyou", "master", "sunshine", "ashley",
		"bailey", "shadow", "123123", "654321", "superman",
		"qazwsx", "michael", "football", "password1", "password123",
	}

	lower := strings.ToLower(password)
	for _, p := range commonPasswords {
		if lower == p {
			return true
		}
	}

	return false
}
