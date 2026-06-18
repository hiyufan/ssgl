package handlers

import (
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ScheduleHandler handles smart scheduling HTTP requests.
type ScheduleHandler struct{}

// NewScheduleHandler creates a new ScheduleHandler.
func NewScheduleHandler() *ScheduleHandler {
	return &ScheduleHandler{}
}

// ScheduleEvent represents a single competition on the schedule timeline.
type ScheduleEvent struct {
	CompetitionID uint      `json:"competition_id"`
	Title         string    `json:"title"`
	Type          string    `json:"type"`
	Status        string    `json:"status"`
	StartDate     time.Time `json:"start_date"`
	EndDate       time.Time `json:"end_date"`
	RegDeadline   time.Time `json:"registration_deadline"`
	Location      string    `json:"location"`
	Level         string    `json:"level"`
	Registered    bool      `json:"registered"`
	Phase         string    `json:"phase"` // upcoming, registration_open, ongoing, completed
}

// ScheduleConflict represents two competitions whose dates overlap.
type ScheduleConflict struct {
	EventA uint   `json:"event_a_id"`
	TitleA string `json:"event_a_title"`
	EventB uint   `json:"event_b_id"`
	TitleB string `json:"event_b_title"`
	Type   string `json:"type"` // full_overlap, partial_overlap, deadline_clash
	Days   int    `json:"overlap_days"`
}

// WorkloadPeriod groups events into time periods for workload analysis.
type WorkloadPeriod struct {
	Period     string `json:"period"`      // e.g. "2026-06", "2026-07"
	EventCount int    `json:"event_count"`
	EventIDs   []uint `json:"event_ids"`
	LoadLevel  string `json:"load_level"` // light, moderate, heavy, overloaded
}

// ScheduleOptimization suggests optimal ordering and prep time.
type ScheduleOptimization struct {
	Suggestion    string   `json:"suggestion"`
	PriorityOrder []uint   `json:"priority_order"` // recommended competition IDs in priority order
	PrepWeeks     int      `json:"prep_weeks"`
	RiskLevel     string   `json:"risk_level"` // low, medium, high
	Details       []string `json:"details"`
}

// SmartScheduleResponse is the full response for the smart schedule endpoint.
type SmartScheduleResponse struct {
	Events       []ScheduleEvent       `json:"events"`
	Conflicts    []ScheduleConflict    `json:"conflicts"`
	Workload     []WorkloadPeriod      `json:"workload"`
	Optimization *ScheduleOptimization `json:"optimization"`
	Summary      string                `json:"summary"`
}

// SmartSchedule handles GET /schedule — returns smart schedule with conflict detection.
func (h *ScheduleHandler) SmartSchedule(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}
	currentUserID := userIDVal.(uint)

	// Load user's registrations.
	var registrations []models.CompetitionRegistration
	db.Where("user_id = ? AND status IN ?", currentUserID, []string{
		models.RegStatusApproved, models.RegStatusPending,
	}).Find(&registrations)

	registeredIDs := make(map[uint]bool)
	for _, reg := range registrations {
		registeredIDs[reg.CompetitionID] = true
	}

	// Load all published/ongoing competitions with future dates (or recently started).
	now := time.Now()
	var competitions []models.Competition
	db.Where("status IN ? AND (end_date IS NULL OR end_date >= ?)",
		[]string{models.CompStatusPublished, models.CompStatusOngoing}, now,
	).Order("start_date ASC").Find(&competitions)

	// Build schedule events.
	events := make([]ScheduleEvent, 0, len(competitions))
	for _, comp := range competitions {
		phase := classifyPhase(comp, now)
		events = append(events, ScheduleEvent{
			CompetitionID: comp.ID,
			Title:         comp.Title,
			Type:          comp.Type,
			Status:        comp.Status,
			StartDate:     comp.StartDate,
			EndDate:       comp.EndDate,
			RegDeadline:   comp.RegistrationDeadline,
			Location:      comp.Location,
			Level:         comp.Level,
			Registered:    registeredIDs[comp.ID],
			Phase:         phase,
		})
	}

	// Detect conflicts among registered competitions.
	registeredEvents := make([]ScheduleEvent, 0)
	for _, ev := range events {
		if ev.Registered {
			registeredEvents = append(registeredEvents, ev)
		}
	}
	conflicts := detectConflicts(registeredEvents)

	// Analyze workload by month.
	workload := analyzeWorkload(events)

	// Generate optimization suggestion.
	optimization := optimizeSchedule(registeredEvents, conflicts)

	// Build summary.
	totalReg := len(registeredEvents)
	totalAvail := len(events)
	conflictCount := len(conflicts)
	summary := buildSummary(totalReg, totalAvail, conflictCount, optimization)

	c.JSON(http.StatusOK, SmartScheduleResponse{
		Events:       events,
		Conflicts:    conflicts,
		Workload:     workload,
		Optimization: optimization,
		Summary:      summary,
	})
}

