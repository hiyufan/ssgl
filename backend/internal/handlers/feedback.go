package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// CompetitionFeedbackHandler handles competition feedback HTTP requests.
type CompetitionFeedbackHandler struct{}

// NewCompetitionFeedbackHandler creates a new CompetitionFeedbackHandler.
func NewCompetitionFeedbackHandler() *CompetitionFeedbackHandler {
	return &CompetitionFeedbackHandler{}
}

// CreateFeedbackRequest is the payload for creating feedback.
type CreateFeedbackRequest struct {
	CompetitionID  int    `json:"competition_id" binding:"required"`
	OverallRating  int    `json:"overall_rating" binding:"required,min=1,max=5"`
	ContentRating  int    `json:"content_rating" binding:"min=0,max=5"`
	OrgRating      int    `json:"org_rating" binding:"min=0,max=5"`
	FairnessRating int    `json:"fairness_rating" binding:"min=0,max=5"`
	LearningValue  int    `json:"learning_value" binding:"min=0,max=5"`
	Comment        string `json:"comment"`
	Anonymous      bool   `json:"anonymous"`
	Skills         []string `json:"skills"`
}

// Create handles POST /competitions/:id/feedback — student submits feedback.
func (h *CompetitionFeedbackHandler) Create(c *gin.Context) {
	db := database.GetDB()
	userID, _ := c.Get("user_id")

	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	var req CreateFeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if student already submitted feedback for this competition
	var existing models.CompetitionFeedback
	if err := db.Where("competition_id = ? AND student_id = ?", compID, userID).
		First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "already submitted feedback for this competition"})
		return
	}

	skillsJSON := ""
	if len(req.Skills) > 0 {
		b, _ := json.Marshal(req.Skills)
		skillsJSON = string(b)
	}

	feedback := models.CompetitionFeedback{
		CompetitionID:  uint(compID),
		StudentID:      userID.(uint),
		OverallRating:  req.OverallRating,
		ContentRating:  req.ContentRating,
		OrgRating:      req.OrgRating,
		FairnessRating: req.FairnessRating,
		LearningValue:  req.LearningValue,
		Comment:        req.Comment,
		Anonymous:      req.Anonymous,
		Skills:         skillsJSON,
	}

	if err := db.Create(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create feedback"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": feedback.ID, "message": "feedback submitted"})
}

// ListByCompetition handles GET /competitions/:id/feedback — list all feedback for a competition.
func (h *CompetitionFeedbackHandler) ListByCompetition(c *gin.Context) {
	db := database.GetDB()

	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	db.Model(&models.CompetitionFeedback{}).Where("competition_id = ?", compID).Count(&total)

	var feedbacks []models.CompetitionFeedback
	offset := (page - 1) * pageSize
	if err := db.Where("competition_id = ?", compID).
		Preload("Student").
		Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&feedbacks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch feedbacks"})
		return
	}

	// Anonymize student info for anonymous feedback
	type FeedbackView struct {
		models.CompetitionFeedback
		StudentName string `json:"student_name"`
	}
	result := make([]FeedbackView, len(feedbacks))
	for i, fb := range feedbacks {
		result[i].CompetitionFeedback = fb
		if fb.Anonymous {
			result[i].StudentName = "匿名用户"
		} else if fb.Student != nil {
			result[i].StudentName = fb.Student.Name
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"feedbacks":  result,
		"total":      total,
		"page":       page,
		"page_size":  pageSize,
	})
}

// Summary handles GET /competitions/:id/feedback/summary — aggregated feedback stats.
func (h *CompetitionFeedbackHandler) Summary(c *gin.Context) {
	db := database.GetDB()

	compID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	var feedbacks []models.CompetitionFeedback
	if err := db.Where("competition_id = ?", compID).Find(&feedbacks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch feedbacks"})
		return
	}

	total := len(feedbacks)
	if total == 0 {
		c.JSON(http.StatusOK, models.CompetitionFeedbackSummary{
			CompetitionID:  uint(compID),
			TotalFeedbacks: 0,
			RatingDist:     make(map[int]int),
			TopSkills:      []models.SkillCount{},
			RecentComments: []models.FeedbackComment{},
		})
		return
	}

	var sumOverall, sumContent, sumOrg, sumFairness, sumLearning float64
	ratingDist := make(map[int]int)
	skillMap := make(map[string]int)
	comments := make([]models.FeedbackComment, 0)

	for _, fb := range feedbacks {
		sumOverall += float64(fb.OverallRating)
		sumContent += float64(fb.ContentRating)
		sumOrg += float64(fb.OrgRating)
		sumFairness += float64(fb.FairnessRating)
		sumLearning += float64(fb.LearningValue)
		ratingDist[fb.OverallRating]++

		if fb.Skills != "" {
			var skills []string
			if json.Unmarshal([]byte(fb.Skills), &skills) == nil {
				for _, s := range skills {
					skillMap[s]++
				}
			}
		}

		if fb.Comment != "" {
			comments = append(comments, models.FeedbackComment{
				Rating:    fb.OverallRating,
				Comment:   fb.Comment,
				Date:      fb.CreatedAt.Format("2006-01-02"),
				Anonymous: fb.Anonymous,
			})
		}
	}

	// Top skills
	topSkills := make([]models.SkillCount, 0)
	for skill, count := range skillMap {
		topSkills = append(topSkills, models.SkillCount{Skill: skill, Count: count})
	}
	// Simple sort by count (descending)
	for i := 0; i < len(topSkills); i++ {
		for j := i + 1; j < len(topSkills); j++ {
			if topSkills[j].Count > topSkills[i].Count {
				topSkills[i], topSkills[j] = topSkills[j], topSkills[i]
			}
		}
	}
	if len(topSkills) > 10 {
		topSkills = topSkills[:10]
	}

	// Limit recent comments to 5
	recentComments := comments
	if len(recentComments) > 5 {
		recentComments = recentComments[len(recentComments)-5:]
	}

	n := float64(total)
	summary := models.CompetitionFeedbackSummary{
		CompetitionID:    uint(compID),
		TotalFeedbacks:   total,
		AvgOverall:       sumOverall / n,
		AvgContent:       sumContent / n,
		AvgOrg:           sumOrg / n,
		AvgFairness:      sumFairness / n,
		AvgLearningValue: sumLearning / n,
		TopSkills:        topSkills,
		RecentComments:   recentComments,
		RatingDist:       ratingDist,
	}

	c.JSON(http.StatusOK, summary)
}

// Delete handles DELETE /feedback/:id — student deletes their own feedback.
func (h *CompetitionFeedbackHandler) Delete(c *gin.Context) {
	db := database.GetDB()
	userID, _ := c.Get("user_id")

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid feedback id"})
		return
	}

	var feedback models.CompetitionFeedback
	if err := db.First(&feedback, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "feedback not found"})
		return
	}

	// Only the author or admin can delete
	role, _ := c.Get("role")
	if feedback.StudentID != userID.(uint) && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	if err := db.Delete(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete feedback"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "feedback deleted"})
}

// MyFeedback handles GET /feedback/me — list current user's feedbacks.
func (h *CompetitionFeedbackHandler) MyFeedback(c *gin.Context) {
	db := database.GetDB()
	userID, _ := c.Get("user_id")

	var feedbacks []models.CompetitionFeedback
	if err := db.Where("student_id = ?", userID).
		Preload("Competition").
		Order("created_at DESC").
		Find(&feedbacks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch feedbacks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"feedbacks": feedbacks, "total": len(feedbacks)})
}
