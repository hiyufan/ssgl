"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import init_db
from app.middleware.security import setup_security
from app.routers import health, rag, review, tools, assistant, coach

SERVICE_NAME = "ai-service"
SERVICE_VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    init_db()
    yield


app = FastAPI(
    title=SERVICE_NAME,
    version=SERVICE_VERSION,
    docs_url="/docs",
    lifespan=lifespan,
)

# Setup security middleware (CORS, rate limiting, security headers, API key)
setup_security(app)

# Routers
app.include_router(health.router)
app.include_router(rag.router, prefix="/ai/api/v1/rag")
app.include_router(review.router, prefix="/ai/api/v1/review")
app.include_router(tools.router, prefix="/ai/api/v1/tools")
app.include_router(assistant.router, prefix="/ai/api/v1/assistant")
app.include_router(coach.router, prefix="/ai/api/v1/coach")


@app.get("/", tags=["root"])
async def root():
    """Service information endpoint."""
    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "docs": "/docs",
    }
