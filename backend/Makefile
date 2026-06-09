.PHONY: run dev test db-up db-down seed build clean

# Run the application
run:
	go run cmd/server/main.go

# Run with hot reload (requires air: go install github.com/air-verse/air@latest)
dev:
	air

# Run tests
test:
	go test -v ./...

# Start database services
db-up:
	docker compose up -d postgres redis

# Stop database services
db-down:
	docker compose down

# Seed the database
seed:
	go run cmd/seed/main.go

# Build the application
build:
	go build -o bin/server cmd/server/main.go

# Clean build artifacts
clean:
	rm -rf bin/

# Tidy go modules
tidy:
	go mod tidy

# Run linter (requires golangci-lint)
lint:
	golangci-lint run ./...
