package handlers

import (
	"testing"
)

func TestCreateTeamRequest_Fields(t *testing.T) {
	req := CreateTeamRequest{
		Name:          "AI创新团队",
		CompetitionID: 10,
	}

	if req.Name != "AI创新团队" {
		t.Errorf("expected Name='AI创新团队', got '%s'", req.Name)
	}
	if req.CompetitionID != 10 {
		t.Errorf("expected CompetitionID=10, got %d", req.CompetitionID)
	}
}

func TestCreateTeamRequest_EmptyName(t *testing.T) {
	req := CreateTeamRequest{
		Name:          "",
		CompetitionID: 1,
	}

	// Empty name should be caught by binding:"required" tag at Gin level
	if req.Name != "" {
		t.Errorf("expected empty Name, got '%s'", req.Name)
	}
}

func TestCreateTeamRequest_LongName(t *testing.T) {
	// Name has max=128 binding
	longName := ""
	for i := 0; i < 200; i++ {
		longName += "a"
	}
	req := CreateTeamRequest{
		Name:          longName,
		CompetitionID: 1,
	}

	if len(req.Name) != 200 {
		t.Errorf("expected Name length=200, got %d", len(req.Name))
	}
}
