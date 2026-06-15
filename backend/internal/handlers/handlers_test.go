package handlers

import (
	"testing"
)

func TestNewTeamHandler(t *testing.T) {
	handler := NewTeamHandler()
	if handler == nil {
		t.Error("NewTeamHandler returned nil")
	}
}

func TestNewAwardHandler(t *testing.T) {
	handler := NewAwardHandler()
	if handler == nil {
		t.Error("NewAwardHandler returned nil")
	}
}

func TestNewPrePlanHandler(t *testing.T) {
	handler := NewPrePlanHandler(nil)
	if handler == nil {
		t.Error("NewPrePlanHandler returned nil")
	}
}

func TestNewStatsHandler(t *testing.T) {
	handler := NewStatsHandler()
	if handler == nil {
		t.Error("NewStatsHandler returned nil")
	}
}

func TestNewWorkflowHandler(t *testing.T) {
	handler := NewWorkflowHandler(nil)
	if handler == nil {
		t.Error("NewWorkflowHandler returned nil")
	}
}
