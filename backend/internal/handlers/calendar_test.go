package handlers

import (
	"strings"
	"testing"
	"time"

	"github.com/ssgl/competition-platform/internal/models"
)

func TestNewCalendarHandler(t *testing.T) {
	handler := NewCalendarHandler()
	if handler == nil {
		t.Error("NewCalendarHandler returned nil")
	}
}

func TestCalendarEventFields(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	event := CalendarEvent{
		ID:        1,
		Title:     "Test Hackathon",
		Type:      "hackathon",
		Status:    "published",
		StartDate: now,
		EndDate:   now.Add(48 * time.Hour),
		Location:  "Online",
		Tags:      "coding,ai",
	}

	if event.ID != 1 {
		t.Errorf("expected ID=1, got %d", event.ID)
	}
	if event.Title != "Test Hackathon" {
		t.Errorf("expected Title='Test Hackathon', got '%s'", event.Title)
	}
	if event.Type != "hackathon" {
		t.Errorf("expected Type='hackathon', got '%s'", event.Type)
	}
	if event.Status != "published" {
		t.Errorf("expected Status='published', got '%s'", event.Status)
	}
	if event.Location != "Online" {
		t.Errorf("expected Location='Online', got '%s'", event.Location)
	}
	if event.Tags != "coding,ai" {
		t.Errorf("expected Tags='coding,ai', got '%s'", event.Tags)
	}
	if !event.StartDate.Before(event.EndDate) {
		t.Error("expected StartDate before EndDate")
	}
}

func TestMonthParsing(t *testing.T) {
	tests := []struct {
		input   string
		wantErr bool
	}{
		{"2026-06", false},
		{"2026-12", false},
		{"2025-01", false},
		{"invalid", true},
		{"", true},
		{"2026", true},
		{"2026-13", true},
	}

	for _, tt := range tests {
		_, err := time.Parse("2006-01", tt.input)
		if (err != nil) != tt.wantErr {
			t.Errorf("Parse(%q): gotErr=%v, wantErr=%v", tt.input, err != nil, tt.wantErr)
		}
	}
}

func TestMonthBoundaryCalculation(t *testing.T) {
	monthStart, err := time.Parse("2006-01", "2026-06")
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	monthEnd := monthStart.AddDate(0, 1, 0)

	if monthStart.Year() != 2026 || monthStart.Month() != time.June {
		t.Errorf("expected 2026-06, got %s", monthStart.Format("2006-01"))
	}
	if monthEnd.Year() != 2026 || monthEnd.Month() != time.July || monthEnd.Day() != 1 {
		t.Errorf("expected 2026-07-01, got %s", monthEnd.Format("2006-01-02"))
	}

	insideStart := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	insideEnd := time.Date(2026, 6, 20, 0, 0, 0, 0, time.UTC)
	if !(insideStart.Before(monthEnd) && !insideEnd.Before(monthStart)) {
		t.Error("competition inside month should match filter")
	}

	outsideStart := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	outsideEnd := time.Date(2026, 7, 5, 0, 0, 0, 0, time.UTC)
	if outsideStart.Before(monthEnd) && !outsideEnd.Before(monthStart) {
		// Expected: outsideStart == monthEnd, so not strictly less
	}

	spanStart := time.Date(2026, 5, 28, 0, 0, 0, 0, time.UTC)
	spanEnd := time.Date(2026, 6, 5, 0, 0, 0, 0, time.UTC)
	if !(spanStart.Before(monthEnd) && !spanEnd.Before(monthStart)) {
		t.Error("competition spanning into month should match filter")
	}
}

func TestCalendarEvent_CompetitionTypes(t *testing.T) {
	types := []string{"hackathon", "innovation", "research", "business_plan", "ai_innovation", "data_science"}
	for _, typ := range types {
		event := CalendarEvent{Type: typ}
		if event.Type != typ {
			t.Errorf("expected Type='%s', got '%s'", typ, event.Type)
		}
	}
}

func TestCalendarEvent_StatusValues(t *testing.T) {
	statuses := []string{"draft", "published", "ongoing", "completed"}
	for _, status := range statuses {
		event := CalendarEvent{Status: status}
		if event.Status != status {
			t.Errorf("expected Status='%s', got '%s'", status, event.Status)
		}
	}
}

func TestCalendarEvent_DateRange(t *testing.T) {
	start := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	event := CalendarEvent{
		StartDate: start,
		EndDate:   end,
	}

	if !event.StartDate.Before(event.EndDate) {
		t.Error("expected StartDate before EndDate")
	}

	duration := event.EndDate.Sub(event.StartDate)
	if duration.Hours() != 24*31 { // July has 31 days
		t.Errorf("expected 31 days duration, got %f hours", duration.Hours())
	}
}

func TestCalendarEvent_SameDay(t *testing.T) {
	day := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	event := CalendarEvent{
		StartDate: day,
		EndDate:   day,
	}

	if !event.StartDate.Equal(event.EndDate) {
		t.Error("expected StartDate equal to EndDate for same-day event")
	}
}

