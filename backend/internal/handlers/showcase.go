package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ShowcaseHandler handles showcase/portfolio HTTP requests.
type ShowcaseHandler struct{}

// NewShowcaseHandler creates a new ShowcaseHandler.
func NewShowcaseHandler() *ShowcaseHandler {
	return &ShowcaseHandler{}
}

// ShowcaseEntry represents a single showcase item.
type ShowcaseEntry struct {
	ID              uint    `json:"id"`
	CompetitionID   uint    `json:"competition_id"`
	CompetitionName string  `json:"competition_name"`
	CompType        string  `json:"comp_type"`
	TeamID          uint    `json:"team_id"`
	TeamName        string  `json:"team_name"`
	LeaderName      string  `json:"leader_name"`
	Rank            int     `json:"rank"`
	RankName        string  `json:"rank_name"`
	PrizeName       string  `json:"prize_name"`
	PrizeAmount     float64 `json:"prize_amount"`
	SettledAt       string  `json:"settled_at"`
}

// ShowcaseResponse is the full showcase response.
type ShowcaseResponse struct {
	Entries       []ShowcaseEntry `json:"entries"`
	TotalAwards   int             `json:"total_awards"`
	TotalPrize    float64         `json:"total_prize"`
	TotalTeams    int             `json:"total_teams"`
	CompCount     int             `json:"comp_count"`
	TopTeams      []ShowcaseEntry `json:"top_teams"`
}

// List handles GET /showcase — returns settled awards for public display.
func (h *ShowcaseHandler) List(c *gin.Context) {
	db := database.GetDB()

	var awards []models.Award
	if err := db.Unscoped().Preload("Competition").Preload("Team").
		Where("awards.status = ?", models.AwardStatusSettled).
		Order("awards.rank ASC, awards.settled_at DESC").
		Find(&awards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch showcase"})
		return
	}

	entries := make([]ShowcaseEntry, 0, len(awards))
	var totalPrize float64
	teamSet := make(map[uint]bool)
	compSet := make(map[uint]bool)

	for _, a := range awards {
		leaderName := ""
		if a.Team.LeaderID > 0 {
			leaderName = a.Team.Name // fallback
			var leader models.User
			if err := db.First(&leader, a.Team.LeaderID).Error; err == nil {
				leaderName = leader.Name
			}
		}

		compName := a.Competition.Title
		compType := a.Competition.Type
		if compName == "" {
			compName = "历史赛事"
		}

		entry := ShowcaseEntry{
			ID:              a.ID,
			CompetitionID:   a.CompetitionID,
			CompetitionName: compName,
			CompType:        compType,
			TeamID:          a.TeamID,
			TeamName:        a.Team.Name,
			LeaderName:      leaderName,
			Rank:            a.Rank,
			RankName:        a.RankName,
			PrizeName:       a.PrizeName,
			PrizeAmount:     a.PrizeAmount,
		}
		if a.SettledAt != nil {
			entry.SettledAt = a.SettledAt.Format("2006-01-02")
		}
		entries = append(entries, entry)
		totalPrize += a.PrizeAmount
		teamSet[a.TeamID] = true
		compSet[a.CompetitionID] = true
	}

	// Top teams: entries with rank 1 (first place)
	topTeams := make([]ShowcaseEntry, 0)
	for _, e := range entries {
		if e.Rank == 1 {
			topTeams = append(topTeams, e)
		}
	}

	c.JSON(http.StatusOK, ShowcaseResponse{
		Entries:     entries,
		TotalAwards: len(entries),
		TotalPrize:  totalPrize,
		TotalTeams:  len(teamSet),
		CompCount:   len(compSet),
		TopTeams:    topTeams,
	})
}
