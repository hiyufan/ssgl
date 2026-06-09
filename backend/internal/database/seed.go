package database

import (
	"log"
	"time"

	"github.com/ssgl/competition-platform/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// Seed populates the database with initial test data.
// It skips seeding if users already exist.
func Seed() {
	db := GetDB()

	// Check if already seeded.
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount > 0 {
		log.Println("database already seeded, skipping")
		return
	}

	log.Println("seeding database...")

	// Hash the common password.
	hashed, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash seed password: %v", err)
	}
	pw := string(hashed)

	// --- Users ---
	users := []models.User{
		{Username: "liuzy", Email: "liuzy@example.com", Password: pw, Role: models.RoleAdmin, Name: "刘志远", Status: models.StatusActive},
		{Username: "wangjg", Email: "wangjg@example.com", Password: pw, Role: models.RoleTeacher, Name: "王建国", Dept: "计算机学院", Status: models.StatusActive},
		{Username: "chenxm", Email: "chenxm@example.com", Password: pw, Role: models.RoleTeacher, Name: "陈晓明", Dept: "计算机学院", Status: models.StatusActive},
		{Username: "limy", Email: "limy@example.com", Password: pw, Role: models.RoleTeacher, Name: "李明远", Dept: "信息学院", Status: models.StatusActive},
		{Username: "zhangm", Email: "zhangm@example.com", Password: pw, Role: models.RoleStudent, Name: "张明", StudentNo: "2021001", Dept: "计算机学院", Status: models.StatusActive},
		{Username: "liyun", Email: "liyun@example.com", Password: pw, Role: models.RoleStudent, Name: "李云", StudentNo: "2021002", Dept: "计算机学院", Status: models.StatusActive},
		{Username: "zhaox", Email: "zhaox@example.com", Password: pw, Role: models.RoleStudent, Name: "赵雪", StudentNo: "2021003", Dept: "信息学院", Status: models.StatusActive},
		{Username: "chenyu", Email: "chenyu@example.com", Password: pw, Role: models.RoleStudent, Name: "陈宇", StudentNo: "2021004", Dept: "信息学院", Status: models.StatusActive},
	}
	for i := range users {
		if err := db.Create(&users[i]).Error; err != nil {
			log.Fatalf("failed to seed user %s: %v", users[i].Username, err)
		}
	}

	// Convenience references (IDs are auto-populated after Create).
	_ = users[0] // admin (liuzy)
	teacherWang := users[1]
	teacherChen := users[2]
	studentZhang := users[4]
	studentLi := users[5]
	studentZhao := users[6]
	studentChen := users[7]

	// --- Competitions ---
	now := time.Now()
	competitions := []models.Competition{
		{
			Title:       "华为ICT大赛",
			Description: "华为信息与通信技术大赛，面向全球大学生的ICT赛事",
			Type:        models.CompTypeInnovation,
			Status:      models.CompStatusPublished,
			MaxTeamSize: 4,
			MinTeamSize: 2,
			StartDate:   now.AddDate(0, 1, 0),
			EndDate:     now.AddDate(0, 3, 0),
			Location:    "深圳",
			OrganizerID: teacherWang.ID,
			Prize:       "一等奖奖金10万元",
			Tags:        "ICT,华为,通信",
		},
		{
			Title:       "互联网+大学生创新创业大赛",
			Description: "中国互联网+大学生创新创业大赛，激发大学生创造力",
			Type:        models.CompTypeInnovation,
			Status:      models.CompStatusPublished,
			MaxTeamSize: 5,
			MinTeamSize: 3,
			StartDate:   now.AddDate(0, 2, 0),
			EndDate:     now.AddDate(0, 5, 0),
			Location:    "北京",
			OrganizerID: teacherChen.ID,
			Prize:       "金奖奖金20万元",
			Tags:        "创新创业,互联网+",
		},
	}
	for i := range competitions {
		if err := db.Create(&competitions[i]).Error; err != nil {
			log.Fatalf("failed to seed competition %s: %v", competitions[i].Title, err)
		}
	}

	huaweiComp := competitions[0]
	internetComp := competitions[1]

	// --- Teams ---
	teams := []models.Team{
		{
			Name:          "华为先锋队",
			CompetitionID: huaweiComp.ID,
			LeaderID:      studentZhang.ID,
			Status:        models.TeamStatusActive,
		},
		{
			Name:          "互联网创新组",
			CompetitionID: internetComp.ID,
			LeaderID:      studentZhao.ID,
			Status:        models.TeamStatusActive,
		},
	}
	for i := range teams {
		if err := db.Create(&teams[i]).Error; err != nil {
			log.Fatalf("failed to seed team %s: %v", teams[i].Name, err)
		}
	}

	huaweiTeam := teams[0]
	internetTeam := teams[1]

	// --- Team Members ---
	members := []models.TeamMember{
		// Huawei team: zhangm (leader), liyun
		{TeamID: huaweiTeam.ID, UserID: studentZhang.ID, Role: models.TeamMemberRoleLeader, JoinedAt: now},
		{TeamID: huaweiTeam.ID, UserID: studentLi.ID, Role: models.TeamMemberRoleMember, JoinedAt: now},
		// Internet+ team: zhaox (leader), chenyu
		{TeamID: internetTeam.ID, UserID: studentZhao.ID, Role: models.TeamMemberRoleLeader, JoinedAt: now},
		{TeamID: internetTeam.ID, UserID: studentChen.ID, Role: models.TeamMemberRoleMember, JoinedAt: now},
	}
	for i := range members {
		if err := db.Create(&members[i]).Error; err != nil {
			log.Fatalf("failed to seed team member: %v", err)
		}
	}

	log.Println("database seeding completed")
}
