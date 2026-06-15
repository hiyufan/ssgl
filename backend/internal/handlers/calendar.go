package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// CalendarEvent is a lightweight representation of a competition for the calendar view.
type CalendarEvent struct {
	ID        uint      `json:"id"`
	Title     string    `json:"title"`
	Type      string    `json:"type"`
	Status    string    `json:"status"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	Location  string    `json:"location"`
	Tags      string    `json:"tags"`
}

// CalendarHandler handles calendar HTTP requests.
type CalendarHandler struct{}

// NewCalendarHandler creates a new CalendarHandler.
func NewCalendarHandler() *CalendarHandler {
	return &CalendarHandler{}
}

// List handles GET /calendar — returns competitions whose start or end date
// falls within the requested month.
// Optional query param: ?month=2026-06 (defaults to current month in UTC).
func (h *CalendarHandler) List(c *gin.Context) {
	db := database.GetDB()

	monthStr := c.Query("month")
	if monthStr == "" {
		monthStr = time.Now().UTC().Format("2006-01")
	}

	// Parse year-month.
	monthStart, err := time.Parse("2006-01", monthStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid month format, use YYYY-MM"})
		return
	}

	// First day of the next month (exclusive upper bound).
	monthEnd := monthStart.AddDate(0, 1, 0)

	// Query competitions where start_date < monthEnd AND end_date >= monthStart
	// (i.e. the competition overlaps the requested month).
	var competitions []models.Competition
	if err := db.
		Where("start_date < ? AND end_date >= ?", monthEnd, monthStart).
		Order("start_date ASC").
		Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch calendar events"})
		return
	}

	// Map to lightweight events.
	events := make([]CalendarEvent, 0, len(competitions))
	for _, comp := range competitions {
		events = append(events, CalendarEvent{
			ID:        comp.ID,
			Title:     comp.Title,
			Type:      comp.Type,
			Status:    comp.Status,
			StartDate: comp.StartDate,
			EndDate:   comp.EndDate,
			Location:  comp.Location,
			Tags:      comp.Tags,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"events": events,
		"month":  monthStr,
		"total":  len(events),
	})
}
