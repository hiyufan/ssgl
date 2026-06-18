"""Security middleware for the AI service."""

import time

import jwt
from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

settings = get_settings()

# Endpoints that never require authentication.
PUBLIC_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


def _valid_api_key(request: Request) -> bool:
    """True if a configured API key is present and matches."""
    if not settings.API_KEY:
        return False
    api_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    return bool(api_key) and api_key == settings.API_KEY


def _valid_jwt(request: Request) -> bool:
    """True if the request carries a valid Go-issued access token."""
    if not settings.JWT_SECRET:
        return False
    auth = request.headers.get("Authorization", "")
    parts = auth.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return False
    try:
        claims = jwt.decode(parts[1], settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return False
    if claims.get("token_type") != "access":
        return False
    request.state.user_id = claims.get("user_id")
    request.state.role = claims.get("role")
    return True


class ServiceAuthMiddleware(BaseHTTPMiddleware):
    """Authenticates requests via the Go-issued JWT (browser) or the shared
    API key (service-to-service). If neither secret is configured the service
    runs open — intended for local development only."""

    async def dispatch(self, request: Request, call_next):
        # Allow CORS preflight and public endpoints through.
        if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        # No auth configured at all → dev mode, allow.
        if not settings.JWT_SECRET and not settings.API_KEY:
            return await call_next(request)

        if _valid_api_key(request) or _valid_jwt(request):
            return await call_next(request)

        return JSONResponse(
            status_code=401,
            content={"error": "unauthorized", "message": "A valid bearer token or API key is required"},
        )


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

    # Rate limiting (120 requests per minute per IP)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=120)

    # Authentication (JWT and/or shared API key). Added last so it runs first,
    # rejecting unauthenticated requests before any work is done.
    app.add_middleware(ServiceAuthMiddleware)
