package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
)

// RegistrationHandler handles competition registration HTTP requests.
type RegistrationHandler struct {
	WorkflowService *services.WorkflowService
}

// NewRegistrationHandler creates a new RegistrationHandler.
func NewRegistrationHandler() *RegistrationHandler {
	return &RegistrationHandler{WorkflowService: services.NewWorkflowService()}
}

// CompRegistrationRequest is the payload for registering for a competition.
type CompRegistrationRequest struct {
	Remark string `json:"remark" binding:"max=512"`
}

// List handles GET /registrations — list registrations filtered by role.
func (h *RegistrationHandler) List(c *gin.Context) {
	db := database.GetDB()

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	query := db.Model(&models.CompetitionRegistration{}).
		Preload("Competition").
		Preload("User")

	// Filter by competition_id if provided.
	if compID := c.Query("competition_id"); compID != "" {
		query = query.Where("competition_id = ?", compID)
	}

	// Filter by status if provided.
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// RBAC: students see only their own registrations.
	switch role {
	case models.RoleStudent:
		query = query.Where("user_id = ?", userID)
	case models.RoleTeacher:
		// Teachers see registrations for competitions they organize.
		query = query.Joins("INNER JOIN competitions ON competitions.id = competition_registrations.competition_id").
			Where("competitions.organizer_id = ?", userID)
	case models.RoleAdmin:
		// Admins see all.
	}

	var total int64
	query.Count(&total)

	var regs []models.CompetitionRegistration
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&regs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch registrations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"registrations": regs,
		"total":         total,
		"page":          page,
		"page_size":     pageSize,
	})
}

// Register handles POST /competitions/:id/register — student registers for a competition.
func (h *RegistrationHandler) Register(c *gin.Context) {
	db := database.GetDB()

	compID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")

	// Only students can register.
	if role != models.RoleStudent {
		c.JSON(http.StatusForbidden, gin.H{"error": "only students can register for competitions"})
		return
	}

	// Check competition exists and is published.
	var comp models.Competition
	if err := db.First(&comp, compID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	if comp.Status != models.CompStatusPublished && comp.Status != models.CompStatusOngoing {
		c.JSON(http.StatusBadRequest, gin.H{"error": "competition is not accepting registrations"})
		return
	}

	// Check registration deadline.
	if !comp.RegistrationDeadline.IsZero() && time.Now().After(comp.RegistrationDeadline) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "registration deadline has passed"})
		return
	}

	// Check for duplicate registration.
	var existing models.CompetitionRegistration
	if err := db.Where("competition_id = ? AND user_id = ? AND deleted_at IS NULL", compID, userID).
		First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "already registered for this competition", "registration": existing})
		return
	}

	var req CompRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body.
		req = CompRegistrationRequest{}
	}

	reg := models.CompetitionRegistration{
		CompetitionID: uint(compID),
		UserID:        userID.(uint),
		Status:        models.RegStatusPending,
		Remark:        req.Remark,
	}

	if err := db.Create(&reg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register"})
		return
	}

	if err := createApprovalWorkflow(h.WorkflowService, services.CreateWorkflowInput{
		Type:        models.WorkflowTypeRegistration,
		TargetID:    reg.ID,
		SubmitterID: userID.(uint),
		ApproverIDs: uniqueApprovers(comp.OrganizerID),
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create approval workflow"})
		return
	}

	// Auto-create notification.
	notif := models.Notification{
		UserID:  userID.(uint),
		Type:    "registration",
		Title:   "报名成功",
		Message: "您已成功报名赛事「" + comp.Title + "」",
	}
	db.Create(&notif)

	c.JSON(http.StatusOK, gin.H{
		"message":      "registration successful",
		"registration": reg,
	})
}

// Deregister handles DELETE /competitions/:id/register — student cancels registration.
func (h *RegistrationHandler) Deregister(c *gin.Context) {
	db := database.GetDB()

	compID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	userID, _ := c.Get("user_id")

	var reg models.CompetitionRegistration
	if err := db.Where("competition_id = ? AND user_id = ? AND deleted_at IS NULL", compID, userID).
		First(&reg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "registration not found"})
		return
	}

	if reg.Status == models.RegStatusCancelled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "registration already cancelled"})
		return
	}

	// Soft delete.
	if err := db.Delete(&reg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to cancel registration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "registration cancelled"})
}

// Get handles GET /registrations/:id — get a single registration.
func (h *RegistrationHandler) Get(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid registration id"})
		return
	}

	var reg models.CompetitionRegistration
	if err := db.Preload("Competition").Preload("User").First(&reg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "registration not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"registration": reg})
}

// Approve handles POST /registrations/:id/approve — teacher/admin approves a registration.
func (h *RegistrationHandler) Approve(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid registration id"})
		return
	}

	var reg models.CompetitionRegistration
	if err := db.First(&reg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "registration not found"})
		return
	}

	if reg.Status != models.RegStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "registration is not pending"})
		return
	}

	reg.Status = models.RegStatusApproved
	if err := db.Save(&reg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to approve registration"})
		return
	}

	// Notify student.
	var comp models.Competition
	db.First(&comp, reg.CompetitionID)
	notif := models.Notification{
		UserID:  reg.UserID,
		Type:    "registration_approved",
		Title:   "报名审核通过",
		Message: "您报名的赛事「" + comp.Title + "」已通过审核",
	}
	db.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "registration approved", "registration": reg})
}

