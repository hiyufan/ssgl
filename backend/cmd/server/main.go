package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/ssgl/competition-platform/internal/config"
	"github.com/ssgl/competition-platform/internal/database"
	"github.com/ssgl/competition-platform/internal/router"
)

func main() {
	seedFlag := flag.Bool("seed", false, "seed the database with initial test data")
	flag.Parse()

	// Load configuration.
	cfg := config.Load()

	// Set gin mode.
	gin.SetMode(cfg.Server.Mode)

	// Connect to database.
	database.Connect(&cfg.DB)

	// Run migrations.
	database.Migrate()

	// Seed if requested.
	if *seedFlag {
		database.Seed()
	}

	// Setup router.
	r := router.Setup(cfg)

	// Start server.
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
