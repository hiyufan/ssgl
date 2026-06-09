"""Health-check router."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    """Return a simple health status."""
    return {"status": "healthy", "service": "ai-service"}
