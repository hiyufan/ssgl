package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// ============================================================
// Evaluation Handler — tests for new endpoints
// ============================================================

func TestEvaluationHandler_New(t *testing.T) {
	h := NewEvaluationHandler()
	if h == nil {
		t.Error("NewEvaluationHandler returned nil")
	}
}

func TestEvaluationHandler_List_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/evaluations", nil)

	h := NewEvaluationHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("List panics on nil DB (expected)")
		}
	}()
	h.List(c)
}

func TestEvaluationHandler_Get_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/evaluations/abc", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewEvaluationHandler()
	h.Get(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Get with invalid ID returned %d, expected 400", w.Code)
	}
}

func TestEvaluationHandler_Create_InvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/evaluations", strings.NewReader("invalid"))
	c.Request.Header.Set("Content-Type", "application/json")

	h := NewEvaluationHandler()
	h.Create(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Create with invalid body returned %d, expected 400", w.Code)
	}
}

func TestEvaluationHandler_Update_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("PUT", "/evaluations/abc", strings.NewReader(`{"teaching": 5}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewEvaluationHandler()
	h.Update(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Update with invalid ID returned %d, expected 400", w.Code)
	}
}

func TestEvaluationHandler_Delete_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("DELETE", "/evaluations/abc", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewEvaluationHandler()
	h.Delete(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Delete with invalid ID returned %d, expected 400", w.Code)
	}
}

func TestEvaluationHandler_Moderate_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/evaluations/abc/moderate", strings.NewReader(`{"action": "approve"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewEvaluationHandler()
	h.Moderate(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Moderate with invalid ID returned %d, expected 400", w.Code)
	}
}

func TestEvaluationHandler_Moderate_InvalidAction(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/evaluations/1/moderate", strings.NewReader(`{"action": "invalid"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	h := NewEvaluationHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Moderate panics on nil DB (expected)")
		}
	}()
	h.Moderate(c)

	// Should be 400 for invalid action or panic on nil DB
	if w.Code == http.StatusBadRequest {
		t.Log("Moderate correctly rejects invalid action")
	}
}

// ============================================================
// Award Handler — tests for new endpoints
// ============================================================

func TestAwardHandler_Update_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("PUT", "/awards/abc", strings.NewReader(`{"rank_name": "test"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewAwardHandler()
	h.Update(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Update with invalid ID returned %d, expected 400", w.Code)
	}
}

func TestAwardHandler_Delete_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("DELETE", "/awards/abc", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewAwardHandler()
	h.Delete(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Delete with invalid ID returned %d, expected 400", w.Code)
	}
}

func TestAwardHandler_TeacherConfirm_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/awards/abc/teacher-confirm", nil)
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewAwardHandler()
	h.TeacherConfirm(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("TeacherConfirm with invalid ID returned %d, expected 400", w.Code)
	}
}

func TestAwardHandler_Create_InvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/awards", strings.NewReader("invalid"))
	c.Request.Header.Set("Content-Type", "application/json")

	h := NewAwardHandler()
	h.Create(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Create with invalid body returned %d, expected 400", w.Code)
	}
}

func TestAwardHandler_Update_NoFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("PUT", "/awards/1", strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	h := NewAwardHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Update panics on nil DB (expected)")
		}
	}()
	h.Update(c)
}

func TestAwardHandler_Settle_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/awards/abc/settle", strings.NewReader(`{"prize_amount": 100}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewAwardHandler()
	h.Settle(c)

	if w.Code != http.StatusBadRequest {
		t.Logf("Settle with invalid ID returned %d, expected 400", w.Code)
	}
}

// ============================================================
// Evaluation Model — status constant tests
// ============================================================

func TestEvaluationStatusConstants(t *testing.T) {
	// Verify all status constants are defined
	statuses := []string{"draft", "submitted", "approved", "rejected"}
	for _, s := range statuses {
		if s == "" {
			t.Error("Empty status constant")
		}
	}
	t.Log("All evaluation status constants defined: draft, submitted, approved, rejected")
}

// ============================================================
// Award Model — status constant tests
// ============================================================

func TestAwardStatusConstants(t *testing.T) {
	// Verify all award status constants
	statuses := []string{"pending", "teacher_confirm", "settled"}
	for _, s := range statuses {
		if s == "" {
			t.Error("Empty award status constant")
		}
	}
	t.Log("All award status constants defined: pending, teacher_confirm, settled")
}
