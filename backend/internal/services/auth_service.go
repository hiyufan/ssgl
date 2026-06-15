package services

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// TokenPair holds an access/refresh token pair and the access token TTL.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // seconds
}

// Token type values distinguish access tokens from refresh tokens so that one
// cannot be used in place of the other.
const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

// Claims is the JWT claims structure used for both access and refresh tokens.
type Claims struct {
	UserID    uint   `json:"user_id"`
	Role      string `json:"role"`
	TokenType string `json:"token_type"`
	jwt.RegisteredClaims
}

// AuthService provides authentication operations.
type AuthService struct {
	cfg *config.JWTConfig
}

// NewAuthService creates a new AuthService.
func NewAuthService(cfg *config.JWTConfig) *AuthService {
	return &AuthService{cfg: cfg}
}

// Register creates a new user after checking username and email uniqueness.
func (s *AuthService) Register(username, email, password, role, name string) (*models.User, error) {
	db := database.GetDB()
	if db == nil {
		return nil, errors.New("database not connected")
	}

	// Check username uniqueness.
	var count int64
	db.Model(&models.User{}).Where("username = ?", username).Count(&count)
	if count > 0 {
		return nil, errors.New("username already exists")
	}

	// Check email uniqueness.
	db.Model(&models.User{}).Where("email = ?", email).Count(&count)
	if count > 0 {
		return nil, errors.New("email already exists")
	}

	// Hash password.
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &models.User{
		Username: username,
		Email:    email,
		Password: string(hashed),
		Role:     role,
		Name:     name,
		Status:   models.StatusActive,
	}

	if err := db.Create(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

// Login verifies credentials and returns a token pair.
func (s *AuthService) Login(username, password string) (*TokenPair, *models.User, error) {
	db := database.GetDB()
	if db == nil {
		return nil, nil, errors.New("database not connected")
	}

	var user models.User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, errors.New("invalid username or password")
		}
		return nil, nil, err
	}

	if user.Status == models.StatusDisabled {
		return nil, nil, errors.New("account is disabled")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return nil, nil, errors.New("invalid username or password")
	}

	tokens, err := s.generateTokenPair(user.ID, user.Role)
	if err != nil {
		return nil, nil, err
	}

	return tokens, &user, nil
}

// RefreshToken parses a refresh token and issues a new token pair.
func (s *AuthService) RefreshToken(refreshToken string) (*TokenPair, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.Secret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}
	if claims.TokenType != TokenTypeRefresh {
		return nil, errors.New("invalid refresh token")
	}

	return s.generateTokenPair(claims.UserID, claims.Role)
}

// GetUserByID returns the user with the given ID.
func (s *AuthService) GetUserByID(id uint) (*models.User, error) {
	db := database.GetDB()
	if db == nil {
		return nil, errors.New("database not connected")
	}
	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// generateTokenPair creates a new access + refresh JWT token pair.
func (s *AuthService) generateTokenPair(userID uint, role string) (*TokenPair, error) {
	now := time.Now()
	accessExpiry := now.Add(s.cfg.Expiration)
	refreshExpiry := now.Add(7 * 24 * time.Hour) // 7 days

	accessClaims := &Claims{
		UserID:    userID,
		Role:      role,
		TokenType: TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(accessExpiry),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessSigned, err := accessToken.SignedString([]byte(s.cfg.Secret))
	if err != nil {
		return nil, errors.New("failed to sign access token")
	}

	refreshClaims := &Claims{
		UserID:    userID,
		Role:      role,
		TokenType: TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(refreshExpiry),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshSigned, err := refreshToken.SignedString([]byte(s.cfg.Secret))
	if err != nil {
		return nil, errors.New("failed to sign refresh token")
	}

	return &TokenPair{
		AccessToken:  accessSigned,
		RefreshToken: refreshSigned,
		ExpiresIn:    int64(s.cfg.Expiration.Seconds()),
	}, nil
}
