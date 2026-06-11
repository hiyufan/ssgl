#!/bin/bash
cd /tmp/ssgl
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=cyf
export DB_PASSWORD=24235096cyf
export DB_NAME=ssgl
export DB_SSLMODE=disable
export DB_TIMEZONE=Asia/Shanghai
export JWT_SECRET=ssgl-dev-jwt-secret-must-be-32chars
export AI_BASE_URL=http://localhost:8000
export AI_JWT_SECRET=ssgl-ai-jwt-secret-32chars-ok
export SERVER_PORT=8080
export GIN_MODE=release
exec ./ssgl-server
