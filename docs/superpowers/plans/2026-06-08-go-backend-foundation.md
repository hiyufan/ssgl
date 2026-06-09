# Go Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Go backend foundation with auth, database, and core CRUD APIs that the existing React frontend can connect to.

**Architecture:** Go monolith using Gin framework, PostgreSQL + pgvector for data storage, Redis for caching/sessions, JWT for auth. The backend exposes REST APIs that match the frontend's expected data structures.

**Tech Stack:** Go 1.22+, Gin, GORM, PostgreSQL 15+, pgvector, Redis, JWT (golang-jwt), bcrypt

---

## File Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point, server startup
├── internal/
│   ├── config/
│   │   └── config.go               # Configuration loading
│   ├── database/
│   │   ├── database.go             # DB connection setup
│   │   ├── migrate.go              # Auto-migration
│   │   └── seed.go                 # Seed data (from frontend mock)
│   ├── middleware/
│   │   ├── auth.go                 # JWT auth middleware
│   │   ├── cors.go                 # CORS middleware
│   │   └── rbac.go                 # Role-based access control
│   ├── models/
│   │   ├── user.go                 # User model
│   │   ├── competition.go          # Competition model
│   │   ├── team.go                 # Team + TeamMember models
│   │   ├── workflow.go             # ApprovalWorkflow + ApprovalStep models
│   │   ├── preplan.go              # PrePlan model
│   │   ├── execution_plan.go       # ExecutionPlan model
│   │   ├── award.go                # Award model
│   │   ├── evaluation.go           # StudentEvaluation model
│   │   ├── notification.go         # Notification model
│   │   └── ai_analysis.go          # AIAnalysisLog model
│   ├── handlers/
│   │   ├── auth.go                 # Login, register, refresh
│   │   ├── user.go                 # User CRUD
│   │   ├── competition.go          # Competition CRUD
│   │   ├── team.go                 # Team management
│   │   ├── workflow.go             # Workflow engine
│   │   ├── preplan.go              # Pre-plan management
│   │   ├── award.go                # Award management
│   │   ├── evaluation.go           # Student evaluation
│   │   ├── stats.go                # Statistics
│   │   └── ai_tools.go             # AI tools proxy
│   ├── services/
│   │   ├── auth_service.go         # Auth business logic
│   │   ├── workflow_service.go     # Workflow engine logic
│   │   └── stats_service.go        # Statistics aggregation
│   └── router/
│       └── router.go               # Route definitions
├── go.mod
├── go.sum
├── .env                            # Environment variables
├── docker-compose.yml              # PostgreSQL + Redis
└── Makefile                        # Common commands
```

---

## Task 1: Project Setup & Docker Compose

**Files:**
- Create: `backend/go.mod`
- Create: `backend/.env`
- Create: `backend/docker-compose.yml`
- Create: `backend/Makefile`

- [ ] **Step 1: Initialize Go module**

```bash
cd D:\Code\ssgl\backend
go mod init github.com/ssgl/competition-platform
```

- [ ] **Step 2: Create .env file**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ssgl
DB_SSLMODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=2h
JWT_REFRESH_EXPIRY=168h

# Server
SERVER_PORT=8080
SERVER_MODE=debug

# AI Service (Python)
AI_SERVICE_URL=http://localhost:8000
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg15
    container_name: ssgl-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ssgl
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ssgl-redis
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

- [ ] **Step 4: Create Makefile**

```makefile
.PHONY: run dev test db-up db-down seed

# Run the server
run:
	go run cmd/server/main.go

# Run with hot reload (requires air)
dev:
	air -c .air.toml

# Run tests
test:
	go test ./... -v

# Start database services
db-up:
	docker compose up -d

# Stop database services
db-down:
	docker compose down

# Seed database with mock data
seed:
	go run cmd/server/main.go --seed

# Build binary
build:
	go build -o bin/server cmd/server/main.go
```

- [ ] **Step 5: Start database services**

```bash
cd D:\Code\ssgl\backend
docker compose up -d
```

Expected: PostgreSQL and Redis containers running.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "chore: initialize Go backend with Docker Compose"
```

---

## Task 2: Configuration & Database Connection

**Files:**
- Create: `backend/internal/config/config.go`
- Create: `backend/internal/database/database.go`

- [ ] **Step 1: Install dependencies**

```bash
cd D:\Code\ssgl\backend
go get github.com/gin-gonic/gin
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/redis/go-redis/v9
go get github.com/joho/godotenv
go get github.com/golang-jwt/jwt/v5
golang.org/x/crypto
```

- [ ] **Step 2: Create config.go**

```go
package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DB    DBConfig
	Redis RedisConfig
	JWT   JWTConfig
	Server ServerConfig
	AI    AIConfig
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
}

type JWTConfig struct {
	Secret        string
	Expiry        time.Duration
	RefreshExpiry time.Duration
}

type ServerConfig struct {
	Port string
	Mode string
}

type AIConfig struct {
	ServiceURL string
}

func Load() *Config {
	godotenv.Load()

	return &Config{
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			Name:     getEnv("DB_NAME", "ssgl"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
		},
		JWT: JWTConfig{
			Secret:        getEnv("JWT_SECRET", "default-secret"),
			Expiry:        parseDuration(getEnv("JWT_EXPIRY", "2h")),
			RefreshExpiry: parseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h")),
		},
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
			Mode: getEnv("SERVER_MODE", "debug"),
		},
		AI: AIConfig{
			ServiceURL: getEnv("AI_SERVICE_URL", "http://localhost:8000"),
		},
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return 2 * time.Hour
	}
	return d
}

func (c *DBConfig) DSN() string {
	return "host=" + c.Host +
		" port=" + c.Port +
		" user=" + c.User +
		" password=" + c.Password +
		" dbname=" + c.Name +
		" sslmode=" + c.SSLMode
}
```

- [ ] **Step 3: Create database.go**

```go
package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/ssgl/competition-platform/internal/config"
)

var DB *gorm.DB

func Connect(cfg *config.DBConfig) {
	var err error
	DB, err = gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Failed to get database instance:", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	fmt.Println("✅ Database connected")
}

func GetDB() *gorm.DB {
	return DB
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/config backend/internal/database
git commit -m "feat: add config and database connection"
```

---

## Task 3: User Model & Auth System

**Files:**
- Create: `backend/internal/models/user.go`
- Create: `backend/internal/middleware/auth.go`
- Create: `backend/internal/middleware/cors.go`
- Create: `backend/internal/middleware/rbac.go`
- Create: `backend/internal/services/auth_service.go`
- Create: `backend/internal/handlers/auth.go`

- [ ] **Step 1: Create user model**

