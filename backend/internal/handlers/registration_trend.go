package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// RegistrationTrendHandler handles registration trend statistics.
type RegistrationTrendHandler struct{}

// NewRegistrationTrendHandler creates a new RegistrationTrendHandler.
func NewRegistrationTrendHandler() *RegistrationTrendHandler {
	return &RegistrationTrendHandler{}
}

// RegTrendPoint represents a single data point in the registration trend.
type RegTrendPoint struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// RegistrationTrendResponse is the response for registration trend stats.
type RegistrationTrendResponse struct {
	Trend      []RegTrendPoint `json:"trend"`
	Total      int64           `json:"total"`
	Days       int             `json:"days"`
	AvgPerDay  float64         `json:"avg_per_day"`
	PeakDay    string          `json:"peak_day"`
	PeakCount  int64           `json:"peak_count"`
	GrowthRate float64         `json:"growth_rate"`
}

// GetTrend handles GET /stats/registration-trends — returns registration counts grouped by day.
func (h *RegistrationTrendHandler) GetTrend(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "数据库不可用"})
		return
	}

	// Parse days parameter (default 30)
	days := 30
	if d := c.Query("days"); d != "" {
		parsed := parseSimpleInt(d)
		if parsed > 0 && parsed <= 365 {
			days = parsed
		}
	}

	since := time.Now().AddDate(0, 0, -days)

	// Query registrations grouped by date
	type dateCount struct {
		Date  string
		Count int64
	}

	var results []dateCount
	db.Model(&models.CompetitionRegistration{}).
		Select("to_char(created_at, 'YYYY-MM-DD') as date, count(*) as count").
		Where("created_at >= ?", since).
		Group("to_char(created_at, 'YYYY-MM-DD')").
		Order("date ASC").
		Scan(&results)

	// Build complete date range (fill gaps with 0)
	trend := make([]RegTrendPoint, 0, days)
	total := int64(0)
	peakCount := int64(0)
	peakDay := ""

	dateMap := make(map[string]int64)
	for _, r := range results {
		dateMap[r.Date] = r.Count
	}

	for i := 0; i < days; i++ {
		d := since.AddDate(0, 0, i).Format("2006-01-02")
		count := dateMap[d]
		trend = append(trend, RegTrendPoint{Date: d, Count: count})
		total += count
		if count > peakCount {
			peakCount = count
			peakDay = d
		}
	}

	// Calculate average per day
	avgPerDay := float64(0)
	if days > 0 {
		avgPerDay = float64(total) / float64(days)
	}

	// Calculate growth rate (first half vs second half)
	growthRate := float64(0)
	halfDays := days / 2
	if halfDays > 0 {
		firstHalf := int64(0)
		secondHalf := int64(0)
		for i, p := range trend {
			if i < halfDays {
				firstHalf += p.Count
			} else {
				secondHalf += p.Count
			}
		}
		if firstHalf > 0 {
			growthRate = float64(secondHalf-firstHalf) / float64(firstHalf) * 100
		} else if secondHalf > 0 {
			growthRate = 100
		}
	}

	c.JSON(http.StatusOK, RegistrationTrendResponse{
		Trend:      trend,
		Total:      total,
		Days:       days,
		AvgPerDay:  avgPerDay,
		PeakDay:    peakDay,
		PeakCount:  peakCount,
		GrowthRate: growthRate,
	})
}
