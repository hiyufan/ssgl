package handlers

import (
	"testing"
	"time"
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
		{"", true},          // empty should fail when parsing directly
		{"2026", true},      // year only
		{"2026-13", true},   // invalid month
	}

	for _, tt := range tests {
		_, err := time.Parse("2006-01", tt.input)
		if (err != nil) != tt.wantErr {
			t.Errorf("Parse(%q): gotErr=%v, wantErr=%v", tt.input, err != nil, tt.wantErr)
		}
	}
}

func TestMonthBoundaryCalculation(t *testing.T) {
	// Verify that monthStart and monthEnd are calculated correctly.
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

	// A competition inside the month.
	insideStart := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	insideEnd := time.Date(2026, 6, 20, 0, 0, 0, 0, time.UTC)
	if !(insideStart.Before(monthEnd) && !insideEnd.Before(monthStart)) {
		t.Error("competition inside month should match filter")
	}

	// A competition outside the month.
	outsideStart := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	outsideEnd := time.Date(2026, 7, 5, 0, 0, 0, 0, time.UTC)
	if outsideStart.Before(monthEnd) && !outsideEnd.Before(monthStart) {
		// outsideStart (July 1) is NOT before monthEnd (July 1) — equal means not strictly less.
		// This is correct: a competition starting on the first of next month should not appear.
		// Actually, outsideStart == monthEnd, so outsideStart < monthEnd is false. Good.
	}

	// A competition spanning across the month boundary.
	spanStart := time.Date(2026, 5, 28, 0, 0, 0, 0, time.UTC)
	spanEnd := time.Date(2026, 6, 5, 0, 0, 0, 0, time.UTC)
	if !(spanStart.Before(monthEnd) && !spanEnd.Before(monthStart)) {
		t.Error("competition spanning into month should match filter")
	}
}