```go
package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Username  string         `json:"username" gorm:"uniqueIndex;size:50;not null"`
	Email     string         `json:"email" gorm:"uniqueIndex;size:100;not null"`
	Password  string         `json:"-" gorm:"size:255;not null"`
	Role      string         `json:"role" gorm:"size:20;not null;default:student"`
	Name      string         `json:"name" gorm:"size:50;not null"`
	Avatar    string         `json:"avatar" gorm:"size:10"`
	Phone     string         `json:"phone" gorm:"size:20"`
	Dept      string         `json:"dept" gorm:"size:100"`
	StudentID string         `json:"student_id" gorm:"size:30"`
	Status    string         `json:"status" gorm:"size:20;default:active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (User) TableName() string {
	return "users"
}

// Role constants
const (
	RoleStudent = "student"
	RoleTeacher = "teacher"
	RoleAdmin   = "admin"
)

// Status constants
const (
	StatusActive   = "active"
	StatusDisabled = "disabled"
)
```

- [ ] **Step 2: Create auth service**

```go
package services

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/models"
)

type AuthService struct {
	db  *gorm.DB
	cfg *config.JWTConfig
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Claims struct {
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func NewAuthService(db *gorm.DB, cfg *config.JWTConfig) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

func (s *AuthService) Register(username, email, password, role, name string) (*models.User, error) {
	// Check if user exists
	var count int64
	s.db.Model(&models.User{}).Where("username = ? OR email = ?", username, email).Count(&count)
	if count > 0 {
		return nil, errors.New("username or email already exists")
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username: username,
		Email:    email,
		Password: string(hash),
		Role:     role,
		Name:     name,
		Avatar:   string([]rune(name)[0:1]),
		Status:   StatusActive,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

func (s *AuthService) Login(username, password string) (*TokenPair, *models.User, error) {
	var user models.User
	if err := s.db.Where("username = ? OR email = ?", username, username).First(&user).Error; err != nil {
		return nil, nil, errors.New("invalid credentials")
	}

	if user.Status != StatusActive {
		return nil, nil, errors.New("account is disabled")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return nil, nil, errors.New("invalid credentials")
	}

	tokens, err := s.generateTokenPair(user.ID, user.Role)
	if err != nil {
		return nil, nil, err
	}

	return tokens, &user, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (*TokenPair, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.Secret), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}

	return s.generateTokenPair(claims.UserID, claims.Role)
}

func (s *AuthService) generateTokenPair(userID uint, role string) (*TokenPair, error) {
	now := time.Now()

	// Access token
	accessClaims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.Expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessStr, err := accessToken.SignedString([]byte(s.cfg.Secret))
	if err != nil {
		return nil, err
	}

	// Refresh token
	refreshClaims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.RefreshExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshStr, err := refreshToken.SignedString([]byte(s.cfg.Secret))
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessStr,
		RefreshToken: refreshStr,
		ExpiresIn:    int64(s.cfg.Expiry.Seconds()),
	}, nil
}

func (s *AuthService) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
```

- [ ] **Step 3: Create auth middleware**

```go
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/services"
)

func AuthMiddleware(cfg *config.JWTConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &services.Claims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.Secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}
```

- [ ] **Step 4: Create CORS middleware**

```go
package middleware

import (
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
```

- [ ] **Step 5: Create RBAC middleware**

```go
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Role not found"})
			c.Abort()
			return
		}

		roleStr := role.(string)
		for _, r := range roles {
			if r == roleStr {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		c.Abort()
	}
}
```

- [ ] **Step 6: Create auth handler**

```go
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
)

type AuthHandler struct {
	authService *services.AuthService
	db          *gorm.DB
}

func NewAuthHandler(db *gorm.DB, cfg *config.JWTConfig) *AuthHandler {
	return &AuthHandler{
		authService: services.NewAuthService(db, cfg),
		db:          db,
	}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required,oneof=student teacher admin"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.authService.Register(req.Username, req.Email, req.Password, req.Role, req.Name)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful",
		"user":    user,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, user, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tokens": tokens,
		"user":   user,
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tokens": tokens})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}
```

- [ ] **Step 7: Commit**

```bash
git add backend/internal/models backend/internal/middleware backend/internal/services backend/internal/handlers
git commit -m "feat: add user model, auth service, and auth handlers"
```

---

## Task 4: Competition Model & CRUD

**Files:**
- Create: `backend/internal/models/competition.go`
- Create: `backend/internal/handlers/competition.go`

- [ ] **Step 1: Create competition model**

```go
package models

import (
	"time"

	"gorm.io/gorm"
)

type Competition struct {
	ID                   uint           `json:"id" gorm:"primaryKey"`
	Title                string         `json:"title" gorm:"size:200;not null"`
	Description          string         `json:"description" gorm:"type:text"`
	Type                 string         `json:"type" gorm:"size:30;not null"`
	Status               string         `json:"status" gorm:"size:20;default:draft"`
	MaxTeamSize          int            `json:"max_team_size" gorm:"default:5"`
	MinTeamSize          int            `json:"min_team_size" gorm:"default:2"`
	RegistrationDeadline time.Time      `json:"registration_deadline"`
	StartDate            time.Time      `json:"start_date"`
	EndDate              time.Time      `json:"end_date"`
	Location             string         `json:"location" gorm:"size:200"`
	OrganizerID          uint           `json:"organizer_id"`
	RulesDocURL          string         `json:"rules_doc_url" gorm:"size:500"`
	Prize                string         `json:"prize" gorm:"size:200"`
	Tags                 string         `json:"tags" gorm:"size:500"` // JSON array as string
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Organizer User `json:"organizer" gorm:"foreignKey:OrganizerID"`
}

func (Competition) TableName() string {
	return "competitions"
}

// Competition status constants
const (
	CompStatusDraft     = "draft"
	CompStatusPublished = "published"
	CompStatusOngoing   = "ongoing"
	CompStatusCompleted = "completed"
	CompStatusCancelled = "cancelled"
)

// Competition type constants
const (
	CompTypeHackathon  = "hackathon"
	CompTypeInnovation = "innovation"
	CompTypeResearch   = "research"
)
```

- [ ] **Step 2: Create competition handler**

```go
package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/models"
)

type CompetitionHandler struct {
	db *gorm.DB
}

func NewCompetitionHandler(db *gorm.DB) *CompetitionHandler {
	return &CompetitionHandler{db: db}
}

type CreateCompetitionRequest struct {
	Title                string   `json:"title" binding:"required"`
	Description          string   `json:"description"`
	Type                 string   `json:"type" binding:"required,oneof=hackathon innovation research"`
	MaxTeamSize          int      `json:"max_team_size" binding:"required,min=2,max=10"`
	MinTeamSize          int      `json:"min_team_size" binding:"required,min=1"`
	RegistrationDeadline string   `json:"registration_deadline" binding:"required"`
	StartDate            string   `json:"start_date" binding:"required"`
	EndDate              string   `json:"end_date" binding:"required"`
	Location             string   `json:"location"`
	Prize                string   `json:"prize"`
	Tags                 []string `json:"tags"`
}

