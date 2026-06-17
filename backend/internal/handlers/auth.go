package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/middleware/security"
	"github.com/ssgl/competition-platform/internal/services"
)

// AuthHandler handles authentication HTTP requests.
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// RegisterRequest is the payload for the register endpoint.
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=64"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6,max=128"`
	Role     string `json:"role" binding:"required,oneof=student teacher"`
	Name     string `json:"name" binding:"required,max=64"`
}

// LoginRequest is the payload for the login endpoint.
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// RefreshRequest is the payload for the token refresh endpoint.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// Register handles POST /auth/register.
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate password strength
	config := security.DefaultPasswordConfig()
	valid, msg := security.ValidatePasswordWithConfig(req.Password, config)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	// Check if password is commonly breached
	if security.IsPasswordBreached(req.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This password is too common. Please choose a stronger password."})
		return
	}

	user, err := h.authService.Register(req.Username, req.Email, req.Password, req.Role, req.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": user})
}

// Login handles POST /auth/login.
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, user, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tokens": tokens,
		"user":   user,
	})
}

// Refresh handles POST /auth/refresh.
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tokens": tokens})
}

// ChangePasswordRequest is the payload for the change-password endpoint.
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=128"`
}

// ChangePassword handles PUT /auth/password — change the current user's password.
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	uid, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user id in context"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate password strength
	config := security.DefaultPasswordConfig()
	valid, msg := security.ValidatePasswordWithConfig(req.NewPassword, config)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	if security.IsPasswordBreached(req.NewPassword) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This password is too common. Please choose a stronger password."})
		return
	}

	if req.OldPassword == req.NewPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "new password must be different from current password"})
		return
	}

	if err := h.authService.ChangePassword(uid, req.OldPassword, req.NewPassword); err != nil {
		if err.Error() == "current password is incorrect" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password changed successfully"})
}

// GetMe handles GET /auth/me and returns the currently authenticated user.
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	uid, ok := userID.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user id in context"})
		return
	}

	user, err := h.authService.GetUserByID(uid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

