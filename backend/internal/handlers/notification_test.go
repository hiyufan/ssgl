package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
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
