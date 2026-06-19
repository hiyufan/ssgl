package handlers

import (
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// TimelineHandler handles platform-wide timeline requests.
type TimelineHandler struct{}

// NewTimelineHandler creates a new TimelineHandler.
func NewTimelineHandler() *TimelineHandler {
	return &TimelineHandler{}
}

// PlatformEvent represents a single event in the platform timeline.
type PlatformEvent struct {
	ID          uint      `json:"id"`
	Type        string    `json:"type"` // competition, team, preplan, award, milestone
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	Date        time.Time `json:"date"`
	Status      string    `json:"status,omitempty"`
}

// PlatformTimelineResponse is the API response for timeline requests.
type PlatformTimelineResponse struct {
	Events []PlatformEvent `json:"events"`
	Total  int             `json:"total"`
	Types  map[string]int  `json:"types"` // count by type
}

// List handles GET /api/v1/timeline — returns a unified chronological timeline
// of all platform events (competitions, teams, preplans, awards, milestones).
func (h *TimelineHandler) List(c *gin.Context) {
	db := database.GetDB()
	var events []PlatformEvent

	// --- Competitions ---
	var comps []models.Competition
	if err := db.Order("created_at DESC").Limit(100).Find(&comps).Error; err == nil {
		for _, comp := range comps {
			events = append(events, PlatformEvent{
				ID:          comp.ID,
				Type:        "competition",
				Title:       comp.Title,
				Description: comp.Description,
				Date:        comp.CreatedAt,
				Status:      comp.Status,
			})
		}
	}

	// --- Teams ---
	var teams []models.Team
	if err := db.Order("created_at DESC").Limit(100).Find(&teams).Error; err == nil {
		for _, team := range teams {
			events = append(events, PlatformEvent{
				ID:     team.ID,
				Type:   "team",
				Title:  team.Name,
				Date:   team.CreatedAt,
				Status: team.Status,
			})
		}
	}

	// --- Pre-plans ---
	var plans []models.PrePlan
	if err := db.Order("created_at DESC").Limit(100).Find(&plans).Error; err == nil {
		for _, plan := range plans {
			events = append(events, PlatformEvent{
				ID:     plan.ID,
				Type:   "preplan",
				Title:  plan.Title,
				Date:   plan.CreatedAt,
				Status: plan.Status,
			})
		}
	}

	// --- Awards ---
	var awards []models.Award
	if err := db.Order("created_at DESC").Limit(100).Find(&awards).Error; err == nil {
		for _, award := range awards {
			events = append(events, PlatformEvent{
				ID:     award.ID,
				Type:   "award",
				Title:  award.PrizeName,
				Date:   award.NominatedAt,
				Status: award.Status,
			})
		}
	}

	// --- Milestones ---
	var milestones []models.Milestone
	if err := db.Order("created_at DESC").Limit(100).Find(&milestones).Error; err == nil {
		for _, ms := range milestones {
			events = append(events, PlatformEvent{
				ID:     ms.ID,
				Type:   "milestone",
				Title:  ms.Title,
				Date:   ms.CreatedAt,
				Status: ms.Status,
			})
		}
	}

	// Sort by date descending
	sort.Slice(events, func(i, j int) bool {
		return events[i].Date.After(events[j].Date)
	})

	// Count by type
	typeCounts := make(map[string]int)
	for _, e := range events {
		typeCounts[e.Type]++
	}

	// Apply limit
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed := parseSimpleInt(l); parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}
	if len(events) > limit {
		events = events[:limit]
	}

	c.JSON(http.StatusOK, PlatformTimelineResponse{
		Events: events,
		Total:  len(events),
		Types:  typeCounts,
	})
}

// parseSimpleInt parses a simple non-negative integer string.
func parseSimpleInt(s string) int {
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0
		}
		n = n*10 + int(ch-'0')
	}
	return n
}
