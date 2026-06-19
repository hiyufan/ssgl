package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/models"
)

// ReportHandler handles competition achievement report requests.
type ReportHandler struct{}

// NewReportHandler creates a new ReportHandler.
func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

// CompetitionReport represents a comprehensive competition report.
type CompetitionReport struct {
	// Basic info
	CompetitionID uint      `json:"competition_id"`
	Title         string    `json:"title"`
	Type          string    `json:"type"`
	Status        string    `json:"status"`
	Level         string    `json:"level"`
	Organizer     string    `json:"organizer"`
	StartDate     time.Time `json:"start_date"`
	EndDate       time.Time `json:"end_date"`
	Location      string    `json:"location"`

	// Registration stats
	RegistrationStats RegistrationStats `json:"registration_stats"`

	// Team stats
	TeamStats TeamStats `json:"team_stats"`

	// Preplan stats
	PrePlanStats PrePlanStats `json:"preplan_stats"`

	// Award stats
	AwardStats AwardStats `json:"award_stats"`

	// Milestone stats
	MilestoneStats MilestoneStats `json:"milestone_stats"`

	// Engagement metrics
	Engagement EngagementMetrics `json:"engagement"`

	// Timeline events
	Timeline []TimelineEvent `json:"timeline"`

	// Generated at
	GeneratedAt time.Time `json:"generated_at"`
}

type RegistrationStats struct {
	Total      int64   `json:"total"`
	Approved   int64   `json:"approved"`
	Pending    int64   `json:"pending"`
	Rejected   int64   `json:"rejected"`
	Cancelled  int64   `json:"cancelled"`
	ApprovalRate float64 `json:"approval_rate"`
}

type TeamStats struct {
	TotalTeams    int64   `json:"total_teams"`
	TotalMembers  int64   `json:"total_members"`
	AvgTeamSize   float64 `json:"avg_team_size"`
	TeamsWithPlan int64   `json:"teams_with_plan"`
	PlanCoverage  float64 `json:"plan_coverage"`
}

type PrePlanStats struct {
	Total       int64   `json:"total"`
	Draft       int64   `json:"draft"`
	Submitted   int64   `json:"submitted"`
	Reviewed    int64   `json:"reviewed"`
	Approved    int64   `json:"approved"`
	Rejected    int64   `json:"rejected"`
	AvgAIScore  float64 `json:"avg_ai_score"`
	ApprovalRate float64 `json:"approval_rate"`
}

type AwardStats struct {
	TotalAwards  int64   `json:"total_awards"`
	Settled      int64   `json:"settled"`
	Pending      int64   `json:"pending"`
	TotalPrize   float64 `json:"total_prize"`
	AvgPrize     float64 `json:"avg_prize"`
	SettlementRate float64 `json:"settlement_rate"`
}

type MilestoneStats struct {
	Total       int64   `json:"total"`
	Completed   int64   `json:"completed"`
	InProgress  int64   `json:"in_progress"`
	Pending     int64   `json:"pending"`
	Progress    float64 `json:"progress"`
}

type EngagementMetrics struct {
	ParticipationRate float64 `json:"participation_rate"`
	TeamFormationRate float64 `json:"team_formation_rate"`
	PreplanSubmitRate float64 `json:"preplan_submit_rate"`
	AwardRate         float64 `json:"award_rate"`
}