func (h *CompetitionHandler) List(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	query := h.db.Model(&models.Competition{})

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("title LIKE ?", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var competitions []models.Competition
	query.Offset((page - 1) * pageSize).Limit(pageSize).
		Order("created_at DESC").
		Preload("Organizer").
		Find(&competitions)

	c.JSON(http.StatusOK, gin.H{
		"competitions": competitions,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
	})
}

func (h *CompetitionHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var comp models.Competition
	if err := h.db.Preload("Organizer").First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Competition not found"})
		return
	}

	// Get teams count
	var teamsCount int64
	h.db.Model(&models.Team{}).Where("competition_id = ?", comp.ID).Count(&teamsCount)

	c.JSON(http.StatusOK, gin.H{
		"competition": comp,
		"teams_count": teamsCount,
	})
}

func (h *CompetitionHandler) Create(c *gin.Context) {
	var req CreateCompetitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("user_id").(uint)

	comp := &models.Competition{
		Title:       req.Title,
		Description: req.Description,
		Type:        req.Type,
		Status:      models.CompStatusDraft,
		MaxTeamSize: req.MaxTeamSize,
		MinTeamSize: req.MinTeamSize,
		Location:    req.Location,
		OrganizerID: userID,
		Prize:       req.Prize,
	}

	if err := h.db.Create(comp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create competition"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"competition": comp})
}

func (h *CompetitionHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var comp models.Competition
	if err := h.db.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Competition not found"})
		return
	}

	var req CreateCompetitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comp.Title = req.Title
	comp.Description = req.Description
	comp.Type = req.Type
	comp.MaxTeamSize = req.MaxTeamSize
	comp.MinTeamSize = req.MinTeamSize
	comp.Location = req.Location
	comp.Prize = req.Prize

	if err := h.db.Save(&comp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update competition"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"competition": comp})
}

func (h *CompetitionHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.Delete(&models.Competition{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete competition"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Competition deleted"})
}

func (h *CompetitionHandler) Publish(c *gin.Context) {
	id := c.Param("id")

	var comp models.Competition
	if err := h.db.First(&comp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Competition not found"})
		return
	}

	if comp.Status != models.CompStatusDraft {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only draft competitions can be published"})
		return
	}

	comp.Status = models.CompStatusPublished
	h.db.Save(&comp)

	c.JSON(http.StatusOK, gin.H{"competition": comp})
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/models/competition.go backend/internal/handlers/competition.go
git commit -m "feat: add competition model and CRUD handlers"
```

---

## Task 5: Team Model & Management

**Files:**
- Create: `backend/internal/models/team.go`
- Create: `backend/internal/handlers/team.go`

- [ ] **Step 1: Create team model**

```go
package models

import (
	"time"

	"gorm.io/gorm"
)

type Team struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Name          string         `json:"name" gorm:"size:100;not null"`
	CompetitionID uint           `json:"comp_id" gorm:"not null"`
	LeaderID      uint           `json:"leader_id" gorm:"not null"`
	Status        string         `json:"status" gorm:"size:20;default:active"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Competition Competition  `json:"competition" gorm:"foreignKey:CompetitionID"`
	Leader      User         `json:"leader" gorm:"foreignKey:LeaderID"`
	Members     []TeamMember `json:"members" gorm:"foreignKey:TeamID"`
}

func (Team) TableName() string {
	return "teams"
}

type TeamMember struct {
	ID       uint      `json:"id" gorm:"primaryKey"`
	TeamID   uint      `json:"team_id" gorm:"not null"`
	UserID   uint      `json:"user_id" gorm:"not null"`
	Role     string    `json:"role" gorm:"size:20;default:member"`
	JoinedAt time.Time `json:"joined_at" gorm:"autoCreateTime"`

	// Relations
	Team Team `json:"-" gorm:"foreignKey:TeamID"`
	User User `json:"user" gorm:"foreignKey:UserID"`
}

func (TeamMember) TableName() string {
	return "team_members"
}

// Team status
const (
	TeamStatusActive    = "active"
	TeamStatusCompleted = "completed"
)
```

- [ ] **Step 2: Create team handler**

```go
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/models"
)

type TeamHandler struct {
	db *gorm.DB
}

func NewTeamHandler(db *gorm.DB) *TeamHandler {
	return &TeamHandler{db: db}
}

type CreateTeamRequest struct {
	Name          string `json:"name" binding:"required"`
	CompetitionID uint   `json:"comp_id" binding:"required"`
}

func (h *TeamHandler) List(c *gin.Context) {
	role := c.MustGet("role").(string)
	userID := c.MustGet("user_id").(uint)

	query := h.db.Model(&models.Team{})

	switch role {
	case "student":
		// Only show teams the student is a member of
		query = query.Joins("INNER JOIN team_members ON team_members.team_id = teams.id").
			Where("team_members.user_id = ?", userID)
	case "teacher":
		// Show teams where teacher is the mentor (we'll add teacher_id later)
		// For now, show all
	default:
		// Admin sees all
	}

	compID := c.Query("comp_id")
	if compID != "" {
		query = query.Where("competition_id = ?", compID)
	}

	var teams []models.Team
	query.Preload("Competition").Preload("Leader").Preload("Members.User").Find(&teams)

	c.JSON(http.StatusOK, gin.H{"teams": teams})
}

func (h *TeamHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var team models.Team
	if err := h.db.Preload("Competition").Preload("Leader").Preload("Members.User").
		First(&team, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"team": team})
}

func (h *TeamHandler) Create(c *gin.Context) {
	var req CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("user_id").(uint)

	// Check if user already has a team for this competition
	var count int64
	h.db.Model(&models.TeamMember{}).
		Joins("INNER JOIN teams ON teams.id = team_members.team_id").
		Where("team_members.user_id = ? AND teams.competition_id = ?", userID, req.CompetitionID).
		Count(&count)

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "You already have a team for this competition"})
		return
	}

	// Create team
	team := &models.Team{
		Name:          req.Name,
		CompetitionID: req.CompetitionID,
		LeaderID:      userID,
		Status:        models.TeamStatusActive,
	}

	tx := h.db.Begin()

	if err := tx.Create(team).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create team"})
		return
	}

	// Add leader as member
	member := &models.TeamMember{
		TeamID: team.ID,
		UserID: userID,
		Role:   "leader",
	}

	if err := tx.Create(member).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add team member"})
		return
	}

	tx.Commit()

	// Reload team with relations
	h.db.Preload("Competition").Preload("Leader").Preload("Members.User").First(&team, team.ID)

	c.JSON(http.StatusCreated, gin.H{"team": team})
}

func (h *TeamHandler) Join(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("user_id").(uint)

	var team models.Team
	if err := h.db.First(&team, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	// Check if already a member
	var count int64
	h.db.Model(&models.TeamMember{}).Where("team_id = ? AND user_id = ?", team.ID, userID).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Already a member"})
		return
	}

	// Check team size
	var memberCount int64
	h.db.Model(&models.TeamMember{}).Where("team_id = ?", team.ID).Count(&memberCount)

	var comp models.Competition
	h.db.First(&comp, team.CompetitionID)

	if int(memberCount) >= comp.MaxTeamSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Team is full"})
		return
	}

	member := &models.TeamMember{
		TeamID: team.ID,
		UserID: userID,
		Role:   "member",
	}

	if err := h.db.Create(member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join team"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Joined team successfully"})
}

func (h *TeamHandler) Leave(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("user_id").(uint)

	var team models.Team
	if err := h.db.First(&team, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	if team.LeaderID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Leader cannot leave team. Transfer leadership first."})
		return
	}

	if err := h.db.Where("team_id = ? AND user_id = ?", team.ID, userID).Delete(&models.TeamMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave team"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Left team successfully"})
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/models/team.go backend/internal/handlers/team.go
git commit -m "feat: add team model and management handlers"
```

---

## Task 6: Workflow Engine

**Files:**
- Create: `backend/internal/models/workflow.go`
- Create: `backend/internal/services/workflow_service.go`
- Create: `backend/internal/handlers/workflow.go`

- [ ] **Step 1: Create workflow model**

```go
package models

import (
	"time"

	"gorm.io/gorm"
)

type ApprovalWorkflow struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	Type         string         `json:"type" gorm:"size:30;not null"`
	TargetID     uint           `json:"target_id" gorm:"not null"`
	CurrentStep  int            `json:"current_step" gorm:"default:1"`
	TotalSteps   int            `json:"total_steps" gorm:"not null"`
	Status       string         `json:"status" gorm:"size:20;default:pending"`
	SubmitterID  uint           `json:"submitter_id" gorm:"not null"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Submitter User           `json:"submitter" gorm:"foreignKey:SubmitterID"`
	Steps     []ApprovalStep `json:"steps" gorm:"foreignKey:WorkflowID"`
}

func (ApprovalWorkflow) TableName() string {
	return "approval_workflows"
}

type ApprovalStep struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	WorkflowID uint       `json:"workflow_id" gorm:"not null"`
	StepOrder  int        `json:"step_order" gorm:"not null"`
	ApproverID uint       `json:"approver_id" gorm:"not null"`
	Action     string     `json:"action" gorm:"size:20;default:pending"`
	Comment    string     `json:"comment" gorm:"type:text"`
	ActedAt    *time.Time `json:"acted_at"`

	// Relations
	Workflow ApprovalWorkflow `json:"-" gorm:"foreignKey:WorkflowID"`
	Approver User             `json:"approver" gorm:"foreignKey:ApproverID"`
}

