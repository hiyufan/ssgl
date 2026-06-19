package handlers

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ActivityFeedHandler serves the competition activity feed.
type ActivityFeedHandler struct{}

func NewActivityFeedHandler() *ActivityFeedHandler {
	return &ActivityFeedHandler{}
}

// FeedItem represents a single activity event in the competition feed.
type FeedItem struct {
	ID        uint   `json:"id"`
	Type      string `json:"type"`      // team_join, preplan_submit, registration, award, milestone, team_create
	Actor     string `json:"actor"`     // user name
	Summary   string `json:"summary"`   // human-readable summary
	Timestamp string `json:"timestamp"` // RFC3339
	RefID     uint   `json:"ref_id"`    // ID of the related entity
	RefType   string `json:"ref_type"`  // team, preplan, registration, award, milestone
}

// FeedResponse is the JSON response for the activity feed.
type FeedResponse struct {
	CompetitionID uint       `json:"competition_id"`
	Total         int        `json:"total"`
	Items         []FeedItem `json:"items"`
}

// GetFeed handles GET /competitions/:id/activity — returns a unified activity feed for a competition.
func (h *ActivityFeedHandler) GetFeed(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	compID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	// Verify competition exists.
	var comp models.Competition
	if err := db.First(&comp, compID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	// Parse optional limit (default 50, max 200).
	limit := 50
	if l, err := strconv.Atoi(c.DefaultQuery("limit", "50")); err == nil && l > 0 && l <= 200 {
		limit = l
	}

	var items []FeedItem

	// 1. Team creation & member joins.
	var teams []models.Team
	db.Where("competition_id = ?", compID).Find(&teams)
	teamNameMap := make(map[uint]string) // teamID -> teamName
	for _, t := range teams {
		teamNameMap[t.ID] = t.Name
		items = append(items, FeedItem{
			ID:        t.ID * 1000,
			Type:      "team_create",
			Actor:     "",
			Summary:   "团队「" + t.Name + "」创建",
			Timestamp: t.CreatedAt.Format(time.RFC3339),
			RefID:     t.ID,
			RefType:   "team",
		})
		// Get team members.
		var members []models.TeamMember
		db.Where("team_id = ?", t.ID).Find(&members)
		for _, m := range members {
			var user models.User
			actorName := ""
			if err := db.First(&user, m.UserID).Error; err == nil {
				actorName = user.Name
			}
			items = append(items, FeedItem{
				ID:        m.ID*1000 + 1,
				Type:      "team_join",
				Actor:     actorName,
				Summary:   actorName + " 加入团队「" + t.Name + "」",
				Timestamp: m.JoinedAt.Format(time.RFC3339),
				RefID:     t.ID,
				RefType:   "team",
			})
		}
	}

	// 2. Pre-plan submissions.
	var preplans []models.PrePlan
	db.Where("competition_id = ?", compID).Find(&preplans)
	for _, p := range preplans {
		actorName := ""
		if p.TeamID > 0 {
			if tn, ok := teamNameMap[p.TeamID]; ok {
				actorName = tn
			}
		}
		statusLabel := map[string]string{
			"draft":     "草稿",
			"submitted": "已提交",
			"reviewed":  "AI 已评审",
			"approved":  "已通过",
			"rejected":  "已驳回",
		}[p.Status]
		if statusLabel == "" {
			statusLabel = p.Status
		}
		items = append(items, FeedItem{
			ID:        p.ID*1000 + 2,
			Type:      "preplan_" + p.Status,
			Actor:     actorName,
			Summary:   "预案「" + p.Title + "」" + statusLabel,
			Timestamp: p.UpdatedAt.Format(time.RFC3339),
			RefID:     p.ID,
			RefType:   "preplan",
		})
	}

	// 3. Registrations.
	var regs []models.CompetitionRegistration
	db.Where("competition_id = ?", compID).Find(&regs)
	for _, r := range regs {
		var user models.User
		actorName := ""
		if err := db.First(&user, r.UserID).Error; err == nil {
			actorName = user.Name
		}
		items = append(items, FeedItem{
			ID:        r.ID*1000 + 3,
			Type:      "registration",
			Actor:     actorName,
			Summary:   actorName + " 报名赛事",
			Timestamp: r.CreatedAt.Format(time.RFC3339),
			RefID:     r.ID,
			RefType:   "registration",
		})
	}

	// 4. Awards.
	var awards []models.Award
	db.Where("competition_id = ?", compID).Find(&awards)
	for _, a := range awards {
		label := a.PrizeName
		if label == "" {
			label = a.RankName
		}
		if label == "" {
			label = "奖项"
		}
		items = append(items, FeedItem{
			ID:        a.ID*1000 + 4,
			Type:      "award",
			Actor:     "",
			Summary:   label + " — ¥" + strconv.FormatFloat(a.PrizeAmount, 'f', 0, 64),
			Timestamp: a.CreatedAt.Format(time.RFC3339),
			RefID:     a.ID,
			RefType:   "award",
		})
	}

	// 5. Milestones.
	var milestones []models.Milestone
	db.Where("competition_id = ?", compID).Find(&milestones)
	for _, m := range milestones {
		statusLabel := "待完成"
		if m.Status == models.MilestoneStatusCompleted {
			statusLabel = "已完成"
		} else if m.Status == models.MilestoneStatusInProgress {
			statusLabel = "进行中"
		}
		items = append(items, FeedItem{
			ID:        m.ID*1000 + 5,
			Type:      "milestone_" + m.Status,
			Actor:     "",
			Summary:   "里程碑「" + m.Title + "」" + statusLabel,
			Timestamp: m.UpdatedAt.Format(time.RFC3339),
			RefID:     m.ID,
			RefType:   "milestone",
		})
	}

	// Sort by timestamp descending (newest first).
	sort.Slice(items, func(i, j int) bool {
		return items[i].Timestamp > items[j].Timestamp
	})

	// Apply limit.
	if len(items) > limit {
		items = items[:limit]
	}

	c.JSON(http.StatusOK, FeedResponse{
		CompetitionID: uint(compID),
		Total:         len(items),
		Items:         items,
	})
}