// classifyPhase determines the current phase of a competition.
func classifyPhase(comp models.Competition, now time.Time) string {
	if comp.Status == models.CompStatusCompleted {
		return "completed"
	}
	if !comp.RegistrationDeadline.IsZero() && now.Before(comp.RegistrationDeadline) {
		return "registration_open"
	}
	if !comp.StartDate.IsZero() && now.Before(comp.StartDate) {
		return "upcoming"
	}
	if !comp.EndDate.IsZero() && now.Before(comp.EndDate) {
		return "ongoing"
	}
	if comp.StartDate.IsZero() {
		return "upcoming"
	}
	return "upcoming"
}

// detectConflicts finds scheduling overlaps among registered events.
func detectConflicts(events []ScheduleEvent) []ScheduleConflict {
	conflicts := make([]ScheduleConflict, 0)
	for i := 0; i < len(events); i++ {
		for j := i + 1; j < len(events); j++ {
			a, b := events[i], events[j]
			if a.StartDate.IsZero() || b.StartDate.IsZero() {
				continue
			}
			// Ensure a starts before b.
			if a.StartDate.After(b.StartDate) {
				a, b = b, a
			}
			aEnd := a.EndDate
			if aEnd.IsZero() {
				aEnd = a.StartDate.AddDate(0, 0, 7) // assume 1 week if no end
			}
			bEnd := b.EndDate
			if bEnd.IsZero() {
				bEnd = b.StartDate.AddDate(0, 0, 7)
			}

			if aEnd.After(b.StartDate) || aEnd.Equal(b.StartDate) {
				// There is overlap.
				overlapType := "partial_overlap"
				overlapDays := int(aEnd.Sub(b.StartDate).Hours() / 24)
				if overlapDays < 0 {
					overlapDays = 0
				}
				if !a.StartDate.After(b.StartDate) && !aEnd.Before(bEnd) {
					overlapType = "full_overlap"
				}
				if overlapDays == 0 {
					overlapType = "deadline_clash"
				}
				conflicts = append(conflicts, ScheduleConflict{
					EventA: a.CompetitionID,
					TitleA: a.Title,
					EventB: b.CompetitionID,
					TitleB: b.Title,
					Type:   overlapType,
					Days:   overlapDays,
				})
			}
		}
	}
	return conflicts
}

// analyzeWorkload groups events by month and classifies load level.
func analyzeWorkload(events []ScheduleEvent) []WorkloadPeriod {
	monthMap := make(map[string]*WorkloadPeriod)
	monthOrder := make([]string, 0)

	for _, ev := range events {
		key := ev.StartDate.Format("2006-01")
		if ev.StartDate.IsZero() {
			continue
		}
		if _, exists := monthMap[key]; !exists {
			monthMap[key] = &WorkloadPeriod{Period: key, EventIDs: make([]uint, 0)}
			monthOrder = append(monthOrder, key)
		}
		monthMap[key].EventCount++
		monthMap[key].EventIDs = append(monthMap[key].EventIDs, ev.CompetitionID)
	}

	result := make([]WorkloadPeriod, 0, len(monthMap))
	sort.Strings(monthOrder)
	for _, key := range monthOrder {
		wp := monthMap[key]
		wp.LoadLevel = classifyLoad(wp.EventCount)
		result = append(result, *wp)
	}
	return result
}