func (ApprovalStep) TableName() string {
	return "approval_steps"
}

// Workflow type constants
const (
	WorkflowTypeRegistration = "registration"
	WorkflowTypePrePlan      = "pre_plan"
	WorkflowTypeReward       = "reward"
)

// Workflow status constants
const (
	WorkflowStatusPending  = "pending"
	WorkflowStatusApproved = "approved"
	WorkflowStatusRejected = "rejected"
)

// Step action constants
const (
	StepActionPending  = "pending"
	StepActionApproved = "approved"
	StepActionRejected = "rejected"
	StepActionWaiting  = "waiting"
)
```

- [ ] **Step 2: Create workflow service**

```go
package services

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/models"
)

type WorkflowService struct {
	db *gorm.DB
}

func NewWorkflowService(db *gorm.DB) *WorkflowService {
	return &WorkflowService{db: db}
}

type CreateWorkflowInput struct {
	Type        string
	TargetID    uint
	SubmitterID uint
	Steps       []CreateStepInput
}

type CreateStepInput struct {
	StepOrder  int
	ApproverID uint
}

func (s *WorkflowService) Create(input CreateWorkflowInput) (*models.ApprovalWorkflow, error) {
	workflow := &models.ApprovalWorkflow{
		Type:        input.Type,
		TargetID:    input.TargetID,
		CurrentStep: 1,
		TotalSteps:  len(input.Steps),
		Status:      models.WorkflowStatusPending,
		SubmitterID: input.SubmitterID,
	}

	tx := s.db.Begin()

	if err := tx.Create(workflow).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	for _, step := range input.Steps {
		approvalStep := &models.ApprovalStep{
			WorkflowID: workflow.ID,
			StepOrder:  step.StepOrder,
			ApproverID: step.ApproverID,
			Action:     models.StepActionPending,
		}
		if step.StepOrder > 1 {
			approvalStep.Action = models.StepActionWaiting
		}
		if err := tx.Create(approvalStep).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	tx.Commit()

	// Reload with relations
	s.db.Preload("Submitter").Preload("Steps.Approver").First(&workflow, workflow.ID)

	return workflow, nil
}

func (s *WorkflowService) Approve(workflowID, approverID uint, comment string) error {
	var workflow models.ApprovalWorkflow
	if err := s.db.Preload("Steps").First(&workflow, workflowID).Error; err != nil {
		return errors.New("workflow not found")
	}

	if workflow.Status != models.WorkflowStatusPending {
		return errors.New("workflow is not pending")
	}

	// Find current step
	var currentStep *models.ApprovalStep
	for i := range workflow.Steps {
		if workflow.Steps[i].StepOrder == workflow.CurrentStep {
			currentStep = &workflow.Steps[i]
			break
		}
	}

	if currentStep == nil {
		return errors.New("current step not found")
	}

	if currentStep.ApproverID != approverID {
		return errors.New("you are not the approver for this step")
	}

	now := time.Now()
	currentStep.Action = models.StepActionApproved
	currentStep.Comment = comment
	currentStep.ActedAt = &now

	tx := s.db.Begin()

	if err := tx.Save(currentStep).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Check if this was the last step
	if workflow.CurrentStep >= workflow.TotalSteps {
		workflow.Status = models.WorkflowStatusApproved
	} else {
		// Move to next step
		workflow.CurrentStep++

		// Update next step to pending
		var nextStep models.ApprovalStep
		tx.Where("workflow_id = ? AND step_order = ?", workflow.ID, workflow.CurrentStep).First(&nextStep)
		nextStep.Action = models.StepActionPending
		tx.Save(&nextStep)
	}

	if err := tx.Save(&workflow).Error; err != nil {
		tx.Rollback()
		return err
	}

	tx.Commit()
	return nil
}

func (s *WorkflowService) Reject(workflowID, approverID uint, comment string) error {
	var workflow models.ApprovalWorkflow
	if err := s.db.Preload("Steps").First(&workflow, workflowID).Error; err != nil {
		return errors.New("workflow not found")
	}

	if workflow.Status != models.WorkflowStatusPending {
		return errors.New("workflow is not pending")
	}

	var currentStep *models.ApprovalStep
	for i := range workflow.Steps {
		if workflow.Steps[i].StepOrder == workflow.CurrentStep {
			currentStep = &workflow.Steps[i]
			break
		}
	}

	if currentStep == nil || currentStep.ApproverID != approverID {
		return errors.New("unauthorized")
	}

	now := time.Now()
	currentStep.Action = models.StepActionRejected
	currentStep.Comment = comment
	currentStep.ActedAt = &now
	workflow.Status = models.WorkflowStatusRejected

	tx := s.db.Begin()
	tx.Save(currentStep)
	tx.Save(&workflow)
	tx.Commit()

	return nil
}

func (s *WorkflowService) GetPendingForUser(userID uint, role string) []models.ApprovalWorkflow {
	var workflows []models.ApprovalWorkflow

	query := s.db.Model(&models.ApprovalWorkflow{}).
		Where("status = ?", models.WorkflowStatusPending).
		Preload("Submitter").Preload("Steps.Approver")

	if role == "teacher" {
		query = query.Joins("INNER JOIN approval_steps ON approval_steps.workflow_id = approval_workflows.id").
			Where("approval_steps.approver_id = ? AND approval_steps.action = ?", userID, models.StepActionPending)
	} else if role == "admin" {
		// Admin sees all pending
	}

	query.Find(&workflows)
	return workflows
}
```

- [ ] **Step 3: Create workflow handler**

```go
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/models"
	"github.com/ssgl/competition-platform/internal/services"
)

