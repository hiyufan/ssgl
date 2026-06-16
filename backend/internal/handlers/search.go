package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// GlobalSearchHandler handles cross-entity search requests.
type GlobalSearchHandler struct{}

// NewGlobalSearchHandler creates a new GlobalSearchHandler.
func NewGlobalSearchHandler() *GlobalSearchHandler {
	return &GlobalSearchHandler{}
}

// SearchResult represents a single search result item.
type SearchResult struct {
	Type  string `json:"type"`  // competition, team, user
	ID    uint   `json:"id"`
	Title string `json:"title"`
	Desc  string `json:"desc"`
}

// SearchResponse is the response for the global search endpoint.
type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Total   int           `json:"total"`
	Query   string        `json:"query"`
}

// Search handles GET /search?q=keyword — searches across competitions, teams, and users.
func (h *GlobalSearchHandler) Search(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not connected"})
		return
	}

	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	limit := 20
	pattern := "%" + query + "%"
	results := make([]SearchResult, 0, limit)

	// Search competitions
	var comps []models.Competition
	db.Where("title ILIKE ? OR description ILIKE ?", pattern, pattern).
		Limit(5).Find(&comps)
	for _, c := range comps {
		desc := c.Description
		if len(desc) > 100 {
			desc = desc[:100] + "..."
		}
		results = append(results, SearchResult{
			Type:  "competition",
			ID:    c.ID,
			Title: c.Title,
			Desc:  desc,
		})
	}

	// Search teams
	var teams []models.Team
	db.Where("name ILIKE ?", pattern).Limit(5).Find(&teams)
	for _, t := range teams {
		results = append(results, SearchResult{
			Type:  "team",
			ID:    t.ID,
			Title: t.Name,
			Desc:  "团队",
		})
	}

	// Search users
	var users []models.User
	db.Where("name ILIKE ? OR username ILIKE ?", pattern, pattern).
		Limit(5).Find(&users)
	for _, u := range users {
		desc := u.Dept
		if desc == "" {
			desc = string(u.Role)
		}
		results = append(results, SearchResult{
			Type:  "user",
			ID:    u.ID,
			Title: u.Name,
			Desc:  desc,
		})
	}

	c.JSON(http.StatusOK, SearchResponse{
		Results: results,
		Total:   len(results),
		Query:   query,
	})
}
