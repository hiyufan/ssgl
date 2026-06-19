package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// BatchHandler handles batch operations on competitions.
type BatchHandler struct{}

func NewBatchHandler() *BatchHandler {
	return &BatchHandler{}
}

// BatchPublishRequest is the request body for batch publish.
type BatchPublishRequest struct {
	IDs []uint `json:"ids" binding:"required,min=1"`
}

// BatchResult holds the result of a batch operation.
type BatchResult struct {
	Success     []uint `json:"success"`
	Failed      []uint `json:"failed"`
	Succeeded   int    `json:"succeeded"`
	FailedCount int    `json:"failed_count"`
	Message     string `json:"message"`
}

// BatchPublish handles POST /api/v1/competitions/batch-publish
// Publishes multiple draft competitions at once.
func (h *BatchHandler) BatchPublish(c *gin.Context) {
	var req BatchPublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供赛事ID列表"})
		return
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库未连接"})
		return
	}

	var result BatchResult
	for _, id := range req.IDs {
		var comp models.Competition
		if err := db.First(&comp, id).Error; err != nil {
			result.Failed = append(result.Failed, id)
			continue
		}
		if comp.Status == models.CompStatusDraft {
			comp.Status = models.CompStatusPublished
			if err := db.Model(&comp).Update("status", models.CompStatusPublished).Error; err != nil {
				result.Failed = append(result.Failed, id)
				continue
			}
			result.Success = append(result.Success, id)
		} else if comp.Status == models.CompStatusPublished {
			result.Success = append(result.Success, id) // already published
		} else {
			result.Failed = append(result.Failed, id)
		}
	}

	result.Succeeded = len(result.Success)
	result.FailedCount = len(result.Failed)
	result.Message = "批量发布完成"
	c.JSON(http.StatusOK, result)
}

// BatchClose handles POST /api/v1/competitions/batch-close
// Closes multiple published/ongoing competitions.
func (h *BatchHandler) BatchClose(c *gin.Context) {
	var req BatchPublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供赛事ID列表"})
		return
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库未连接"})
		return
	}

	var result BatchResult
	for _, id := range req.IDs {
		var comp models.Competition
		if err := db.First(&comp, id).Error; err != nil {
			result.Failed = append(result.Failed, id)
			continue
		}
		if comp.Status == models.CompStatusPublished || comp.Status == models.CompStatusOngoing {
			comp.Status = models.CompStatusCompleted
			if err := db.Model(&comp).Update("status", models.CompStatusCompleted).Error; err != nil {
				result.Failed = append(result.Failed, id)
				continue
			}
			result.Success = append(result.Success, id)
		} else {
			result.Failed = append(result.Failed, id)
		}
	}

	result.Succeeded = len(result.Success)
	result.FailedCount = len(result.Failed)
	result.Message = "批量关闭完成"
	c.JSON(http.StatusOK, result)
}

// BatchDelete handles POST /api/v1/competitions/batch-delete
// Deletes multiple draft competitions.
func (h *BatchHandler) BatchDelete(c *gin.Context) {
	var req BatchPublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供赛事ID列表"})
		return
	}

	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库未连接"})
		return
	}

	var result BatchResult
	for _, id := range req.IDs {
		var comp models.Competition
		if err := db.First(&comp, id).Error; err != nil {
			result.Failed = append(result.Failed, id)
			continue
		}
		if comp.Status == models.CompStatusDraft {
			if err := db.Delete(&comp).Error; err != nil {
				result.Failed = append(result.Failed, id)
				continue
			}
			result.Success = append(result.Success, id)
		} else {
			result.Failed = append(result.Failed, id) // only draft can be deleted
		}
	}

	result.Succeeded = len(result.Success)
	result.FailedCount = len(result.Failed)
	result.Message = "批量删除完成"
	c.JSON(http.StatusOK, result)
}