type WorkflowHandler struct {
	workflowService *services.WorkflowService
	db              *gorm.DB
}

func NewWorkflowHandler(db *gorm.DB) *WorkflowHandler {
	return &WorkflowHandler{
		workflowService: services.NewWorkflowService(db),
		db:              db,
	}
}

func (h *WorkflowHandler) List(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	role := c.MustGet("role").(string)
	tab := c.DefaultQuery("tab", "pending")

	var workflows []models.ApprovalWorkflow
	query := h.db.Model(&models.ApprovalWorkflow{}).Preload("Submitter").Preload("Steps.Approver")

	if tab == "pending" {
		query = query.Where("status = ?", models.WorkflowStatusPending)
		if role == "teacher" {
			query = query.Joins("INNER JOIN approval_steps ON approval_steps.workflow_id = approval_workflows.id").
				Where("approval_steps.approver_id = ? AND approval_steps.action = ?", userID, models.StepActionPending)
		}
	} else {
		query = query.Where("status IN ?", []string{models.WorkflowStatusApproved, models.WorkflowStatusRejected})
	}

	query.Order("created_at DESC").Find(&workflows)

	c.JSON(http.StatusOK, gin.H{"approvals": workflows})
}

func (h *WorkflowHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var workflow models.ApprovalWorkflow
	if err := h.db.Preload("Submitter").Preload("Steps.Approver").First(&workflow, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"approval": workflow})
}

func (h *WorkflowHandler) Approve(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("user_id").(uint)

	var req struct {
		Comment string `json:"comment"`
	}
	c.ShouldBindJSON(&req)

	if err := h.workflowService.Approve(parseUint(id), userID, req.Comment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Approved"})
}

func (h *WorkflowHandler) Reject(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("user_id").(uint)

	var req struct {
		Comment string `json:"comment"`
	}
	c.ShouldBindJSON(&req)

	if err := h.workflowService.Reject(parseUint(id), userID, req.Comment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rejected"})
}

func parseUint(s string) uint {
	var n uint
	for _, c := range s {
		n = n*10 + uint(c-'0')
	}
	return n
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/models/workflow.go backend/internal/services/workflow_service.go backend/internal/handlers/workflow.go
git commit -m "feat: add workflow engine with approval/rejection"
```

---

## Task 7: Remaining Models & Handlers

**Files:**
- Create: `backend/internal/models/preplan.go`
- Create: `backend/internal/models/award.go`
- Create: `backend/internal/models/evaluation.go`
- Create: `backend/internal/models/notification.go`
- Create: `backend/internal/models/ai_analysis.go`
- Create: `backend/internal/handlers/preplan.go`
- Create: `backend/internal/handlers/award.go`
- Create: `backend/internal/handlers/evaluation.go`
- Create: `backend/internal/handlers/stats.go`

- [ ] **Step 1: Create preplan model**

```go
package models

import (
	"time"

	"gorm.io/gorm"
)

type PrePlan struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	CompetitionID   uint           `json:"comp_id" gorm:"not null"`
	TeamID          uint           `json:"team_id" gorm:"not null"`
	Title           string         `json:"title" gorm:"size:200;not null"`
	TechStack       string         `json:"tech_stack" gorm:"type:text"`
	TargetAudience  string         `json:"target_audience" gorm:"type:text"`
	MarketAnalysis  string         `json:"market_analysis" gorm:"type:text"`
	Innovation      string         `json:"innovation" gorm:"type:text"`
	ExpectedOutcome string         `json:"expected_outcome" gorm:"type:text"`
	Timeline        string         `json:"timeline" gorm:"type:text"`
	AIReviewScore   *int           `json:"ai_review_score"`
	AIReviewNotes   string         `json:"ai_review_notes" gorm:"type:text"`
	Status          string         `json:"status" gorm:"size:20;default:draft"`
	SubmittedAt     *time.Time     `json:"submitted_at"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Competition Competition `json:"competition" gorm:"foreignKey:CompetitionID"`
	Team        Team        `json:"team" gorm:"foreignKey:TeamID"`
}

func (PrePlan) TableName() string {
	return "pre_plans"
}

type ExecutionPlan struct {
	ID            uint       `json:"id" gorm:"primaryKey"`
	PrePlanID     uint       `json:"pre_plan_id" gorm:"not null"`
	ActualTech    string     `json:"actual_tech" gorm:"type:text"`
	ActualProgress string    `json:"actual_progress" gorm:"type:text"`
	Deviations    string     `json:"deviations" gorm:"type:text"`
	AIMatchScore  *int       `json:"ai_match_score"`
	SubmittedAt   time.Time  `json:"submitted_at"`

	// Relations
	PrePlan PrePlan `json:"pre_plan" gorm:"foreignKey:PrePlanID"`
}

func (ExecutionPlan) TableName() string {
	return "execution_plans"
}
```

- [ ] **Step 2: Create award model**

```go
package models

import (
	"time"

	"gorm.io/gorm"
)

type Award struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	CompetitionID uint           `json:"comp_id" gorm:"not null"`
	TeamID        uint           `json:"team_id" gorm:"not null"`
	Rank          int            `json:"rank" gorm:"not null"`
	RankName      string         `json:"rank_name" gorm:"size:20"`
	PrizeName     string         `json:"prize_name" gorm:"size:100"`
	PrizeAmount   string         `json:"prize" gorm:"size:50"`
	Status        string         `json:"status" gorm:"size:20;default:pending"`
	NominatedAt   time.Time      `json:"nominated_at"`
	SettledAt     *time.Time     `json:"settled_at"`
	SettledBy     *uint          `json:"settled_by"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Competition Competition `json:"competition" gorm:"foreignKey:CompetitionID"`
	Team        Team        `json:"team" gorm:"foreignKey:TeamID"`
}

func (Award) TableName() string {
	return "awards"
}

const (
	AwardStatusPending         = "pending"
	AwardStatusTeacherConfirm  = "teacher_confirm"
	AwardStatusSettled         = "settled"
)
```

- [ ] **Step 3: Create evaluation model**

```go
package models

import (
	"time"

	"gorm.io/gorm"
)

type StudentEvaluation struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	StudentID     uint      `json:"student_id" gorm:"not null"`
	TeacherID     uint      `json:"teacher_id" gorm:"not null"`
	CompetitionID uint      `json:"comp_id" gorm:"not null"`
	Teaching      int       `json:"teaching" gorm:"not null"`
	Communication int       `json:"communication" gorm:"not null"`
	Availability  int       `json:"availability" gorm:"not null"`
	Overall       int       `json:"overall" gorm:"not null"`
	Feedback      string    `json:"feedback" gorm:"type:text"`
	SubmittedAt   time.Time `json:"submitted_at"`
	Status        string    `json:"status" gorm:"size:20;default:pending"`

	// Relations
	Student     User        `json:"student" gorm:"foreignKey:StudentID"`
	Teacher     User        `json:"teacher" gorm:"foreignKey:TeacherID"`
	Competition Competition `json:"competition" gorm:"foreignKey:CompetitionID"`
}

func (StudentEvaluation) TableName() string {
	return "student_evaluations"
}
```

- [ ] **Step 4: Create notification model**

```go
package models

import (
	"time"
)

type Notification struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"user_id" gorm:"not null"`
	Type      string     `json:"type" gorm:"size:30;not null"`
	Title     string     `json:"title" gorm:"size:100;not null"`
	Message   string     `json:"message" gorm:"type:text"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `json:"created_at"`

	// Relations
	User User `json:"-" gorm:"foreignKey:UserID"`
}

