package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestRequireRole_AllowedRole(t *testing.T) {
	router := gin.New()
	router.GET("/test", RequireRole("admin", "teacher"), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	// Set role in context via middleware
	router2 := gin.New()
	router2.GET("/test", func(c *gin.Context) {
		c.Set("role", "admin")
		c.Next()
	}, RequireRole("admin", "teacher"), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router2.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200 for allowed role, got %d", w.Code)
	}
}

func TestRequireRole_DeniedRole(t *testing.T) {
	router := gin.New()
	router.GET("/test", func(c *gin.Context) {
		c.Set("role", "student")
		c.Next()
	}, RequireRole("admin", "teacher"), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	if w.Code != 403 {
		t.Errorf("expected 403 for denied role, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["error"] != "insufficient permissions" {
		t.Errorf("expected 'insufficient permissions' error, got %v", resp["error"])
	}
}

func TestRequireRole_MissingRole(t *testing.T) {
	router := gin.New()
	router.GET("/test", RequireRole("admin"), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	if w.Code != 403 {
		t.Errorf("expected 403 for missing role, got %d", w.Code)
	}
}

func TestRequireRole_SingleRole(t *testing.T) {
	router := gin.New()
	router.GET("/test", func(c *gin.Context) {
		c.Set("role", "admin")
		c.Next()
	}, RequireRole("admin"), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200 for single allowed role, got %d", w.Code)
	}
}
