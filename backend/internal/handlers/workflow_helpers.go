package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
	"gorm.io/gorm"
)

func currentUserIDOr(c *gin.Context, fallback uint) uint {
	if userIDVal, ok := c.Get("user_id"); ok {
		if userID, ok := userIDVal.(uint); ok && userID != 0 {
			return userID
		}
	}
	return fallback
}

func firstAdminID(db *gorm.DB) (uint, bool) {
	var admin models.User
	if err := db.Where("role = ? AND status = ?", models.RoleAdmin, models.StatusActive).
		Order("id ASC").
		First(&admin).Error; err != nil {
		return 0, false
	}
	return admin.ID, true
}

func uniqueApprovers(ids ...uint) []uint {
	seen := map[uint]bool{}
	result := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id == 0 || seen[id] {
			continue
		}
		seen[id] = true
		result = append(result, id)
	}
	return result
}

func createApprovalWorkflow(workflowService *services.WorkflowService, input services.CreateWorkflowInput) error {
	if workflowService == nil {
		workflowService = services.NewWorkflowService()
	}
	if len(input.ApproverIDs) == 0 {
		return nil
	}
	_, err := workflowService.Create(input)
	return err
}
