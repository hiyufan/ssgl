package handlers

import (
	"testing"
	"time"
)

func TestParseTimeField_ValidRFC3339(t *testing.T) {
	input := "2026-07-01T00:00:00+08:00"
	got, err := parseTimeField(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Year() != 2026 || got.Month() != time.July || got.Day() != 1 {
		t.Errorf("expected 2026-07-01, got %v", got)
	}
}

func TestParseTimeField_InvalidFormat(t *testing.T) {
	_, err := parseTimeField("not-a-date")
	if err == nil {
		t.Error("expected error for invalid date format, got nil")
	}
}

func TestParseTimeField_EmptyString(t *testing.T) {
	_, err := parseTimeField("")
	if err == nil {
		t.Error("expected error for empty string, got nil")
	}
}