type TimelineEvent struct {
	Date        time.Time `json:"date"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
}

// GenerateReport handles GET /competitions/:id/report — generates a comprehensive competition report.
func (h *ReportHandler) GenerateReport(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()

	// Fetch competition
	var comp models.Competition
	if err := db.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competition not found"})
		return
	}

	// Fetch organizer
	var organizer models.User
	db.First(&organizer, comp.OrganizerID)

	report := CompetitionReport{
		CompetitionID: comp.ID,
		Title:         comp.Title,
		Type:          comp.Type,
		Status:        comp.Status,
		Level:         comp.Level,
		Organizer:     organizer.Username,
		StartDate:     comp.StartDate,
		EndDate:       comp.EndDate,
		Location:      comp.Location,
		GeneratedAt:   time.Now(),
	}

	// Registration stats
	var regs []models.CompetitionRegistration
	db.Where("competition_id = ?", comp.ID).Find(&regs)
	report.RegistrationStats.Total = int64(len(regs))
	for _, r := range regs {
		switch r.Status {
		case models.RegStatusApproved:
			report.RegistrationStats.Approved++
		case models.RegStatusPending:
			report.RegistrationStats.Pending++
		case models.RegStatusRejected:
			report.RegistrationStats.Rejected++
		case models.RegStatusCancelled:
			report.RegistrationStats.Cancelled++
		}
	}
	if report.RegistrationStats.Total > 0 {
		report.RegistrationStats.ApprovalRate = float64(report.RegistrationStats.Approved) / float64(report.RegistrationStats.Total) * 100
	}

	// Team stats
	var teams []models.Team
	db.Where("competition_id = ?", comp.ID).Find(&teams)
	report.TeamStats.TotalTeams = int64(len(teams))
	totalMembers := 0
	teamsWithPlan := 0
	for _, t := range teams {
		var memberCount int64
		db.Model(&models.TeamMember{}).Where("team_id = ?", t.ID).Count(&memberCount)
		totalMembers += int(memberCount)

		var planCount int64
		db.Model(&models.PrePlan{}).Where("team_id = ? AND competition_id = ?", t.ID, comp.ID).Count(&planCount)
		if planCount > 0 {
			teamsWithPlan++
		}
	}
	report.TeamStats.TotalMembers = int64(totalMembers)
	if report.TeamStats.TotalTeams > 0 {
		report.TeamStats.AvgTeamSize = float64(totalMembers) / float64(report.TeamStats.TotalTeams)
		report.TeamStats.TeamsWithPlan = int64(teamsWithPlan)
		report.TeamStats.PlanCoverage = float64(teamsWithPlan) / float64(report.TeamStats.TotalTeams) * 100
	}

	// Preplan stats
	var preplans []models.PrePlan
	db.Where("competition_id = ?", comp.ID).Find(&preplans)
	report.PrePlanStats.Total = int64(len(preplans))
	scoreSum := 0
	scoreCount := 0
	for _, p := range preplans {
		switch p.Status {
		case models.PrePlanStatusDraft:
			report.PrePlanStats.Draft++
		case models.PrePlanStatusSubmitted:
			report.PrePlanStats.Submitted++
		case models.PrePlanStatusReviewed:
			report.PrePlanStats.Reviewed++
		case models.PrePlanStatusApproved:
			report.PrePlanStats.Approved++
		case models.PrePlanStatusRejected:
			report.PrePlanStats.Rejected++
		}
		if p.AIReviewScore != nil {
			scoreSum += *p.AIReviewScore
			scoreCount++
		}
	}
	if scoreCount > 0 {
		report.PrePlanStats.AvgAIScore = float64(scoreSum) / float64(scoreCount)
	}
	reviewedTotal := report.PrePlanStats.Approved + report.PrePlanStats.Rejected
	if reviewedTotal > 0 {
		report.PrePlanStats.ApprovalRate = float64(report.PrePlanStats.Approved) / float64(reviewedTotal) * 100
	}

	// Award stats
	var awards []models.Award
	db.Where("competition_id = ?", comp.ID).Find(&awards)
	report.AwardStats.TotalAwards = int64(len(awards))
	for _, a := range awards {
		report.AwardStats.TotalPrize += a.PrizeAmount
		if a.Status == models.AwardStatusSettled {
			report.AwardStats.Settled++
		} else {
			report.AwardStats.Pending++
		}
	}
	if report.AwardStats.TotalAwards > 0 {
		report.AwardStats.AvgPrize = report.AwardStats.TotalPrize / float64(report.AwardStats.TotalAwards)
		report.AwardStats.SettlementRate = float64(report.AwardStats.Settled) / float64(report.AwardStats.TotalAwards) * 100
	}

	// Milestone stats
	var milestones []models.Milestone
	db.Where("competition_id = ?", comp.ID).Order("sort_order ASC").Find(&milestones)
	report.MilestoneStats.Total = int64(len(milestones))
	for _, m := range milestones {
		switch m.Status {
		case models.MilestoneStatusCompleted:
			report.MilestoneStats.Completed++
		case models.MilestoneStatusInProgress:
			report.MilestoneStats.InProgress++
		case models.MilestoneStatusPending:
			report.MilestoneStats.Pending++
		}
	}
	if report.MilestoneStats.Total > 0 {
		report.MilestoneStats.Progress = float64(report.MilestoneStats.Completed) / float64(report.MilestoneStats.Total) * 100
	}

	// Engagement metrics
	var totalStudents int64
	db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
	if totalStudents > 0 {
		uniqueRegistrants := int64(len(regs))
		report.Engagement.ParticipationRate = float64(uniqueRegistrants) / float64(totalStudents) * 100
	}
	if report.RegistrationStats.Total > 0 {
		report.Engagement.TeamFormationRate = float64(report.TeamStats.TotalTeams) / float64(report.RegistrationStats.Total) * 100
		report.Engagement.PreplanSubmitRate = float64(report.PrePlanStats.Total) / float64(report.RegistrationStats.Total) * 100
	}
	if report.TeamStats.TotalTeams > 0 {
		report.Engagement.AwardRate = float64(report.AwardStats.TotalAwards) / float64(report.TeamStats.TotalTeams) * 100
	}

	// Timeline — merge milestones + competition dates
	report.Timeline = []TimelineEvent{}
	if !comp.StartDate.IsZero() {
		report.Timeline = append(report.Timeline, TimelineEvent{
			Date:  comp.StartDate,
			Type:  "competition",
			Title: "赛事开始",
		})
	}
	if !comp.EndDate.IsZero() {
		report.Timeline = append(report.Timeline, TimelineEvent{
			Date:  comp.EndDate,
			Type:  "competition",
			Title: "赛事结束",
		})
	}
	for _, m := range milestones {
		report.Timeline = append(report.Timeline, TimelineEvent{
			Date:        m.DueDate,
			Type:        m.Type,
			Title:       m.Title,
			Description: m.Description,
		})
	}
	for _, a := range awards {
		report.Timeline = append(report.Timeline, TimelineEvent{
			Date:  a.NominatedAt,
			Type:  "award",
			Title: "奖项提名: " + a.PrizeName,
		})
	}

	c.JSON(http.StatusOK, report)
}

// GenerateReportHTML handles GET /competitions/:id/report/html — renders a styled HTML report.
func (h *ReportHandler) GenerateReportHTML(c *gin.Context) {
	id := c.Param("id")
	db := database.GetDB()

	var comp models.Competition
	if err := db.First(&comp, id).Error; err != nil {
		c.Data(http.StatusNotFound, "text/html; charset=utf-8", []byte("<h1>404 Not Found</h1>"))
		return
	}

	var organizer models.User
	db.First(&organizer, comp.OrganizerID)

	// Registration stats
	var regs []models.CompetitionRegistration
	db.Where("competition_id = ?", comp.ID).Find(&regs)
	regApproved, regPending, regRejected := 0, 0, 0
	for _, r := range regs {
		switch r.Status {
		case models.RegStatusApproved:
			regApproved++
		case models.RegStatusPending:
			regPending++
		case models.RegStatusRejected:
			regRejected++
		}
	}

	// Team stats
	var teams []models.Team
	db.Where("competition_id = ?", comp.ID).Find(&teams)
	totalMembers := 0
	for _, t := range teams {
		var mc int64
		db.Model(&models.TeamMember{}).Where("team_id = ?", t.ID).Count(&mc)
		totalMembers += int(mc)
	}

	// Award stats
	var awards []models.Award
	db.Where("competition_id = ?", comp.ID).Find(&awards)
	totalPrize := 0.0
	for _, a := range awards {
		totalPrize += a.PrizeAmount
	}

	// Milestone stats
	var milestones []models.Milestone
	db.Where("competition_id = ?", comp.ID).Order("sort_order ASC").Find(&milestones)
	mCompleted := 0
	for _, m := range milestones {
		if m.Status == models.MilestoneStatusCompleted {
			mCompleted++
		}
	}

	// Preplan stats
	var preplans []models.PrePlan
	db.Where("competition_id = ?", comp.ID).Find(&preplans)

	typeName := map[string]string{
		"innovation": "创新创业", "hackathon": "黑客马拉松", "academic": "学术竞赛",
		"design": "设计竞赛", "programming": "编程竞赛", "other": "其他",
	}[comp.Type]
	if typeName == "" {
	typeName = comp.Type
	}

	statusName := map[string]string{
		"draft": "草稿", "published": "已发布", "ongoing": "进行中",
		"completed": "已完成", "cancelled": "已取消",
	}[comp.Status]
	if statusName == "" {
		statusName = comp.Status
	}

	html := `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>` + comp.Title + ` — 赛事报告</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "Noto Sans SC", "PingFang SC", sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
  .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
  .header { text-align: center; margin-bottom: 40px; }
  .header h1 { font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
  .header .meta { color: #64748b; font-size: 14px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge-teal { background: #ccfbf1; color: #0f766e; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-purple { background: #ede9fe; color: #6d28d9; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
  .card .label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .card .value { font-size: 28px; font-weight: 700; color: #0f172a; }
  .card .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
  .section h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  th { color: #64748b; font-weight: 500; font-size: 12px; text-transform: uppercase; }
  .progress-bar { width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #0ea5e9, #06b6d4); border-radius: 4px; }
  .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  @media print { body { background: #fff; } .container { padding: 20px; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>` + comp.Title + `</h1>
    <div class="meta">
      <span class="badge badge-teal">` + typeName + `</span>
      <span class="badge badge-amber">` + statusName + `</span>
      ` + func() string {
		if comp.Level != "" {
			return `<span class="badge badge-purple">` + comp.Level + `</span>`
		}
		return ""
	}() + `
      &nbsp;·&nbsp; 主办方: ` + organizer.Username + `
      &nbsp;·&nbsp; ` + comp.StartDate.Format("2006-01-02") + ` ~ ` + comp.EndDate.Format("2006-01-02") + `
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="label">报名人数</div>
      <div class="value">` + fmt.Sprintf("%d", len(regs)) + `</div>
      <div class="sub">通过 ` + fmt.Sprintf("%d", regApproved) + ` · 待审 ` + fmt.Sprintf("%d", regPending) + `</div>
    </div>
    <div class="card">
      <div class="label">参赛团队</div>
      <div class="value">` + fmt.Sprintf("%d", len(teams)) + `</div>
      <div class="sub">成员 ` + fmt.Sprintf("%d", totalMembers) + ` 人</div>
    </div>
    <div class="card">
      <div class="label">提交预案</div>
      <div class="value">` + fmt.Sprintf("%d", len(preplans)) + `</div>
      <div class="sub">AI 已评审</div>
    </div>
    <div class="card">
      <div class="label">获奖总数</div>
      <div class="value">` + fmt.Sprintf("%d", len(awards)) + `</div>
      <div class="sub">奖金 ¥` + fmt.Sprintf("%.0f", totalPrize) + `</div>
    </div>
  </div>

  <div class="section">
    <h2>📊 里程碑进度</h2>
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
        <span>` + fmt.Sprintf("%d/%d 已完成", mCompleted, len(milestones)) + `</span>
        <span>` + func() string {
			if len(milestones) > 0 {
				return fmt.Sprintf("%.0f%%", float64(mCompleted)/float64(len(milestones))*100)
			}
			return "0%"
		}() + `</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:` + func() string {
			if len(milestones) > 0 {
				return fmt.Sprintf("%.0f", float64(mCompleted)/float64(len(milestones))*100)
			}
			return "0"
		}() + `%"></div>
      </div>
    </div>
    <table>
      <tr><th>里程碑</th><th>类型</th><th>截止日期</th><th>状态</th></tr>` + func() string {
		rows := ""
		for _, m := range milestones {
			status := "待开始"
			if m.Status == models.MilestoneStatusCompleted {
				status = "✅ 已完成"
			} else if m.Status == models.MilestoneStatusInProgress {
				status = "🔄 进行中"
			}
			rows += "<tr><td>" + m.Title + "</td><td>" + m.Type + "</td><td>" + m.DueDate.Format("2006-01-02") + "</td><td>" + status + "</td></tr>"
		}
		return rows
	}() + `
    </table>
  </div>

  <div class="section">
    <h2>🏆 获奖清单</h2>
    <table>
      <tr><th>奖项</th><th>团队</th><th>奖金</th><th>状态</th></tr>` + func() string {
		rows := ""
		for _, a := range awards {
			status := "待结算"
			if a.Status == models.AwardStatusSettled {
				status = "✅ 已结算"
			}
			rows += "<tr><td>" + a.PrizeName + "</td><td>" + fmt.Sprintf("Team #%d", a.TeamID) + "</td><td>¥" + fmt.Sprintf("%.0f", a.PrizeAmount) + "</td><td>" + status + "</td></tr>"
		}
		return rows
	}() + `
    </table>
  </div>

  <div class="section">
    <h2>📈 参与指标</h2>
    <div class="grid" style="grid-template-columns: repeat(2, 1fr);">` + func() string {
		totalStudents := int64(0)
		db.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
		partRate := 0.0
		if totalStudents > 0 {
			partRate = float64(len(regs)) / float64(totalStudents) * 100
		}
		teamRate := 0.0
		if len(regs) > 0 {
			teamRate = float64(len(teams)) / float64(len(regs)) * 100
		}
		awardRate := 0.0
		if len(teams) > 0 {
			awardRate = float64(len(awards)) / float64(len(teams)) * 100
		}
		return fmt.Sprintf(`
      <div class="card"><div class="label">参与率</div><div class="value">%.1f%%</div><div class="sub">%d/%d 学生</div></div>
      <div class="card"><div class="label">组队率</div><div class="value">%.1f%%</div><div class="sub">%d 团队/%d 报名</div></div>
      <div class="card"><div class="label">获奖率</div><div class="value">%.1f%%</div><div class="sub">%d 奖项/%d 团队</div></div>
      <div class="card"><div class="label">预案覆盖率</div><div class="value">%s</div><div class="sub">%d 预案</div></div>`,
			partRate, len(regs), totalStudents,
			teamRate, len(teams), len(regs),
			awardRate, len(awards), len(teams),
			func() string {
				if len(teams) > 0 {
					return fmt.Sprintf("%.0f%%", float64(len(preplans))/float64(len(teams))*100)
				}
				return "0%"
			}(), len(preplans))
	}() + `
    </div>
  </div>

  <div class="footer">
    <p>SSGL 竞赛知识库平台 · 报告生成于 ` + time.Now().Format("2006-01-02 15:04:05") + `</p>
  </div>
</div>
</body>
</html>`

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}
