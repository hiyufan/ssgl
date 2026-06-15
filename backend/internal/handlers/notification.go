package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// NotificationHandler handles notification HTTP requests.
type NotificationHandler struct{}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{}
}

// List handles GET /notifications — returns notifications for the authenticated user.
func (h *NotificationHandler) List(c *gin.Context) {
	db := database.GetDB()
	userID, _ := c.Get("user_id")

	var notifications []models.Notification
	query := db.Where("user_id = ?", userID).Order("created_at DESC")

	// Optional filter: unread only
	if c.Query("unread") == "true" {
		query = query.Where("read_at IS NULL")
	}

	// Pagination
	page, pageSize := 1, 20
	if p := c.Query("page"); p != "" {
		if v, err := parseUint(p); err == nil && v > 0 {
			page = int(v)
		}
	}
	if ps := c.Query("page_size"); ps != "" {
		if v, err := parseUint(ps); err == nil && v > 0 && v <= 100 {
			pageSize = int(v)
		}
	}

	var total int64
	query.Model(&models.Notification{}).Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch notifications"})
		return
	}

	// Count unread
	var unreadCount int64
	db.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Count(&unreadCount)

	c.JSON(http.StatusOK, gin.H{
		"items":        notifications,
		"total":        total,
		"unread_count": unreadCount,
		"page":         page,
		"page_size":    pageSize,
	})
}

// Create handles POST /notifications — creates a notification (admin/system use).
func (h *NotificationHandler) Create(c *gin.Context) {
	db := database.GetDB()

	var input struct {
		UserID  uint   `json:"user_id" binding:"required"`
		Type    string `json:"type" binding:"required"`
		Title   string `json:"title" binding:"required"`
		Message string `json:"message"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	notif := models.Notification{
		UserID:  input.UserID,
		Type:    input.Type,
		Title:   input.Title,
		Message: input.Message,
	}

	if err := db.Create(&notif).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create notification"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"notification": notif})
}

// MarkRead handles POST /notifications/:id/read — marks a notification as read.
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	db := database.GetDB()
	userID, _ := c.Get("user_id")

	id := c.Param("id")
	var notif models.Notification
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&notif).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "notification not found"})
		return
	}

	now := time.Now()
	if err := db.Model(&notif).Update("read_at", now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "marked as read"})
}

// MarkAllRead handles POST /notifications/read-all — marks all user notifications as read.
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	db := database.GetDB()
	userID, _ := c.Get("user_id")

	now := time.Now()
	if err := db.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Update("read_at", now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark all as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "all notifications marked as read"})
}

// UnreadCount handles GET /notifications/unread-count — returns count of unread notifications.
func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	db := database.GetDB()
	userID, _ := c.Get("user_id")

	var count int64
	db.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Count(&count)

	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}

// parseUint is a helper to parse uint from string.
func parseUint(s string) (uint, error) {
	var v uint
	_, err := fmt.Sscanf(s, "%d", &v)
	return v, err
}
