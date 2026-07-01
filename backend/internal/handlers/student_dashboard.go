package handlers

import (
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// StudentDashboardHandler serves the student's personal dashboard summary.
type StudentDashboardHandler struct{}

func NewStudentDashboardHandler() *StudentDashboardHandler {
	return &StudentDashboardHandler{}
}

// StudentCompetitionEntry represents one competition the student is involved in.
type StudentCompetitionEntry struct {
	CompetitionID   uint    `json:"competition_id"`
	Title           string  `json:"title"`
	Type            string  `json:"type"`
	Status          string  `json:"status"`
	Phase           string  `json:"phase"`
	TeamID          *uint   `json:"team_id,omitempty"`
	TeamName        string  `json:"team_name,omitempty"`
	TeamRole        string  `json:"team_role,omitempty"`
	PrePlanStatus   string  `json:"preplan_status,omitempty"`
	AwardStatus     string  `json:"award_status,omitempty"`
	AwardAmount     float64 `json:"award_amount,omitempty"`
	DaysRemaining   int     `json:"days_remaining"`
	ProgressPercent float64 `json:"progress_percent"`
}

// DashboardSummary is the full response for GET /students/me/dashboard.
type DashboardSummary struct {
	UserID          uint                     `json:"user_id"`
	Username        string                   `json:"username"`
	TotalCompetitions int                    `json:"total_competitions"`
	ActiveCount     int                      `json:"active_count"`
	CompletedCount  int                      `json:"completed_count"`
	TotalAwards     int                      `json:"total_awards"`
	TotalPrize      float64                  `json:"total_prize"`
	TotalTeams      int                      `json:"total_teams"`
	Competitions    []StudentCompetitionEntry `json:"competitions"`
	RecentActivity  []StudentActivityItem     `json:"recent_activity"`
	UpcomingDeadlines []StudentDeadlineItem   `json:"upcoming_deadlines"`
}

// StudentActivityItem is a recent activity entry.
type StudentActivityItem struct {
	Type      string `json:"type"`
	Title     string `json:"title"`
	Detail    string `json:"detail"`
	CreatedAt string `json:"created_at"`
}

// StudentDeadlineItem is an upcoming deadline.
type StudentDeadlineItem struct {
	CompetitionID uint   `json:"competition_id"`
	Title         string `json:"title"`
	Deadline      string `json:"deadline"`
	DaysLeft      int    `json:"days_left"`
	Type          string `json:"type"`
}

// GetDashboard returns the student's personal dashboard summary.
// GET /api/v1/students/me/dashboard
func (h *StudentDashboardHandler) GetDashboard(c *gin.Context) {
	userID := c.GetUint("user_id")
	db := database.GetDB()

	// Get user info
	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Get all teams the student is a member of
	var teamMembers []models.TeamMember
	db.Where("user_id = ?", userID).Find(&teamMembers)

	teamIDs := make([]uint, 0, len(teamMembers))
	teamRoleMap := make(map[uint]string) // team_id -> role
	for _, tm := range teamMembers {
		teamIDs = append(teamIDs, tm.TeamID)
		teamRoleMap[tm.TeamID] = tm.Role
	}

	// Get teams with competition info
	var teams []models.Team
	if len(teamIDs) > 0 {
		db.Where("id IN ?", teamIDs).Find(&teams)
	}

	// Build competition entries — batch fetch competitions
	compIDs := make(map[uint]bool)
	for _, team := range teams {
		compIDs[team.CompetitionID] = true
	}
	compIDList := make([]uint, 0, len(compIDs))
	for id := range compIDs {
		compIDList = append(compIDList, id)
	}
	compLookup := make(map[uint]models.Competition)
	if len(compIDList) > 0 {
		var comps []models.Competition
		db.Where("id IN ?", compIDList).Find(&comps)
		for _, c := range comps {
			compLookup[c.ID] = c
		}
	}

	compMap := make(map[uint]*StudentCompetitionEntry)
	for _, team := range teams {
		if _, exists := compMap[team.CompetitionID]; !exists {
			comp, ok := compLookup[team.CompetitionID]
			if !ok {
				continue
			}

			// Determine phase
			phase := "upcoming"
			now := time.Now()
			if comp.Status == "closed" || comp.Status == "completed" {
				phase = "completed"
			} else if now.Before(comp.StartDate) {
				phase = "upcoming"
			} else if now.After(comp.EndDate) {
				phase = "ended"
			} else {
				phase = "ongoing"
			}

			daysRemaining := 0
			if phase == "ongoing" || phase == "upcoming" {
				daysRemaining = int(time.Until(comp.EndDate).Hours() / 24)
				if daysRemaining < 0 {
					daysRemaining = 0
				}
			}

			compMap[team.CompetitionID] = &StudentCompetitionEntry{
				CompetitionID: comp.ID,
				Title:         comp.Title,
				Type:          comp.Type,
				Status:        comp.Status,
				Phase:         phase,
				DaysRemaining: daysRemaining,
			}
		}

		entry := compMap[team.CompetitionID]
		entry.TeamID = &team.ID
		entry.TeamName = team.Name
		entry.TeamRole = teamRoleMap[team.ID]
	}

	// Batch fetch preplans and awards for all competitions
	teamIDsForAwards := make([]uint, 0)
	for _, entry := range compMap {
		if entry.TeamID != nil {
			teamIDsForAwards = append(teamIDsForAwards, *entry.TeamID)
		}
	}

	// Preplans: one query for all
	if len(compIDList) > 0 {
		var preplans []models.PrePlan
		db.Where("competition_id IN ? AND user_id = ?", compIDList, userID).Order("id DESC").Find(&preplans)
		seen := make(map[uint]bool)
		for _, pp := range preplans {
			if !seen[pp.CompetitionID] {
				if entry, ok := compMap[pp.CompetitionID]; ok {
					entry.PrePlanStatus = pp.Status
				}
				seen[pp.CompetitionID] = true
			}
		}
	}

	// Awards: one query for all
	if len(teamIDsForAwards) > 0 {
		var awards []models.Award
		db.Where("team_id IN ?", teamIDsForAwards).Order("id DESC").Find(&awards)
		seen := make(map[uint]bool)
		for _, aw := range awards {
			if !seen[aw.CompetitionID] {
				if entry, ok := compMap[aw.CompetitionID]; ok {
					entry.AwardStatus = aw.Status
					entry.AwardAmount = aw.PrizeAmount
				}
				seen[aw.CompetitionID] = true
			}
		}
	}

	// Calculate progress
	for _, entry := range compMap {
		entry.ProgressPercent = calculateStudentProgress(entry)
	}

	// Build competitions slice
	competitions := make([]StudentCompetitionEntry, 0, len(compMap))
	activeCount := 0
	completedCount := 0
	totalAwards := 0
	totalPrize := 0.0
	for _, entry := range compMap {
		competitions = append(competitions, *entry)
		if entry.Phase == "ongoing" || entry.Phase == "upcoming" {
			activeCount++
		}
		if entry.Phase == "completed" || entry.Phase == "ended" {
			completedCount++
		}
		if entry.AwardStatus != "" {
			totalAwards++
			totalPrize += entry.AwardAmount
		}
	}

	// Get upcoming deadlines (competitions ending soon)
	var upcomingComps []models.Competition
	db.Where("status = ? AND end_date > ?", "published", time.Now()).
		Order("end_date ASC").Limit(5).Find(&upcomingComps)

	deadlines := make([]StudentDeadlineItem, 0, len(upcomingComps))
	for _, comp := range upcomingComps {
		daysLeft := int(time.Until(comp.EndDate).Hours() / 24)
		if daysLeft < 0 {
			daysLeft = 0
		}
		deadlines = append(deadlines, StudentDeadlineItem{
			CompetitionID: comp.ID,
			Title:         comp.Title,
			Deadline:      comp.EndDate.Format("2006-01-02"),
			DaysLeft:      daysLeft,
			Type:          "registration_close",
		})
	}

	// Recent activity
	activities := make([]StudentActivityItem, 0)
	var recentTeams []models.Team
	db.Joins("INNER JOIN team_members tm ON tm.team_id = teams.id").
		Where("tm.user_id = ?", userID).
		Order("teams.created_at DESC").Limit(3).Find(&recentTeams)
	for _, t := range recentTeams {
		activities = append(activities, StudentActivityItem{
			Type:      "team_join",
			Title:     "加入团队 " + t.Name,
			Detail:    "",
			CreatedAt: t.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	c.JSON(http.StatusOK, DashboardSummary{
		UserID:            userID,
		Username:          user.Username,
		TotalCompetitions: len(competitions),
		ActiveCount:       activeCount,
		CompletedCount:    completedCount,
		TotalAwards:       totalAwards,
		TotalPrize:        math.Round(totalPrize*100) / 100,
		TotalTeams:        len(teams),
		Competitions:      competitions,
		RecentActivity:    activities,
		UpcomingDeadlines: deadlines,
	})
}

// calculateStudentProgress returns a 0-100 progress percentage for a student's competition involvement.
func calculateStudentProgress(entry *StudentCompetitionEntry) float64 {
	progress := 0.0

	// Joined a team: 30%
	if entry.TeamID != nil {
		progress += 30
	}

	// Has preplan: 30%
	if entry.PrePlanStatus != "" {
		progress += 30
		if entry.PrePlanStatus == "approved" {
			progress += 10 // approved preplan: 70%
		}
	}

	// Competition phase: 10%
	if entry.Phase == "ongoing" {
		progress += 10
	} else if entry.Phase == "ended" || entry.Phase == "completed" {
		progress += 20
	}

	// Has award: bonus 10%
	if entry.AwardStatus != "" {
		progress += 10
	}

	return math.Min(progress, 100)
}
