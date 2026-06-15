package handlers

import (
	"testing"
)

func TestNewAuditHandler(t *testing.T) {
	handler := NewAuditHandler(nil)
	if handler == nil {
		t.Error("NewAuditHandler returned nil")
	}
}

func TestAuditHandlerNilDB(t *testing.T) {
	// AuditHandler with nil DB should not panic on construction
	handler := NewAuditHandler(nil)
	if handler == nil {
		t.Fatal("NewAuditHandler(nil) returned nil")
	}
	// The db field should be nil (no panic)
	if handler.db != nil {
		t.Error("expected nil db")
	}
}