// Reject handles POST /registrations/:id/reject — teacher/admin rejects a registration.
func (h *RegistrationHandler) Reject(c *gin.Context) {
	db := database.GetDB()

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid registration id"})
		return
	}

	var reg models.CompetitionRegistration
	if err := db.First(&reg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "registration not found"})
		return
	}

	if reg.Status != models.RegStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "registration is not pending"})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"max=512"`
	}
	_ = c.ShouldBindJSON(&req)

	reg.Status = models.RegStatusRejected
	if err := db.Save(&reg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reject registration"})
		return
	}

	// Notify student.
	var comp models.Competition
	db.First(&comp, reg.CompetitionID)
	notif := models.Notification{
		UserID:  reg.UserID,
		Type:    "registration_rejected",
		Title:   "报名审核未通过",
		Message: "您报名的赛事「" + comp.Title + "」未通过审核",
	}
	db.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "registration rejected", "registration": reg})
}

// BatchActionRequest is the payload for batch approve/reject.
type BatchActionRequest struct {
	IDs    []uint `json:"ids" binding:"required,min=1"`
	Reason string `json:"reason" binding:"max=512"`
}

// BatchApprove handles POST /registrations/batch-approve — approve multiple registrations at once.
func (h *RegistrationHandler) BatchApprove(c *gin.Context) {
	db := database.GetDB()

	var req BatchActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: ids array required"})
		return
	}

	var approved int
	var notFound []uint
	var notPending []uint

	for _, id := range req.IDs {
		var reg models.CompetitionRegistration
		if err := db.First(&reg, id).Error; err != nil {
			notFound = append(notFound, id)
			continue
		}
		if reg.Status != models.RegStatusPending {
			notPending = append(notPending, id)
			continue
		}
		reg.Status = models.RegStatusApproved
		if err := db.Save(&reg).Error; err != nil {
			continue
		}
		// Notify student.
		var comp models.Competition
		db.First(&comp, reg.CompetitionID)
		notif := models.Notification{
			UserID:  reg.UserID,
			Type:    "registration_approved",
			Title:   "报名审核通过",
			Message: "您报名的赛事「" + comp.Title + "」已通过审核",
		}
		db.Create(&notif)
		approved++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "batch approve completed",
		"approved":    approved,
		"not_found":   notFound,
		"not_pending": notPending,
		"total":       len(req.IDs),
	})
}

// BatchReject handles POST /registrations/batch-reject — reject multiple registrations at once.
func (h *RegistrationHandler) BatchReject(c *gin.Context) {
	db := database.GetDB()

	var req BatchActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: ids array required"})
		return
	}

	var rejected int
	var notFound []uint
	var notPending []uint

	for _, id := range req.IDs {
		var reg models.CompetitionRegistration
		if err := db.First(&reg, id).Error; err != nil {
			notFound = append(notFound, id)
			continue
		}
		if reg.Status != models.RegStatusPending {
			notPending = append(notPending, id)
			continue
		}
		reg.Status = models.RegStatusRejected
		if err := db.Save(&reg).Error; err != nil {
			continue
		}
		// Notify student.
		var comp models.Competition
		db.First(&comp, reg.CompetitionID)
		rejectMsg := "您报名的赛事「" + comp.Title + "」未通过审核"
		if req.Reason != "" {
			rejectMsg += "，原因：" + req.Reason
		}
		notif := models.Notification{
			UserID:  reg.UserID,
			Type:    "registration_rejected",
			Title:   "报名审核未通过",
			Message: rejectMsg,
		}
		db.Create(&notif)
		rejected++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "batch reject completed",
		"rejected":    rejected,
		"not_found":   notFound,
		"not_pending": notPending,
		"total":       len(req.IDs),
	})
}

// CompetitionRegistrations handles GET /competitions/:id/registrations — list registrations for a competition.
func (h *RegistrationHandler) CompetitionRegistrations(c *gin.Context) {
	db := database.GetDB()

	compID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid competition id"})
		return
	}

	var regs []models.CompetitionRegistration
	if err := db.Preload("User").
		Where("competition_id = ?", compID).
		Order("created_at DESC").
		Find(&regs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch registrations"})
		return
	}

	// Stats.
	var total, pending, approved int64
	db.Model(&models.CompetitionRegistration{}).Where("competition_id = ?", compID).Count(&total)
	db.Model(&models.CompetitionRegistration{}).Where("competition_id = ? AND status = ?", compID, models.RegStatusPending).Count(&pending)
	db.Model(&models.CompetitionRegistration{}).Where("competition_id = ? AND status = ?", compID, models.RegStatusApproved).Count(&approved)

	c.JSON(http.StatusOK, gin.H{
		"registrations": regs,
		"total":         total,
		"pending":       pending,
		"approved":      approved,
	})
}