func (Notification) TableName() string {
	return "notifications"
}
```

- [ ] **Step 5: Create AI analysis log model**

```go
package models

import (
	"time"
)

type AIAnalysisLog struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Type       string    `json:"type" gorm:"size:30;not null"`
	InputData  string    `json:"input_data" gorm:"type:text"`
	OutputData string    `json:"output_data" gorm:"type:text"`
	ModelUsed  string    `json:"model_used" gorm:"size:50"`
	TokensUsed int       `json:"tokens_used"`
	Score      *int      `json:"score"`
	CreatedAt  time.Time `json:"created_at"`
}

func (AIAnalysisLog) TableName() string {
	return "ai_analysis_logs"
}
```

- [ ] **Step 6: Create remaining handlers (preplan, award, evaluation, stats)**

```go
// handlers/preplan.go
package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/models"
)

type PrePlanHandler struct {
	db *gorm.DB
}

func NewPrePlanHandler(db *gorm.DB) *PrePlanHandler {
	return &PrePlanHandler{db: db}
}

func (h *PrePlanHandler) List(c *gin.Context) {
	role := c.MustGet("role").(string)
	userID := c.MustGet("user_id").(uint)

	query := h.db.Model(&models.PrePlan{})

	if role == "student" {
		// Only show plans from user's teams
		query = query.Joins("INNER JOIN teams ON teams.id = pre_plans.team_id").
			Joins("INNER JOIN team_members ON team_members.team_id = teams.id").
			Where("team_members.user_id = ?", userID)
	}

	var plans []models.PrePlan
	query.Preload("Competition").Preload("Team").Order("created_at DESC").Find(&plans)

	c.JSON(http.StatusOK, gin.H{"pre_plans": plans})
}

func (h *PrePlanHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var plan models.PrePlan
	if err := h.db.Preload("Competition").Preload("Team").First(&plan, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pre-plan not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"pre_plan": plan})
}

type CreatePrePlanRequest struct {
	CompetitionID   uint   `json:"comp_id" binding:"required"`
	TeamID          uint   `json:"team_id" binding:"required"`
	Title           string `json:"title" binding:"required"`
	TechStack       string `json:"tech_stack"`
	TargetAudience  string `json:"target_audience"`
	MarketAnalysis  string `json:"market_analysis"`
	Innovation      string `json:"innovation"`
	ExpectedOutcome string `json:"expected_outcome"`
	Timeline        string `json:"timeline"`
}

func (h *PrePlanHandler) Create(c *gin.Context) {
	var req CreatePrePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	plan := &models.PrePlan{
		CompetitionID:   req.CompetitionID,
		TeamID:          req.TeamID,
		Title:           req.Title,
		TechStack:       req.TechStack,
		TargetAudience:  req.TargetAudience,
		MarketAnalysis:  req.MarketAnalysis,
		Innovation:      req.Innovation,
		ExpectedOutcome: req.ExpectedOutcome,
		Timeline:        req.Timeline,
		Status:          "under_review",
		SubmittedAt:     &now,
	}

	if err := h.db.Create(plan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create pre-plan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"pre_plan": plan})
}
```

```go
// handlers/award.go
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/models"
)

type AwardHandler struct {
	db *gorm.DB
}

func NewAwardHandler(db *gorm.DB) *AwardHandler {
	return &AwardHandler{db: db}
}

func (h *AwardHandler) List(c *gin.Context) {
	role := c.MustGet("role").(string)
	userID := c.MustGet("user_id").(uint)

	query := h.db.Model(&models.Award{})

	if role == "teacher" {
		query = query.Joins("INNER JOIN teams ON teams.id = awards.team_id").
			Where("teams.teacher_id = ?", userID) // Assuming teacher_id exists
	}

	status := c.Query("status")
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	var awards []models.Award
	query.Preload("Competition").Preload("Team").Find(&awards)

	c.JSON(http.StatusOK, gin.H{"awards": awards})
}

func (h *AwardHandler) Settle(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("user_id").(uint)

	var award models.Award
	if err := h.db.First(&award, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Award not found"})
		return
	}

	if award.Status != models.AwardStatusTeacherConfirm {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Award cannot be settled"})
		return
	}

	award.Status = models.AwardStatusSettled
	award.SettledBy = &userID

	h.db.Save(&award)

	c.JSON(http.StatusOK, gin.H{"award": award})
}
```

```go
// handlers/evaluation.go
package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/models"
)

type EvaluationHandler struct {
	db *gorm.DB
}

func NewEvaluationHandler(db *gorm.DB) *EvaluationHandler {
	return &EvaluationHandler{db: db}
}

func (h *EvaluationHandler) List(c *gin.Context) {
	role := c.MustGet("role").(string)
	userID := c.MustGet("user_id").(uint)

	query := h.db.Model(&models.StudentEvaluation{})

	if role == "student" {
		query = query.Where("student_id = ?", userID)
	} else if role == "teacher" {
		query = query.Where("teacher_id = ?", userID)
	}

	var evaluations []models.StudentEvaluation
	query.Preload("Student").Preload("Teacher").Preload("Competition").Find(&evaluations)

	c.JSON(http.StatusOK, gin.H{"evaluations": evaluations})
}

