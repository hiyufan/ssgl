package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ImportHandler handles batch import and full export requests.
type ImportHandler struct{}

// NewImportHandler creates a new ImportHandler.
func NewImportHandler() *ImportHandler {
	return &ImportHandler{}
}

// ImportCompetitionRequest is a single item in a batch import payload.
type ImportCompetitionRequest struct {
	Title                string `json:"title" binding:"required,max=256"`
	Description          string `json:"description"`
	Type                 string `json:"type" binding:"required,oneof=hackathon innovation research business_plan ai_innovation data_science"`
	MaxTeamSize          int    `json:"max_team_size" binding:"required,min=1"`
	MinTeamSize          int    `json:"min_team_size" binding:"required,min=1"`
	RegistrationDeadline string `json:"registration_deadline"`
	StartDate            string `json:"start_date" binding:"required"`
	EndDate              string `json:"end_date" binding:"required"`
	Location             string `json:"location" binding:"max=256"`
	RulesDocURL          string `json:"rules_doc_url" binding:"max=512"`
	Prize                string `json:"prize" binding:"max=256"`
	Tags                 string `json:"tags" binding:"max=512"`
	Level                string `json:"level" binding:"omitempty,oneof=school provincial national international"`
	Website              string `json:"website" binding:"max=512"`
	ContactName          string `json:"contact_name" binding:"max=128"`
	ContactEmail         string `json:"contact_email" binding:"max=256"`
}

// ImportError records a failure for a single item in a batch.
type ImportError struct {
	Index   int    `json:"index"`
	Title   string `json:"title"`
	Message string `json:"message"`
}

// BatchImportResponse is the response for a batch import request.
type BatchImportResponse struct {
	CreatedCount int           `json:"created_count"`
	ErrorCount   int           `json:"error_count"`
	Errors       []ImportError `json:"errors,omitempty"`
}

// BatchImport handles POST /api/v1/competitions/import — accepts a JSON array
// of competitions and creates them all. Returns the count created and any
// per-item errors so the caller knows exactly which records failed.
func (h *ImportHandler) BatchImport(c *gin.Context) {
	db := database.GetDB()

	var reqs []ImportCompetitionRequest
	if err := c.ShouldBindJSON(&reqs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	if len(reqs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty import list"})
		return
	}

	// Get organizer ID from authenticated user context.
	organizerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var (
		created int
		errs    []ImportError
	)

	for i, req := range reqs {
		startDate, err := parseTimeField(req.StartDate)
		if err != nil {
			errs = append(errs, ImportError{Index: i, Title: req.Title, Message: "invalid start_date format, use RFC3339"})
			continue
		}
		endDate, err := parseTimeField(req.EndDate)
		if err != nil {
			errs = append(errs, ImportError{Index: i, Title: req.Title, Message: "invalid end_date format, use RFC3339"})
			continue
		}

		var regDeadline time.Time
		if req.RegistrationDeadline != "" {
			t, err := parseTimeField(req.RegistrationDeadline)
			if err != nil {
				errs = append(errs, ImportError{Index: i, Title: req.Title, Message: "invalid registration_deadline format, use RFC3339"})
				continue
			}
			regDeadline = t
		}

		comp := models.Competition{
			Title:               req.Title,
			Description:         req.Description,
			Type:                req.Type,
			Status:              models.CompStatusDraft,
			MaxTeamSize:         req.MaxTeamSize,
			MinTeamSize:         req.MinTeamSize,
			StartDate:           startDate,
			EndDate:             endDate,
			Location:            req.Location,
			OrganizerID:         organizerID.(uint),
			RulesDocURL:         req.RulesDocURL,
			Prize:               req.Prize,
			Tags:                req.Tags,
			Level:               req.Level,
			Website:             req.Website,
			ContactName:         req.ContactName,
			ContactEmail:        req.ContactEmail,
			RegistrationDeadline: regDeadline,
		}

		if err := db.Create(&comp).Error; err != nil {
			errs = append(errs, ImportError{Index: i, Title: req.Title, Message: "database error: " + err.Error()})
			continue
		}

		created++
	}

	c.JSON(http.StatusOK, BatchImportResponse{
		CreatedCount: created,
		ErrorCount:   len(errs),
		Errors:       errs,
	})
}

// ExportFull handles GET /api/v1/stats/export/full — exports all platform data
// (competitions, teams, awards) as a single CSV with multiple sections separated
// by blank lines and section headers.
func (h *ImportHandler) ExportFull(c *gin.Context) {
	db := database.GetDB()

	filename := fmt.Sprintf("ssgl_full_export_%s.csv", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	w := csv.NewWriter(c.Writer)

	// --- Competitions section ---
	w.Write([]string{"=== 赛事列表 ===", "", "", "", "", "", "", "", ""})
	w.Write([]string{"ID", "赛事名称", "类型", "状态", "最大团队人数", "最小团队人数", "开始日期", "结束日期", "地点"})

	var competitions []models.Competition
	if err := db.Order("id ASC").Find(&competitions).Error; err != nil {
		// We've already started writing, so write the error as a row and flush.
		w.Write([]string{"ERROR: failed to fetch competitions", err.Error()})
		w.Flush()
		return
	}

	for _, comp := range competitions {
		startStr := ""
		if !comp.StartDate.IsZero() {
			startStr = comp.StartDate.Format("2006-01-02")
		}
		endStr := ""
		if !comp.EndDate.IsZero() {
			endStr = comp.EndDate.Format("2006-01-02")
		}
		w.Write([]string{
			strconv.FormatUint(uint64(comp.ID), 10),
			comp.Title,
			comp.Type,
			comp.Status,
			strconv.Itoa(comp.MaxTeamSize),
			strconv.Itoa(comp.MinTeamSize),
			startStr,
			endStr,
			comp.Location,
		})
	}

	// --- Teams section ---
	w.Write([]string{})
	w.Write([]string{"=== 团队列表 ===", "", "", "", ""})
	w.Write([]string{"ID", "团队名称", "赛事ID", "队长ID", "状态"})

	var teams []models.Team
	if err := db.Order("id ASC").Find(&teams).Error; err != nil {
		w.Write([]string{"ERROR: failed to fetch teams", err.Error()})
		w.Flush()
		return
	}

	for _, team := range teams {
		w.Write([]string{
			strconv.FormatUint(uint64(team.ID), 10),
			team.Name,
			strconv.FormatUint(uint64(team.CompetitionID), 10),
			strconv.FormatUint(uint64(team.LeaderID), 10),
			team.Status,
		})
	}

	// --- Awards section ---
	w.Write([]string{})
	w.Write([]string{"=== 奖项列表 ===", "", "", "", "", "", "", ""})
	w.Write([]string{"ID", "赛事ID", "团队ID", "排名", "奖项名称", "奖金", "状态", "获奖时间"})

	var awards []models.Award
	if err := db.Order("id ASC").Find(&awards).Error; err != nil {
		w.Write([]string{"ERROR: failed to fetch awards", err.Error()})
		w.Flush()
		return
	}

	for _, award := range awards {
		nominatedStr := ""
		if !award.NominatedAt.IsZero() {
			nominatedStr = award.NominatedAt.Format("2006-01-02")
		}
		w.Write([]string{
			strconv.FormatUint(uint64(award.ID), 10),
			strconv.FormatUint(uint64(award.CompetitionID), 10),
			strconv.FormatUint(uint64(award.TeamID), 10),
			strconv.Itoa(award.Rank),
			award.PrizeName,
			fmt.Sprintf("%.2f", award.PrizeAmount),
			award.Status,
			nominatedStr,
		})
	}

	w.Flush()
}
