from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ssgl_ai"

    # LLM Provider
    LLM_PROVIDER: Literal["openai", "anthropic"] = "openai"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # Embedding (local BGE-M3 model - no API key needed)
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    EMBEDDING_DIMENSIONS: int = 1024

    # Security
    API_KEY: str = ""  # API key for service authentication (empty = no auth)
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