type CreateEvaluationRequest struct {
	TeacherID     uint   `json:"teacher_id" binding:"required"`
	CompetitionID uint   `json:"comp_id" binding:"required"`
	Teaching      int    `json:"teaching" binding:"required,min=1,max=5"`
	Communication int    `json:"communication" binding:"required,min=1,max=5"`
	Availability  int    `json:"availability" binding:"required,min=1,max=5"`
	Overall       int    `json:"overall" binding:"required,min=1,max=5"`
	Feedback      string `json:"feedback"`
}

func (h *EvaluationHandler) Create(c *gin.Context) {
	var req CreateEvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("user_id").(uint)

	// Check if already evaluated
	var count int64
	h.db.Model(&models.StudentEvaluation{}).
		Where("student_id = ? AND teacher_id = ? AND competition_id = ?", userID, req.TeacherID, req.CompetitionID).
		Count(&count)

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Already evaluated"})
		return
	}

	evaluation := &models.StudentEvaluation{
		StudentID:     userID,
		TeacherID:     req.TeacherID,
		CompetitionID: req.CompetitionID,
		Teaching:      req.Teaching,
		Communication: req.Communication,
		Availability:  req.Availability,
		Overall:       req.Overall,
		Feedback:      req.Feedback,
		SubmittedAt:   time.Now(),
		Status:        "submitted",
	}

	if err := h.db.Create(evaluation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create evaluation"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"evaluation": evaluation})
}
```

```go
// handlers/stats.go
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/models"
)

type StatsHandler struct {
	db *gorm.DB
}

func NewStatsHandler(db *gorm.DB) *StatsHandler {
	return &StatsHandler{db: db}
}

func (h *StatsHandler) Overview(c *gin.Context) {
	var compCount, teamCount, awardCount, userCount int64

	h.db.Model(&models.Competition{}).Count(&compCount)
	h.db.Model(&models.Team{}).Count(&teamCount)
	h.db.Model(&models.Award{}).Count(&awardCount)
	h.db.Model(&models.User{}).Count(&userCount)

	c.JSON(http.StatusOK, gin.H{
		"competitions": compCount,
		"teams":        teamCount,
		"awards":       awardCount,
		"users":        userCount,
	})
}

func (h *StatsHandler) Competitions(c *gin.Context) {
	var stats []struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}

	h.db.Model(&models.Competition{}).
		Select("status, count(*) as count").
		Group("status").
		Find(&stats)

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

func (h *StatsHandler) Teachers(c *gin.Context) {
	type TeacherStat struct {
		ID         uint    `json:"id"`
		Name       string  `json:"name"`
		Dept       string  `json:"dept"`
		Guided     int64   `json:"guided"`
		AvgRating  float64 `json:"avg_rating"`
		EvalCount  int64   `json:"eval_count"`
	}

	var teachers []models.User
	h.db.Where("role = ?", models.RoleTeacher).Find(&teachers)

	var stats []TeacherStat
	for _, t := range teachers {
		var guided int64
		h.db.Model(&models.Team{}).Where("teacher_id = ?", t.ID).Count(&guided)

		var avgRating float64
		var evalCount int64
		h.db.Model(&models.StudentEvaluation{}).
			Where("teacher_id = ?", t.ID).
			Select("COALESCE(AVG(overall), 0)").
			Scan(&avgRating)
		h.db.Model(&models.StudentEvaluation{}).Where("teacher_id = ?", t.ID).Count(&evalCount)

		stats = append(stats, TeacherStat{
			ID:        t.ID,
			Name:      t.Name,
			Dept:      t.Dept,
			Guided:    guided,
			AvgRating: avgRating,
			EvalCount: evalCount,
		})
	}

	c.JSON(http.StatusOK, gin.H{"teachers": stats})
}
```

- [ ] **Step 7: Commit**

```bash
git add backend/internal/models/ backend/internal/handlers/
git commit -m "feat: add remaining models (preplan, award, evaluation, notification, ai_log) and handlers"
```

---

## Task 8: Router & Main Entry Point

**Files:**
- Create: `backend/internal/router/router.go`
- Create: `backend/cmd/server/main.go`
- Create: `backend/internal/database/migrate.go`
- Create: `backend/internal/database/seed.go`

- [ ] **Step 1: Create router**

```go
package router

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/handlers"
	"github.com/ssgl/competition-platform/internal/middleware"
)

func Setup(db *gorm.DB, cfg *config.Config) *gin.Engine {
	gin.SetMode(cfg.Server.Mode)

	r := gin.Default()

	// Middleware
	r.Use(middleware.CORSMiddleware())

	// Handlers
	authHandler := handlers.NewAuthHandler(db, &cfg.JWT)
	compHandler := handlers.NewCompetitionHandler(db)
	teamHandler := handlers.NewTeamHandler(db)
	workflowHandler := handlers.NewWorkflowHandler(db)
	preplanHandler := handlers.NewPrePlanHandler(db)
	awardHandler := handlers.NewAwardHandler(db)
	evalHandler := handlers.NewEvaluationHandler(db)
	statsHandler := handlers.NewStatsHandler(db)

	// Public routes
	r.POST("/api/v1/auth/login", authHandler.Login)
	r.POST("/api/v1/auth/register", authHandler.Register)
	r.POST("/api/v1/auth/refresh", authHandler.Refresh)

	// Protected routes
	api := r.Group("/api/v1")
	api.Use(middleware.AuthMiddleware(&cfg.JWT))

	// Users
	api.GET("/users/me", authHandler.GetMe)

	// Competitions
	api.GET("/competitions", compHandler.List)
	api.GET("/competitions/:id", compHandler.Get)
	api.POST("/competitions", middleware.RequireRole("admin"), compHandler.Create)
	api.PUT("/competitions/:id", middleware.RequireRole("admin"), compHandler.Update)
	api.DELETE("/competitions/:id", middleware.RequireRole("admin"), compHandler.Delete)
	api.POST("/competitions/:id/publish", middleware.RequireRole("admin"), compHandler.Publish)

	// Teams
	api.GET("/teams", teamHandler.List)
	api.GET("/teams/:id", teamHandler.Get)
	api.POST("/teams", teamHandler.Create)
	api.POST("/teams/:id/join", teamHandler.Join)
	api.DELETE("/teams/:id/leave", teamHandler.Leave)

	// Workflows
	api.GET("/workflows", workflowHandler.List)
	api.GET("/workflows/:id", workflowHandler.Get)
	api.POST("/workflows/:id/approve", workflowHandler.Approve)
	api.POST("/workflows/:id/reject", workflowHandler.Reject)

	// Pre-plans
	api.GET("/pre-plans", preplanHandler.List)
	api.GET("/pre-plans/:id", preplanHandler.Get)
	api.POST("/pre-plans", preplanHandler.Create)

	// Awards
	api.GET("/awards", awardHandler.List)
	api.POST("/awards/:id/settle", middleware.RequireRole("admin"), awardHandler.Settle)

	// Evaluations
	api.GET("/evaluations", evalHandler.List)
	api.POST("/evaluations", evalHandler.Create)

	// Stats
	api.GET("/stats/overview", statsHandler.Overview)
	api.GET("/stats/competitions", statsHandler.Competitions)
	api.GET("/stats/teachers", statsHandler.Teachers)

	return r
}
```

- [ ] **Step 2: Create migrate.go**

```go
package database

