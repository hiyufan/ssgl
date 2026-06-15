package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
	"gorm.io/gorm"
)

// InviteRequest is the payload for inviting a user to a team.
type InviteRequest struct {
	InviteeID uint   `json:"invitee_id" binding:"required"`
	Message   string `json:"message"`
}

// InviteByUsernameRequest invites a user by their username.
type InviteByUsernameRequest struct {
	Username string `json:"username" binding:"required"`
	Message  string `json:"message"`
}

// Invite handles POST /teams/:id/invite — creates an invitation for a user to join the team.
func (h *TeamHandler) Invite(c *gin.Context) {
	db := database.GetDB()

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	// Verify team exists and user is the leader.
	var team models.Team
	if err := db.First(&team, teamID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team"})
		return
	}

	if team.LeaderID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the team leader can send invitations"})
		return
	}

	var req InviteByUsernameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the invitee by username.
	var invitee models.User
	if err := db.Where("username = ?", req.Username).First(&invitee).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to lookup user"})
		return
	}

	// Check invitee is not already a member.
	var memberCount int64
	db.Model(&models.TeamMember{}).Where("team_id = ? AND user_id = ?", team.ID, invitee.ID).Count(&memberCount)
	if memberCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is already a team member"})
		return
	}

	// Check for existing pending invite.
	var pendingCount int64
	db.Model(&models.TeamInvite{}).
		Where("team_id = ? AND invitee_id = ? AND status = ? AND expires_at > ?",
			team.ID, invitee.ID, models.TeamInviteStatusPending, time.Now()).
		Count(&pendingCount)
	if pendingCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user already has a pending invitation"})
		return
	}

	// Check team size.
	var currentMembers int64
	db.Model(&models.TeamMember{}).Where("team_id = ?", team.ID).Count(&currentMembers)
	var competition models.Competition
	db.First(&competition, team.CompetitionID)
	if int(currentMembers) >= competition.MaxTeamSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "team is full"})
		return
	}

	// Create invite.
	invite := models.TeamInvite{
		TeamID:    team.ID,
		InviterID: uid,
		InviteeID: invitee.ID,
		Code:      models.GenerateInviteCode(),
		Status:    models.TeamInviteStatusPending,
		Message:   req.Message,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days
	}

	if err := db.Create(&invite).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create invitation"})
		return
	}

	// Create notification for invitee.
	notif := models.Notification{
		UserID:  invitee.ID,
		Type:    "team_invite",
		Title:   "团队邀请",
		Message: "你被邀请加入团队「" + team.Name + "」",
	}
	db.Create(&notif)

	c.JSON(http.StatusCreated, gin.H{"invitation": invite})
}

// AcceptInvite handles POST /teams/invite/:code/accept — accepts an invitation.
func (h *TeamHandler) AcceptInvite(c *gin.Context) {
	db := database.GetDB()

	code := c.Param("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invite code is required"})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	// Find the invite.
	var invite models.TeamInvite
	if err := db.Where("code = ?", code).First(&invite).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "invitation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch invitation"})
		return
	}

	// Verify the invite is for this user.
	if invite.InviteeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "this invitation is not for you"})
		return
	}

	// Check invite status.
	if invite.Status != models.TeamInviteStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invitation is no longer pending"})
		return
	}

	// Check expiry.
	if time.Now().After(invite.ExpiresAt) {
		db.Model(&invite).Update("status", models.TeamInviteStatusExpired)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invitation has expired"})
		return
	}

	// Check team exists.
	var team models.Team
	if err := db.First(&team, invite.TeamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
		return
	}

	// Check team size.
	var memberCount int64
	db.Model(&models.TeamMember{}).Where("team_id = ?", team.ID).Count(&memberCount)
	var competition models.Competition
	db.First(&competition, team.CompetitionID)
	if int(memberCount) >= competition.MaxTeamSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "team is full"})
		return
	}

	// Accept invite and add member in a transaction.
	err := db.Transaction(func(tx *gorm.DB) error {
		// Update invite status.
		if err := tx.Model(&invite).Update("status", models.TeamInviteStatusAccepted).Error; err != nil {
			return err
		}

		// Add member.
		member := models.TeamMember{
			TeamID:   team.ID,
			UserID:   uid,
			Role:     models.TeamMemberRoleMember,
			JoinedAt: time.Now(),
		}
		return tx.Create(&member).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to accept invitation"})
		return
	}

	// Reload team.
	db.Preload("Competition").Preload("Leader").Preload("Members.User").First(&team, team.ID)

	c.JSON(http.StatusOK, gin.H{"team": team, "message": "invitation accepted"})
}

// DeclineInvite handles POST /teams/invite/:code/decline — declines an invitation.
func (h *TeamHandler) DeclineInvite(c *gin.Context) {
	db := database.GetDB()

	code := c.Param("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invite code is required"})
		return
	}

	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var invite models.TeamInvite
	if err := db.Where("code = ?", code).First(&invite).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "invitation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch invitation"})
		return
	}

	if invite.InviteeID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "this invitation is not for you"})
		return
	}

	if invite.Status != models.TeamInviteStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invitation is no longer pending"})
		return
	}

	db.Model(&invite).Update("status", models.TeamInviteStatusDeclined)
	c.JSON(http.StatusOK, gin.H{"message": "invitation declined"})
}

// ListInvites handles GET /teams/:id/invites — lists invitations for a team.
func (h *TeamHandler) ListInvites(c *gin.Context) {
	db := database.GetDB()

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team id"})
		return
	}

	var invites []models.TeamInvite
	if err := db.Where("team_id = ?", teamID).Preload("Invitee").Order("created_at DESC").Find(&invites).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch invitations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invites": invites, "total": len(invites)})
}

// MyInvites handles GET /teams/invites/me — lists invitations for the current user.
func (h *TeamHandler) MyInvites(c *gin.Context) {
	db := database.GetDB()

	userID, _ := c.Get("user_id")
	uid := userID.(uint)

	var invites []models.TeamInvite
	if err := db.Where("invitee_id = ? AND status = ? AND expires_at > ?",
		uid, models.TeamInviteStatusPending, time.Now()).
		Preload("Team").Order("created_at DESC").Find(&invites).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch invitations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invites": invites, "total": len(invites)})
}
