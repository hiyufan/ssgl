package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNewCompetitionNoteHandler(t *testing.T) {
	handler := NewCompetitionNoteHandler()
	if handler == nil {
		t.Error("NewCompetitionNoteHandler returned nil")
	}
}

func TestCompetitionNoteHandler_ListByCompetition_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()
	r.GET("/competitions/:id/notes", h.ListByCompetition)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/competitions/1/notes", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_ListMyNotes_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()
	r.GET("/notes", h.ListMyNotes)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/notes", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Create_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()
	r.POST("/competitions/:id/notes", h.Create)

	body, _ := json.Marshal(map[string]string{"title": "test", "content": "test content"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/competitions/1/notes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Create_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.POST("/competitions/:id/notes", h.Create)

	body, _ := json.Marshal(map[string]string{"title": "test", "content": "test content"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/competitions/abc/notes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Create_NoContentType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.POST("/competitions/:id/notes", h.Create)

	// Invalid competition ID → 400 before any DB call
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/competitions/0/notes", bytes.NewReader([]byte("{}")))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero ID, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Update_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()
	r.PUT("/notes/:id", h.Update)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/notes/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Delete_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()
	r.DELETE("/notes/:id", h.Delete)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/notes/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Get_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()
	r.GET("/notes/:id", h.Get)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/notes/1", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without auth, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Get_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.GET("/notes/:id", h.Get)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/notes/abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Delete_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.DELETE("/notes/:id", h.Delete)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/notes/abc", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_Update_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.PUT("/notes/:id", h.Update)

	body, _ := json.Marshal(map[string]string{"title": "updated"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/notes/abc", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}

func TestCompetitionNoteHandler_ListByCompetition_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewCompetitionNoteHandler()

	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	r.GET("/competitions/:id/notes", h.ListByCompetition)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/competitions/abc/notes", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid ID, got %d", w.Code)
	}
}