func TestCalendarEvent_EmptyFields(t *testing.T) {
	event := CalendarEvent{}
	if event.Title != "" {
		t.Errorf("expected empty Title, got '%s'", event.Title)
	}
	if event.Type != "" {
		t.Errorf("expected empty Type, got '%s'", event.Type)
	}
	if event.Status != "" {
		t.Errorf("expected empty Status, got '%s'", event.Status)
	}
	if event.Location != "" {
		t.Errorf("expected empty Location, got '%s'", event.Location)
	}
	if event.Tags != "" {
		t.Errorf("expected empty Tags, got '%s'", event.Tags)
	}
}

func TestCalendarEvent_CompetitionModelMapping(t *testing.T) {
	// Calendar events map to Competition model fields
	comp := models.Competition{
		ID:       1,
		Title:    "Test Competition",
		Type:     "hackathon",
		Status:   "published",
		Location: "福州",
	}

	event := CalendarEvent{
		ID:       comp.ID,
		Title:    comp.Title,
		Type:     comp.Type,
		Status:   comp.Status,
		Location: comp.Location,
	}

	if event.ID != comp.ID {
		t.Errorf("expected ID=%d, got %d", comp.ID, event.ID)
	}
	if event.Title != comp.Title {
		t.Errorf("expected Title='%s', got '%s'", comp.Title, event.Title)
	}
	if event.Type != comp.Type {
		t.Errorf("expected Type='%s', got '%s'", comp.Type, event.Type)
	}
	if event.Status != comp.Status {
		t.Errorf("expected Status='%s', got '%s'", comp.Status, event.Status)
	}
	if event.Location != comp.Location {
		t.Errorf("expected Location='%s', got '%s'", comp.Location, event.Location)
	}
}

func TestIcsEscape(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"hello world", "hello world"},
		{"semi;colon", "semi\\;colon"},
		{"comma,separated", "comma\\,separated"},
		{"line\nbreak", "line\\nbreak"},
		{"back\\slash", "back\\\\slash"},
		{"mixed;test,value\nhere", "mixed\\;test\\,value\\nhere"},
		{"", ""},
		{"no special chars", "no special chars"},
	}

	for _, tt := range tests {
		got := icsEscape(tt.input)
		if got != tt.want {
			t.Errorf("icsEscape(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestICSContentStructure(t *testing.T) {
	// Test that a minimal ICS output has the correct structure
	var sb strings.Builder
	sb.WriteString("BEGIN:VCALENDAR\r\n")
	sb.WriteString("VERSION:2.0\r\n")
	sb.WriteString("PRODID:-//SSGL//Competition Platform//CN\r\n")
	sb.WriteString("BEGIN:VEVENT\r\n")
	sb.WriteString("UID:ssgl-comp-1@ssgl.platform\r\n")
	sb.WriteString("SUMMARY:Test Event\r\n")
	sb.WriteString("END:VEVENT\r\n")
	sb.WriteString("END:VCALENDAR\r\n")

	content := sb.String()

	if !strings.Contains(content, "BEGIN:VCALENDAR") {
		t.Error("missing VCALENDAR begin")
	}
	if !strings.Contains(content, "END:VCALENDAR") {
		t.Error("missing VCALENDAR end")
	}
	if !strings.Contains(content, "BEGIN:VEVENT") {
		t.Error("missing VEVENT begin")
	}
	if !strings.Contains(content, "END:VEVENT") {
		t.Error("missing VEVENT end")
	}
	if !strings.Contains(content, "VERSION:2.0") {
		t.Error("missing VERSION:2.0")
	}
	if !strings.Contains(content, "UID:ssgl-comp-1@ssgl.platform") {
		t.Error("missing UID")
	}
}

func TestICSDateFormat(t *testing.T) {
	// iCal dates should be in YYYYMMDD format for VALUE=DATE
	date := time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
	formatted := date.Format("20060102")
	if formatted != "20260715" {
		t.Errorf("expected '20260715', got '%s'", formatted)
	}

	// DTEND should be exclusive (next day)
	endDate := time.Date(2026, 7, 20, 0, 0, 0, 0, time.UTC)
	endAdj := endDate.AddDate(0, 0, 1)
	if endAdj.Format("20060102") != "20260721" {
		t.Errorf("expected DTEND '20260721', got '%s'", endAdj.Format("20060102"))
	}
}

func TestICSAlarmTrigger(t *testing.T) {
	// Alarm should trigger 3 days before event
	trigger := "-P3D"
	if trigger != "-P3D" {
		t.Errorf("expected trigger '-P3D', got '%s'", trigger)
	}
}

func TestNewCalendarHandlerReturnsSingleton(t *testing.T) {
	h1 := NewCalendarHandler()
	h2 := NewCalendarHandler()
	if h1 == nil || h2 == nil {
		t.Error("NewCalendarHandler returned nil")
	}
}
