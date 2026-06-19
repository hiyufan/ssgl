package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNewTimelineHandler(t *testing.T) {
	h := NewTimelineHandler()
	if h == nil {
		t.Fatal("expected non-nil handler")
	}
}

func TestPlatformEvent_Fields(t *testing.T) {
	e := PlatformEvent{
		ID:          1,
		Type:        "competition",
		Title:       "Test Competition",
		Description: "A test event",
		Status:      "published",
	}
	if e.ID != 1 {
		t.Errorf("expected ID=1, got %d", e.ID)
	}
	if e.Type != "competition" {
		t.Errorf("expected type=competition, got %s", e.Type)
	}
	if e.Title != "Test Competition" {
		t.Errorf("expected title='Test Competition', got %s", e.Title)
	}
	if e.Status != "published" {
		t.Errorf("expected status=published, got %s", e.Status)
	}
}

func TestPlatformEvent_Types(t *testing.T) {
	validTypes := []string{"competition", "team", "preplan", "award", "milestone"}
	for _, vt := range validTypes {
		e := PlatformEvent{Type: vt}
		if e.Type != vt {
			t.Errorf("expected type=%s, got %s", vt, e.Type)
		}
	}
}

func TestPlatformTimelineResponse_Structure(t *testing.T) {
	resp := PlatformTimelineResponse{
		Events: []PlatformEvent{{ID: 1, Type: "team", Title: "Test"}},
		Total:  1,
		Types:  map[string]int{"team": 1},
	}
	if resp.Total != 1 {
		t.Errorf("expected total=1, got %d", resp.Total)
	}
	if resp.Types["team"] != 1 {
		t.Errorf("expected team count=1, got %d", resp.Types["team"])
	}
}

func TestPlatformTimelineResponse_JSON(t *testing.T) {
	resp := PlatformTimelineResponse{
		Events: []PlatformEvent{},
		Total:  0,
		Types:  map[string]int{},
	}
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}
	var out PlatformTimelineResponse
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
}

func TestPlatformTimelineResponse_EmptyEvents(t *testing.T) {
	resp := PlatformTimelineResponse{
		Events: []PlatformEvent{},
		Total:  0,
		Types:  map[string]int{},
	}
	data, _ := json.Marshal(resp)
	if string(data) != `{"events":[],"total":0,"types":{}}` {
		t.Errorf("unexpected JSON: %s", string(data))
	}
}

func TestTimelineHandler_List_NilDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/api/v1/timeline", nil)

	h := NewTimelineHandler()
	defer func() {
		recover() // expect panic from nil DB
	}()
	h.List(c)
}

func TestParseSimpleInt(t *testing.T) {
	tests := []struct {
		input string
		want  int
	}{
		{"50", 50},
		{"0", 0},
		{"200", 200},
		{"abc", 0},
		{"", 0},
		{"12x", 0},
		{"1", 1},
		{"999", 999},
	}
	for _, tt := range tests {
		got := parseSimpleInt(tt.input)
		if got != tt.want {
			t.Errorf("parseSimpleInt(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}