// classifyLoad returns load level based on event count.
func classifyLoad(count int) string {
	switch {
	case count <= 1:
		return "light"
	case count <= 3:
		return "moderate"
	case count <= 5:
		return "heavy"
	default:
		return "overloaded"
	}
}

// optimizeSchedule generates a prioritized schedule suggestion.
func optimizeSchedule(events []ScheduleEvent, conflicts []ScheduleConflict) *ScheduleOptimization {
	if len(events) == 0 {
		return &ScheduleOptimization{
			Suggestion:    "您尚未报名任何赛事，建议浏览赛事列表并报名参加。",
			PriorityOrder: []uint{},
			PrepWeeks:     0,
			RiskLevel:     "low",
			Details:       []string{"暂无已报名赛事"},
		}
	}

	// Sort by start date (earliest first), break ties by registration deadline.
	sorted := make([]ScheduleEvent, len(events))
	copy(sorted, events)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].StartDate.Equal(sorted[j].StartDate) {
			return sorted[i].RegDeadline.Before(sorted[j].RegDeadline)
		}
		return sorted[i].StartDate.Before(sorted[j].StartDate)
	})

	priorityOrder := make([]uint, len(sorted))
	for i, ev := range sorted {
		priorityOrder[i] = ev.CompetitionID
	}

	// Determine risk level.
	riskLevel := "low"
	details := make([]string, 0)
	if len(conflicts) > 0 {
		riskLevel = "high"
		details = append(details, "存在日程冲突，建议调整报名策略")
	} else if len(events) > 3 {
		riskLevel = "medium"
		details = append(details, "报名赛事较多，注意合理分配精力")
	}

	// Calculate recommended prep weeks.
	prepWeeks := 2
	if len(events) > 2 {
		prepWeeks = 3
	}
	if len(events) > 5 {
		prepWeeks = 4
	}

	// Generate suggestion text.
	suggestion := generateSuggestion(sorted, conflicts, riskLevel)

	// Add detailed recommendations.
	if len(events) >= 1 {
		details = append(details, "建议优先准备即将开赛的赛事")
	}
	if len(events) >= 3 {
		details = append(details, "考虑组建专项团队分工准备不同赛事")
	}
	if len(conflicts) > 0 {
		for _, c := range conflicts {
			details = append(details, "⚠️ "+c.TitleA+" 与 "+c.TitleB+" 存在时间冲突")
		}
	}

	return &ScheduleOptimization{
		Suggestion:    suggestion,
		PriorityOrder: priorityOrder,
		PrepWeeks:     prepWeeks,
		RiskLevel:     riskLevel,
		Details:       details,
	}
}

// generateSuggestion creates a human-readable suggestion.
func generateSuggestion(events []ScheduleEvent, conflicts []ScheduleConflict, risk string) string {
	n := len(events)
	if n == 0 {
		return "暂无赛事安排"
	}
	if len(conflicts) > 0 {
		return "检测到 " + itoa(len(conflicts)) + " 个日程冲突，建议错峰参赛或与团队协调分工"
	}
	if n == 1 {
		return "当前已报名 1 项赛事，建议专注准备，全力以赴"
	}
	if n <= 3 {
		return "已报名 " + itoa(n) + " 项赛事，安排合理，建议制定阶段性备赛计划"
	}
	return "已报名 " + itoa(n) + " 项赛事，工作量较大，建议优先级排序并合理分配时间"
}

// buildSummary creates a one-line summary.
func buildSummary(registered, available, conflicts int, opt *ScheduleOptimization) string {
	s := "已报名 " + itoa(registered) + "/" + itoa(available) + " 项赛事"
	if conflicts > 0 {
		s += "，" + itoa(conflicts) + " 个冲突"
	}
	s += "，风险等级: " + opt.RiskLevel
	return s
}

// itoa is a simple int-to-string helper.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	digits := ""
	neg := false
	if n < 0 {
		neg = true
		n = -n
	}
	for n > 0 {
		digits = string(rune('0'+n%10)) + digits
		n /= 10
	}
	if neg {
		return "-" + digits
	}
	return digits
}
