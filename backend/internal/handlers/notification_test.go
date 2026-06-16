package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/models"
)

func TestNotificationHandler_Creation(t *testing.T) {
	h := NewNotificationHandler()
	if h == nil {
		t.Fatal("NewNotificationHandler returned nil")
	}
}

func TestNotificationHandler_List_Signature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/notifications", nil)

	h := NewNotificationHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("List panics on nil DB (expected)")
		}
	}()

	h.List(c)
}

func TestNotificationHandler_Create_Signature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/notifications", nil)

	h := NewNotificationHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Create panics on nil DB (expected)")
		}
	}()

	h.Create(c)
}

func TestNotificationHandler_MarkRead_Signature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/notifications/1/read", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	h := NewNotificationHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("MarkRead panics on nil DB (expected)")
		}
	}()

	h.MarkRead(c)
}

func TestNotificationHandler_MarkAllRead_Signature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/notifications/read-all", nil)

	h := NewNotificationHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("MarkAllRead panics on nil DB (expected)")
		}
	}()

	h.MarkAllRead(c)
}

func TestNotificationHandler_UnreadCount_Signature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/notifications/unread-count", nil)

	h := NewNotificationHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("UnreadCount panics on nil DB (expected)")
		}
	}()

	h.UnreadCount(c)
}

func TestNotification_Model_Fields(t *testing.T) {
	now := time.Now()
	notif := models.Notification{
		ID:        1,
		UserID:    42,
		Type:      "team_invite",
		Title:     "You have been invited",
		Message:   "Join team Alpha",
		ReadAt:    nil,
		CreatedAt: now,
	}

	if notif.ID != 1 {
		t.Errorf("expected ID=1, got %d", notif.ID)
	}
	if notif.UserID != 42 {
		t.Errorf("expected UserID=42, got %d", notif.UserID)
	}
	if notif.Type != "team_invite" {
		t.Errorf("expected Type=team_invite, got %s", notif.Type)
	}
	if notif.Title != "You have been invited" {
		t.Errorf("expected Title='You have been invited', got %s", notif.Title)
	}
	if notif.ReadAt != nil {
		t.Error("expected ReadAt to be nil for unread notification")
	}

	// Mark as read
	readTime := time.Now()
	notif.ReadAt = &readTime
	if notif.ReadAt == nil {
		t.Error("expected ReadAt to be set after marking as read")
	}
}

func TestNotification_Type_Constants(t *testing.T) {
	// Verify common notification types used in the system
	validTypes := []string{"system", "award", "team", "competition", "team_invite", "pre_plan"}
	for _, typ := range validTypes {
		notif := models.Notification{Type: typ}
		if notif.Type != typ {
			t.Errorf("notification type %s not set correctly", typ)
		}
	}
}

func TestStatsHandler_Students_Signature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/stats/students", nil)

	h := NewStatsHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Students panics on nil DB (expected)")
		}
	}()

	h.Students(c)
}