import (
	"log"

	"github.com/ssgl/competition-platform/internal/models"
)

func Migrate() {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Competition{},
		&models.Team{},
		&models.TeamMember{},
		&models.ApprovalWorkflow{},
		&models.ApprovalStep{},
		&models.PrePlan{},
		&models.ExecutionPlan{},
		&models.Award{},
		&models.StudentEvaluation{},
		&models.Notification{},
		&models.AIAnalysisLog{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("✅ Database migrated")
}
```

- [ ] **Step 3: Create seed.go**

```go
package database

import (
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/ssgl/competition-platform/internal/models"
)

func Seed() {
	// Check if already seeded
	var count int64
	DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		log.Println("⏭️ Database already seeded")
		return
	}

	log.Println("🌱 Seeding database...")

	// Create users
	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)

	users := []models.User{
		{Username: "liuzy", Email: "liuzy@univ.edu.cn", Password: string(hash), Role: "admin", Name: "刘志远", Avatar: "刘", Dept: "教务处管理中心", Status: "active"},
		{Username: "wangjg", Email: "wangjg@univ.edu.cn", Password: string(hash), Role: "teacher", Name: "王建国", Avatar: "王", Dept: "计算机科学学院", Status: "active"},
		{Username: "zhangm", Email: "zhangm@stu.edu.cn", Password: string(hash), Role: "student", Name: "张明", Avatar: "张", Dept: "软件工程 2023级", Status: "active"},
		{Username: "liyun", Email: "liyun@stu.edu.cn", Password: string(hash), Role: "student", Name: "李云", Avatar: "李", Dept: "数据科学 2023级", Status: "active"},
		{Username: "zhaox", Email: "zhaox@stu.edu.cn", Password: string(hash), Role: "student", Name: "赵晓", Avatar: "赵", Dept: "人工智能 2023级", Status: "active"},
		{Username: "chenyu", Email: "chenyu@stu.edu.cn", Password: string(hash), Role: "student", Name: "陈宇", Avatar: "陈", Dept: "计算机科学 2022级", Status: "active"},
		{Username: "chenxm", Email: "chenxm@univ.edu.cn", Password: string(hash), Role: "teacher", Name: "陈晓梅", Avatar: "陈", Dept: "人工智能学院", Status: "active"},
		{Username: "limy", Email: "limy@univ.edu.cn", Password: string(hash), Role: "teacher", Name: "李明远", Avatar: "李", Dept: "信息工程学院", Status: "active"},
	}

	DB.Create(&users)

	// Create competitions
	deadline1, _ := time.Parse("2006-01-02", "2026-06-30")
	deadline2, _ := time.Parse("2006-01-02", "2026-07-15")

	comps := []models.Competition{
		{Title: "2026 华为 ICT 创新大赛", Description: "面向全国高校学生的ICT创新竞赛", Type: "hackathon", Status: "ongoing", MaxTeamSize: 5, MinTeamSize: 2, RegistrationDeadline: deadline1, Location: "线上初赛 + 深圳总决赛", OrganizerID: 1, Prize: "总奖金 ¥500,000"},
		{Title: "第八届互联网+大学生创新创业大赛", Description: "教育部主办的全国性大学生创新创业赛事", Type: "innovation", Status: "published", MaxTeamSize: 6, MinTeamSize: 3, RegistrationDeadline: deadline2, Location: "北京·清华大学", OrganizerID: 1, Prize: "总奖金 ¥1,000,000"},
	}

	DB.Create(&comps)

	// Create teams
	teams := []models.Team{
		{Name: "量子跃迁", CompetitionID: 1, LeaderID: 3, Status: "active"},
		{Name: "智能未来", CompetitionID: 2, LeaderID: 5, Status: "active"},
	}

	DB.Create(&teams)

	// Add team members
	members := []models.TeamMember{
		{TeamID: 1, UserID: 3, Role: "leader"},
		{TeamID: 1, UserID: 4, Role: "member"},
		{TeamID: 1, UserID: 5, Role: "member"},
		{TeamID: 1, UserID: 6, Role: "member"},
		{TeamID: 2, UserID: 5, Role: "leader"},
	}

	DB.Create(&members)

	log.Println("✅ Database seeded")
}
```

- [ ] **Step 4: Create main.go**

```go
package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/router"
)

func main() {
	seed := flag.Bool("seed", false, "Seed the database")
	flag.Parse()

	// Load config
	cfg := config.Load()

	// Connect to database
	database.Connect(&cfg.DB)

	// Run migrations
	database.Migrate()

	// Seed if requested
	if *seed {
		database.Seed()
	}

	// Setup router
	r := router.Setup(database.GetDB(), cfg)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("🚀 Server starting on %s", addr)

	if err := r.Run(addr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/router backend/cmd backend/internal/database
git commit -m "feat: add router, main entry point, migrations, and seed data"
```

---

## Task 9: Run & Verify

- [ ] **Step 1: Start database**

```bash
cd D:\Code\ssgl\backend
docker compose up -d
```

Expected: PostgreSQL and Redis containers running.

- [ ] **Step 2: Run the server with seed data**

```bash
go run cmd/server/main.go --seed
```

Expected: Server starts on port 8080, database migrated and seeded.

- [ ] **Step 3: Test login API**

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"liuzy","password":"password123"}'
```

Expected: Returns JWT tokens and user info.

- [ ] **Step 4: Test protected API**

```bash
# Use the token from login response
curl http://localhost:8080/api/v1/competitions \
  -H "Authorization: Bearer <token>"
```

Expected: Returns competitions list.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Go backend foundation"
```

---

## Summary

This plan creates a complete Go backend with:

1. **Auth system** — JWT-based with register, login, refresh
2. **RBAC** — student, teacher, admin roles
3. **Competition CRUD** — full lifecycle management
4. **Team management** — create, join, leave teams
5. **Workflow engine** — generic approval system
6. **Pre-plan management** — submit and track plans
7. **Award management** — nominations and settlement
8. **Student evaluations** — rate teachers
9. **Statistics** — overview and analytics
10. **Seed data** — mock data from frontend for testing

The frontend can now connect to `http://localhost:8080/api/v1/*` instead of using mock data.
