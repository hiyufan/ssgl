package database

import (
	"log"

	"github.com/ssgl/competition-platform/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DB is the package-level database connection.
var DB *gorm.DB

// Connect opens a PostgreSQL connection using GORM and configures the connection pool.
func Connect(cfg *config.DBConfig) {
	var err error
	DB, err = gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("failed to get underlying sql.DB: %v", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	log.Println("database connection established")
}

// GetDB returns the active GORM database instance.
func GetDB() *gorm.DB {
	return DB
}
