package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNewSubscriptionHandler(t *testing.T) {
	handler := NewSubscriptionHandler()
	if handler == nil {
		t.Error("NewSubscriptionHandler returned nil")
	}
}

func TestSubscriptionHandler_Subscribe_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()
	r.POST("/subscriptions/:comp_id", h.Subscribe)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/subscriptions/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Unsubscribe_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()
	r.DELETE("/subscriptions/:comp_id", h.Unsubscribe)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/subscriptions/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestSubscriptionHandler_List_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()
	r.GET("/subscriptions", h.List)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/subscriptions", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Check_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()
	r.GET("/subscriptions/:comp_id/check", h.Check)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/subscriptions/1/check", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Reminders_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()
	r.GET("/subscriptions/reminders", h.Reminders)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/subscriptions/reminders", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestSubscriptionHandler_UpdateSettings_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()
	r.PUT("/subscriptions/:comp_id", h.UpdateSettings)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/subscriptions/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Subscribe_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.POST("/subscriptions/:comp_id", h.Subscribe)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/subscriptions/abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Unsubscribe_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.DELETE("/subscriptions/:comp_id", h.Unsubscribe)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/subscriptions/abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Check_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.GET("/subscriptions/:comp_id/check", h.Check)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/subscriptions/abc/check", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Subscribe_ZeroID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.POST("/subscriptions/:comp_id", h.Subscribe)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/subscriptions/0", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero ID, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Subscribe_NegativeID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.POST("/subscriptions/:comp_id", h.Subscribe)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/subscriptions/-1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for negative ID, got %d", w.Code)
	}
}

func TestSubscriptionHandler_UpdateSettings_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.PUT("/subscriptions/:comp_id", h.UpdateSettings)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/subscriptions/abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Unsubscribe_ZeroID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.DELETE("/subscriptions/:comp_id", h.Unsubscribe)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/subscriptions/0", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero ID, got %d", w.Code)
	}
}

func TestSubscriptionHandler_Check_ZeroID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.GET("/subscriptions/:comp_id/check", h.Check)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/subscriptions/0/check", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero ID, got %d", w.Code)
	}
}

func TestSubscriptionHandler_RouteRegistration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewSubscriptionHandler()

	r.POST("/subscriptions/:comp_id", h.Subscribe)
	r.DELETE("/subscriptions/:comp_id", h.Unsubscribe)
	r.GET("/subscriptions", h.List)
	r.GET("/subscriptions/reminders", h.Reminders)
	r.GET("/subscriptions/:comp_id/check", h.Check)
	r.PUT("/subscriptions/:comp_id", h.UpdateSettings)

	routes := r.Routes()
	if len(routes) != 6 {
		t.Errorf("expected 6 routes, got %d", len(routes))
	}
}
