package handlers

import (
	"fmt"
	"net/http"
	"strings"
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

// ExportICS handles GET /calendar/export — generates an iCalendar (.ics) file
// containing all published competitions. Students can subscribe to this URL in
// their calendar app (Google Calendar, Apple Calendar, Outlook, etc.).
func (h *CalendarHandler) ExportICS(c *gin.Context) {
	db := database.GetDB()

	var competitions []models.Competition
	if err := db.
		Where("status IN ?", []string{models.CompStatusPublished, models.CompStatusOngoing}).
		Order("start_date ASC").
		Find(&competitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch competitions"})
		return
	}

	var sb strings.Builder
	sb.WriteString("BEGIN:VCALENDAR\r\n")
	sb.WriteString("VERSION:2.0\r\n")
	sb.WriteString("PRODID:-//SSGL//Competition Platform//CN\r\n")
	sb.WriteString("CALSCALE:GREGORIAN\r\n")
	sb.WriteString("METHOD:PUBLISH\r\n")
	sb.WriteString("X-WR-CALNAME:SSGL 竞赛日历\r\n")
	sb.WriteString("X-WR-TIMEZONE:Asia/Shanghai\r\n")

	now := time.Now().UTC().Format("20060102T150405Z")
	for _, comp := range competitions {
		sb.WriteString("BEGIN:VEVENT\r\n")
		sb.WriteString(fmt.Sprintf("UID:ssgl-comp-%d@ssgl.platform\r\n", comp.ID))
		sb.WriteString(fmt.Sprintf("DTSTAMP:%s\r\n", now))

		if !comp.StartDate.IsZero() {
			sb.WriteString(fmt.Sprintf("DTSTART;VALUE=DATE:%s\r\n", comp.StartDate.Format("20060102")))
		}
		if !comp.EndDate.IsZero() {
			// iCal DTEND is exclusive, so add one day for all-day events
			endAdj := comp.EndDate.AddDate(0, 0, 1)
			sb.WriteString(fmt.Sprintf("DTEND;VALUE=DATE:%s\r\n", endAdj.Format("20060102")))
		}

		sb.WriteString(fmt.Sprintf("SUMMARY:%s\r\n", icsEscape(comp.Title)))

		// Build description from available fields
		desc := fmt.Sprintf("类型: %s | 状态: %s", comp.Type, comp.Status)
		if comp.Prize != "" {
			desc += fmt.Sprintf("\n奖品: %s", comp.Prize)
		}
		if comp.Location != "" {
			desc += fmt.Sprintf("\n地点: %s", comp.Location)
		}
		if comp.Description != "" {
			// Truncate long descriptions
			d := comp.Description
			if len(d) > 200 {
				d = d[:200] + "..."
			}
			desc += fmt.Sprintf("\n%s", d)
		}
		sb.WriteString(fmt.Sprintf("DESCRIPTION:%s\r\n", icsEscape(desc)))

		if comp.Location != "" {
			sb.WriteString(fmt.Sprintf("LOCATION:%s\r\n", icsEscape(comp.Location)))
		}
		if comp.Website != "" {
			sb.WriteString(fmt.Sprintf("URL:%s\r\n", comp.Website))
		}

		// Categories from type
		sb.WriteString(fmt.Sprintf("CATEGORIES:%s\r\n", comp.Type))

		// Add alarm 3 days before start
		if !comp.StartDate.IsZero() && comp.StartDate.After(time.Now()) {
			sb.WriteString("BEGIN:VALARM\r\n")
			sb.WriteString("TRIGGER:-P3D\r\n")
			sb.WriteString("ACTION:DISPLAY\r\n")
			sb.WriteString(fmt.Sprintf("DESCRIPTION:赛事「%s」即将开始！\r\n", icsEscape(comp.Title)))
			sb.WriteString("END:VALARM\r\n")
		}

		sb.WriteString("END:VEVENT\r\n")
	}
	sb.WriteString("END:VCALENDAR\r\n")

	filename := fmt.Sprintf("ssgl_calendar_%s.ics", time.Now().Format("20060102"))
	c.Header("Content-Type", "text/calendar; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Cache-Control", "public, max-age=3600")
	c.String(http.StatusOK, sb.String())
}

// icsEscape escapes special characters in iCalendar text values per RFC 5545.
func icsEscape(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, ";", "\\;")
	s = strings.ReplaceAll(s, ",", "\\,")
	s = strings.ReplaceAll(s, "\n", "\\n")
	return s
}
