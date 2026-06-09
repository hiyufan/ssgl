"""Security middleware for the AI service."""

import time
from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

settings = get_settings()


class APIKeyMiddleware(BaseHTTPMiddleware):
    """Middleware to validate API key for service authentication."""

    async def dispatch(self, request: Request, call_next):
        # Skip auth for health endpoint and docs
        if request.url.path in ["/health", "/docs", "/openapi.json", "/"]:
            return await call_next(request)

        # If no API key configured, skip auth
        if not settings.API_KEY:
            return await call_next(request)

        # Check API key in header
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            # Also check query parameter
            api_key = request.query_params.get("api_key")

        if not api_key or api_key != settings.API_KEY:
            return JSONResponse(
                status_code=401,
                content={"error": "unauthorized", "message": "Invalid or missing API key"}
            )

        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware."""

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health endpoint
        if request.url.path in ["/health", "/docs", "/openapi.json"]:
            return await call_next(request)

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        # Clean old requests
        if client_ip in self.requests:
            self.requests[client_ip] = [
                t for t in self.requests[client_ip]
                if current_time - t < 60
            ]
        else:
            self.requests[client_ip] = []

        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Too many requests. Please try again later."
                },
                headers={"Retry-After": "60"}
            )

        # Add current request
        self.requests[client_ip].append(current_time)

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        return response


def setup_cors(app):
    """Setup CORS middleware."""
    origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def setup_security(app):
    """Setup all security middleware."""
    # CORS
    setup_cors(app)

    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # Rate limiting (60 requests per minute per IP)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

    # API key authentication
    if settings.API_KEY:
        app.add_middleware(APIKeyMiddleware)
