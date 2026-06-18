package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// SubscriptionHandler handles competition subscription HTTP requests.
type SubscriptionHandler struct{}

// NewSubscriptionHandler creates a new SubscriptionHandler.
func NewSubscriptionHandler() *SubscriptionHandler {
	return &SubscriptionHandler{}
}

// Subscribe handles POST /subscriptions/:comp_id — subscribes the current user to a competition.
func (h *SubscriptionHandler) Subscribe(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	compID, err := strconv.ParseUint(c.Param("comp_id"), 10, 64)
	if err != nil || compID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事 ID"})
		return
	}

	// Verify competition exists.
	var comp models.Competition
	if err := db.First(&comp, compID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "赛事不存在"})
		return
	}

	// Check if already subscribed.
	var existing models.CompetitionSubscription
	result := db.Where("user_id = ? AND competition_id = ?", userID, compID).First(&existing)
	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "已订阅该赛事", "subscription": existing})
		return
	}

	// Parse optional remind_days_before from body.
	remindDays := 3
	var body struct {
		RemindDaysBefore *int `json:"remind_days_before"`
	}
	if err := c.ShouldBindJSON(&body); err == nil && body.RemindDaysBefore != nil {
		if *body.RemindDaysBefore >= 1 && *body.RemindDaysBefore <= 30 {
			remindDays = *body.RemindDaysBefore
		}
	}

	sub := models.CompetitionSubscription{
		UserID:           userID,
		CompetitionID:    uint(compID),
		RemindDaysBefore: remindDays,
	}
	if err := db.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "订阅失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "订阅成功",
		"subscription": sub,
	})
}

// Unsubscribe handles DELETE /subscriptions/:comp_id — removes the subscription.
func (h *SubscriptionHandler) Unsubscribe(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	compID, err := strconv.ParseUint(c.Param("comp_id"), 10, 64)
	if err != nil || compID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事 ID"})
		return
	}

	result := db.Where("user_id = ? AND competition_id = ?", userID, compID).
		Delete(&models.CompetitionSubscription{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "未订阅该赛事"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已取消订阅"})
}

// List handles GET /subscriptions — returns the current user's subscriptions.
func (h *SubscriptionHandler) List(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	db.Model(&models.CompetitionSubscription{}).Where("user_id = ?", userID).Count(&total)

	var subs []models.CompetitionSubscription
	db.Preload("Competition").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&subs)

	c.JSON(http.StatusOK, gin.H{
		"items":     subs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Check handles GET /subscriptions/:comp_id/check — checks subscription status.
func (h *SubscriptionHandler) Check(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	compID, err := strconv.ParseUint(c.Param("comp_id"), 10, 64)
	if err != nil || compID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事 ID"})
		return
	}

	var sub models.CompetitionSubscription
	result := db.Where("user_id = ? AND competition_id = ?", userID, compID).First(&sub)

	c.JSON(http.StatusOK, gin.H{
		"subscribed": result.Error == nil,
	})
}

// Reminders handles GET /subscriptions/reminders — returns upcoming deadline reminders.
func (h *SubscriptionHandler) Reminders(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	now := time.Now()

	// Find subscriptions where the competition registration deadline is within remind_days_before.
	var subs []models.CompetitionSubscription
	db.Preload("Competition").
		Where("user_id = ?", userID).
		Find(&subs)

	type Reminder struct {
		Subscription models.CompetitionSubscription `json:"subscription"`
		Competition  models.Competition             `json:"competition"`
		DaysLeft     int                            `json:"days_left"`
		DeadlineType string                         `json:"deadline_type"`
	}

	var reminders []Reminder
	for _, sub := range subs {
		comp := sub.Competition
		if comp.ID == 0 {
			continue
		}

		// Registration deadline reminder.
		if !comp.RegistrationDeadline.IsZero() && comp.RegistrationDeadline.After(now) {
			daysLeft := int(comp.RegistrationDeadline.Sub(now).Hours() / 24)
			if daysLeft <= sub.RemindDaysBefore {
				reminders = append(reminders, Reminder{
					Subscription: sub,
					Competition:  comp,
					DaysLeft:     daysLeft,
					DeadlineType: "registration",
				})
			}
		}

		// Start date reminder.
		if !comp.StartDate.IsZero() && comp.StartDate.After(now) {
			daysLeft := int(comp.StartDate.Sub(now).Hours() / 24)
			if daysLeft <= sub.RemindDaysBefore {
				reminders = append(reminders, Reminder{
					Subscription: sub,
					Competition:  comp,
					DaysLeft:     daysLeft,
					DeadlineType: "start",
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"reminders": reminders,
		"total":     len(reminders),
	})
}

// UpdateSettings handles PUT /subscriptions/:comp_id — updates reminder settings.
func (h *SubscriptionHandler) UpdateSettings(c *gin.Context) {
	db := database.GetDB()

	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	compID, err := strconv.ParseUint(c.Param("comp_id"), 10, 64)
	if err != nil || compID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的赛事 ID"})
		return
	}

	var sub models.CompetitionSubscription
	if err := db.Where("user_id = ? AND competition_id = ?", userID, compID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "未订阅该赛事"})
		return
	}

	var body struct {
		RemindDaysBefore *int `json:"remind_days_before"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效请求"})
		return
	}

	if body.RemindDaysBefore != nil {
		if *body.RemindDaysBefore >= 1 && *body.RemindDaysBefore <= 30 {
			sub.RemindDaysBefore = *body.RemindDaysBefore
		}
	}

	db.Save(&sub)

	c.JSON(http.StatusOK, gin.H{
		"message":      "设置已更新",
		"subscription": sub,
	})
}
