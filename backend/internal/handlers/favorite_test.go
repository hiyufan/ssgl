package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNewFavoriteHandler(t *testing.T) {
	handler := NewFavoriteHandler()
	if handler == nil {
		t.Error("NewFavoriteHandler returned nil")
	}
}

func TestFavoriteHandler_List_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewFavoriteHandler()
	r.GET("/favorites", h.List)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/favorites", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestFavoriteHandler_Toggle_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewFavoriteHandler()
	r.POST("/favorites/:comp_id", h.Toggle)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/favorites/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestFavoriteHandler_Check_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewFavoriteHandler()
	r.GET("/favorites/:comp_id/check", h.Check)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/favorites/1/check", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestFavoriteHandler_Toggle_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewFavoriteHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.POST("/favorites/:comp_id", h.Toggle)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/favorites/abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestFavoriteHandler_Check_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewFavoriteHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.GET("/favorites/:comp_id/check", h.Check)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/favorites/abc/check", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}
