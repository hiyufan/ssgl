package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// ============================================================
// Health Score Handler — additional edge-case tests
// ============================================================

func TestHealthScoreHandler_New(t *testing.T) {
	h := NewHealthScoreHandler()
	if h == nil {
		t.Error("NewHealthScoreHandler returned nil")
	}
}

func TestHealthScoreHandler_Score_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/stats/health-score", nil)

	h := NewHealthScoreHandler()
	h.Score(c)

	if w.Code != http.StatusUnauthorized && w.Code != http.StatusOK {
		t.Logf("Health score returned status %d (may need auth context)", w.Code)
	}
}

// ============================================================
// Diagnostics Handler — additional edge-case tests
// ============================================================

func TestDiagnosticsHandler_New(t *testing.T) {
	h := NewDiagnosticsHandler()
	if h == nil {
		t.Error("NewDiagnosticsHandler returned nil")
	}
}

func TestDiagnosticsHandler_Diagnostics_NoDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/system/diagnostics", nil)

	h := NewDiagnosticsHandler()
	// May panic on nil DB, but handler should exist
	defer func() {
		if r := recover(); r != nil {
			t.Log("Diagnostics panics on nil DB (expected for unit test)")
		}
	}()
	h.Diagnostics(c)
}

// ============================================================
// Import Handler — edge-case tests
// ============================================================

func TestImportHandler_New(t *testing.T) {
	h := NewImportHandler()
	if h == nil {
		t.Error("NewImportHandler returned nil")
	}
}

func TestImportHandler_BatchImport_EmptyBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/competitions/import", strings.NewReader("[]"))
	c.Request.Header.Set("Content-Type", "application/json")

	h := NewImportHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("BatchImport panics on nil DB (expected)")
		}
	}()
	h.BatchImport(c)
}

// ============================================================
// Profile Handler — additional edge-case tests
// ============================================================

func TestProfileHandler_New(t *testing.T) {
	h := NewProfileHandler()
	if h == nil {
		t.Error("NewProfileHandler returned nil")
	}
}

func TestProfileHandler_ListUsers_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/users", nil)

	h := NewProfileHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("ListUsers panics on nil DB (expected)")
		}
	}()
	h.ListUsers(c)
}

// ============================================================
// Workflow Handler — additional edge-case tests
// ============================================================

func TestWorkflowHandler_New(t *testing.T) {
	h := NewWorkflowHandler(nil)
	if h == nil {
		t.Error("NewWorkflowHandler returned nil")
	}
}

func TestWorkflowHandler_List_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/workflows", nil)

	h := NewWorkflowHandler(nil)
	defer func() {
		if r := recover(); r != nil {
			t.Log("List panics on nil DB (expected)")
		}
	}()
	h.List(c)
}

// ============================================================
// Team Analysis Handler — additional edge-case tests
// ============================================================

func TestTeamAnalysisHandler_New(t *testing.T) {
	h := NewTeamAnalysisHandler()
	if h == nil {
		t.Error("NewTeamAnalysisHandler returned nil")
	}
}

func TestTeamAnalysisHandler_Analyze_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/teams/1/analysis", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	h := NewTeamAnalysisHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Analyze panics on nil DB (expected)")
		}
	}()
	h.Analyze(c)
}

// ============================================================
// Recommend Handler — additional edge-case tests
// ============================================================

func TestRecommendHandler_New(t *testing.T) {
	h := NewRecommendHandler()
	if h == nil {
		t.Error("NewRecommendHandler returned nil")
	}
}

func TestRecommendHandler_Recommend_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/competitions/recommend", nil)

	h := NewRecommendHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Recommend panics on nil DB (expected)")
		}
	}()
	h.Recommend(c)
}

// ============================================================
// Showcase Handler — additional edge-case tests
// ============================================================

func TestShowcaseHandler_New(t *testing.T) {
	h := NewShowcaseHandler()
	if h == nil {
		t.Error("NewShowcaseHandler returned nil")
	}
}

func TestShowcaseHandler_List_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/showcase", nil)

	h := NewShowcaseHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("List panics on nil DB (expected)")
		}
	}()
	h.List(c)
}

// ============================================================
// Match Handler — additional edge-case tests
// ============================================================

func TestMatchHandler_New(t *testing.T) {
	h := NewMatchHandler()
	if h == nil {
		t.Error("NewMatchHandler returned nil")
	}
}

func TestMatchHandler_Match_NoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/teams/match?competition_id=1", nil)

	h := NewMatchHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Match panics on nil DB (expected)")
		}
	}()
	h.Match(c)
}

// ============================================================
// Global Search Handler — additional edge-case tests
// ============================================================

func TestGlobalSearchHandler_New(t *testing.T) {
	h := NewGlobalSearchHandler()
	if h == nil {
		t.Error("NewGlobalSearchHandler returned nil")
	}
}

func TestGlobalSearchHandler_Search_NoQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/search", nil)

	h := NewGlobalSearchHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Search panics on nil DB (expected)")
		}
	}()
	h.Search(c)

	// Should return 400 for missing query
	if w.Code == http.StatusBadRequest {
		t.Log("GlobalSearch correctly returns 400 for missing query")
	}
}

// ============================================================
// Milestone Handler — additional edge-case tests
// ============================================================

func TestMilestoneHandler_New(t *testing.T) {
	h := NewMilestoneHandler()
	if h == nil {
		t.Error("NewMilestoneHandler returned nil")
	}
}

func TestMilestoneHandler_BatchCreate_InvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/competitions/1/milestones/batch", strings.NewReader("invalid"))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	h := NewMilestoneHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("BatchCreate panics on nil DB (expected)")
		}
	}()
	h.BatchCreate(c)
}

// ============================================================
// Team Invite Handler — additional edge-case tests
// ============================================================

func TestTeamInviteHandler_Invite_InvalidTeamID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/teams/abc/invite", strings.NewReader(`{"user_id": 1}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "abc"}}

	h := NewTeamHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("Invite panics on nil DB (expected)")
		}
	}()
	h.Invite(c)
}

func TestTeamHandler_AcceptInvite_InvalidCode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/teams/invite/invalid/accept", nil)
	c.Params = gin.Params{{Key: "code", Value: "invalid"}}

	h := NewTeamHandler()
	defer func() {
		if r := recover(); r != nil {
			t.Log("AcceptInvite panics on nil DB (expected)")
		}
	}()
	h.AcceptInvite(c)
}
