package handlers

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// RecommendHandler handles competition recommendation requests.
type RecommendHandler struct{}

// NewRecommendHandler creates a new RecommendHandler.
func NewRecommendHandler() *RecommendHandler {
	return &RecommendHandler{}
}

// CompetitionRecommendation represents a recommended competition with match info.
type CompetitionRecommendation struct {
	models.Competition
	MatchScore float64  `json:"match_score"`
	MatchTags  []string `json:"match_tags"`
	Reason     string   `json:"reason"`
}

// Recommend handles GET /competitions/recommend — returns competitions
// ranked by relevance to the current user's profile (pre-plans, team history).
func (h *RecommendHandler) Recommend(c *gin.Context) {
	db := database.GetDB()

	// Get current user from context (set by auth middleware).
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未认证"})
		return
	}
	userID := userIDRaw.(uint)

	// Fetch published/ongoing competitions that haven't ended.
	var competitions []models.Competition
	now := time.Now()
	db.Where("status IN ? AND end_date > ?",
		[]string{models.CompStatusPublished, models.CompStatusOngoing}, now).
		Order("start_date ASC").
		Find(&competitions)

	if len(competitions) == 0 {
		c.JSON(http.StatusOK, gin.H{"recommendations": []CompetitionRecommendation{}})
		return
	}

	// Gather user context for matching.
	// 1. Teams the user belongs to
	var teamMembers []models.TeamMember
	db.Where("user_id = ?", userID).Find(&teamMembers)

	teamIDs := make([]uint, 0, len(teamMembers))
	for _, tm := range teamMembers {
		teamIDs = append(teamIDs, tm.TeamID)
	}

	// 2. Pre-plans from user's teams
	var prePlans []models.PrePlan
	if len(teamIDs) > 0 {
		db.Where("team_id IN ?", teamIDs).Find(&prePlans)
	}

	// Build keyword set from user's pre-plans.
	userKeywords := make(map[string]bool)
	for _, pp := range prePlans {
		for _, kw := range strings.Fields(pp.TechStack) {
			userKeywords[strings.ToLower(kw)] = true
		}
		for _, kw := range strings.Split(pp.TargetAudience, ",") {
			k := strings.ToLower(strings.TrimSpace(kw))
			if k != "" {
				userKeywords[k] = true
			}
		}
		for _, kw := range strings.Split(pp.Innovation, ",") {
			k := strings.ToLower(strings.TrimSpace(kw))
			if k != "" {
				userKeywords[k] = true
			}
		}
	}

	// Score each competition.
	recommendations := make([]CompetitionRecommendation, 0, len(competitions))
	for _, comp := range competitions {
		score, tags, reason := scoreCompetition(comp, prePlans, userKeywords)
		recommendations = append(recommendations, CompetitionRecommendation{
			Competition: comp,
			MatchScore:  score,
			MatchTags:   tags,
			Reason:      reason,
		})
	}

	// Sort by score descending.
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].MatchScore > recommendations[j].MatchScore
	})

	c.JSON(http.StatusOK, gin.H{"recommendations": recommendations})
}

// scoreCompetition calculates a match score (0-100) for a competition
// based on the user's pre-plans and keywords.
func scoreCompetition(comp models.Competition, prePlans []models.PrePlan, userKeywords map[string]bool) (float64, []string, string) {
	score := 30.0 // Base score for being published and upcoming.
	matchedTags := make([]string, 0)
	reasons := make([]string, 0)

	// 1. Tag matching (up to 30 points).
	compTags := strings.Split(comp.Tags, ",")
	tagMatches := 0
	for _, tag := range compTags {
		tag = strings.ToLower(strings.TrimSpace(tag))
		if tag == "" {
			continue
		}
		if userKeywords[tag] {
			tagMatches++
			matchedTags = append(matchedTags, strings.TrimSpace(tag))
		}
	}
	if tagMatches > 0 {
		tagScore := float64(tagMatches) * 10.0
		if tagScore > 30 {
			tagScore = 30
		}
		score += tagScore
		reasons = append(reasons, "标签匹配")
	}

	// 2. Pre-plan type matching (up to 20 points).
	for _, pp := range prePlans {
		if comp.Type == "hackathon" && strings.Contains(strings.ToLower(pp.TechStack), "go") {
			score += 10
			reasons = append(reasons, "技术栈匹配")
			break
		}
		if comp.Type == "innovation" && pp.Innovation != "" {
			score += 10
			reasons = append(reasons, "创新方向匹配")
			break
		}
	}

	// 3. Registration deadline proximity (up to 10 points).
	if !comp.RegistrationDeadline.IsZero() {
		daysUntil := time.Until(comp.RegistrationDeadline).Hours() / 24
		if daysUntil > 0 && daysUntil < 30 {
			score += 10 // Urgent — registration closing soon.
			reasons = append(reasons, "报名即将截止")
		} else if daysUntil > 30 && daysUntil < 90 {
			score += 5 // Coming up.
		}
	}

	// 4. Team size friendliness (up to 10 points).
	if comp.MaxTeamSize >= 3 && comp.MaxTeamSize <= 5 {
		score += 5
	}

	// Cap at 100.
	if score > 100 {
		score = 100
	}

	reason := "推荐赛事"
	if len(reasons) > 0 {
		reason = strings.Join(reasons, "、")
	}

	return score, matchedTags, reason
}
