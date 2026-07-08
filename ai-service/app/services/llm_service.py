"""Unified LLM service supporting OpenAI and Anthropic backends.

Includes timeout enforcement and retry with exponential backoff for transient errors.
"""

import asyncio
import logging
import time
from functools import wraps
from typing import AsyncGenerator, Generator

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Retry decorator for transient LLM errors
# ---------------------------------------------------------------------------

def _retry_on_transient(max_attempts: int = 3, base_delay: float = 2.0):
    """Retry decorator with exponential backoff for transient LLM failures.

    Catches rate limits (429), server errors (500/502/503), and timeouts.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    err_str = str(e).lower()
                    # Only retry on transient errors
                    is_transient = any(k in err_str for k in (
                        '429', '500', '502', '503',
                        'rate limit', 'timeout', 'timed out',
                        'connection', 'overloaded', 'server error',
                    ))
                    if not is_transient or attempt == max_attempts - 1:
                        raise
                    delay = base_delay * (2 ** attempt)
                    logger.warning(
                        "LLM call failed (attempt %d/%d): %s — retrying in %.1fs",
                        attempt + 1, max_attempts, e, delay,
                    )
                    try:
                        loop = asyncio.get_running_loop()
                        import concurrent.futures
                        loop.run_in_executor(None, time.sleep, delay)
                    except RuntimeError:
                        time.sleep(delay)
            raise last_exc  # type: ignore[misc]
        return wrapper
    return decorator


def _retry_on_transient_gen(max_attempts: int = 2, base_delay: float = 2.0):
    """Retry decorator for streaming generators (fewer retries)."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_attempts):
                try:
                    yield from func(*args, **kwargs)
                    return
                except Exception as e:
                    last_exc = e
                    err_str = str(e).lower()
                    is_transient = any(k in err_str for k in (
                        '429', '500', '502', '503',
                        'rate limit', 'timeout', 'timed out',
                        'connection', 'overloaded',
                    ))
                    if not is_transient or attempt == max_attempts - 1:
                        raise
                    delay = base_delay * (2 ** attempt)
                    logger.warning("LLM stream failed (attempt %d/%d): %s — retrying in %.1fs",
                                   attempt + 1, max_attempts, e, delay)
                    try:
                        loop = asyncio.get_running_loop()
                        import concurrent.futures
                        loop.run_in_executor(None, time.sleep, delay)
                    except RuntimeError:
                        time.sleep(delay)
            raise last_exc  # type: ignore[misc]
        return wrapper
    return decorator


class LLMService:
    """Unified interface for chat completions via OpenAI or Anthropic."""

    # Default timeout in seconds for LLM API calls
    TIMEOUT = 90.0

    def __init__(self):
        provider = settings.LLM_PROVIDER

        if provider == "openai":
            from openai import OpenAI

            kwargs = {"api_key": settings.OPENAI_API_KEY, "timeout": self.TIMEOUT}
            if settings.OPENAI_BASE_URL:
                kwargs["base_url"] = settings.OPENAI_BASE_URL
            self._client = OpenAI(**kwargs)
            self._model = settings.OPENAI_MODEL
        elif provider == "anthropic":
            import anthropic

            kwargs = {"api_key": settings.ANTHROPIC_API_KEY, "timeout": self.TIMEOUT}
            if settings.ANTHROPIC_BASE_URL:
                kwargs["base_url"] = settings.ANTHROPIC_BASE_URL
            self._client = anthropic.Anthropic(**kwargs)
            self._model = settings.ANTHROPIC_MODEL
        else:
            raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")

        self._provider = provider

    # ------------------------------------------------------------------
    # Synchronous chat
    # ------------------------------------------------------------------

    @_retry_on_transient()
    def chat(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.7,
    ) -> str:
        """Return a single text response from the LLM."""

        if self._provider == "openai":
            response = self._client.chat.completions.create(
                model=self._model,
                temperature=temperature,
                timeout=self.TIMEOUT,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            )
            return response.choices[0].message.content or ""

        # Anthropic
        response = self._client.messages.create(
            model=self._model,
            max_tokens=4096,
            temperature=temperature,
            timeout=self.TIMEOUT,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    # ------------------------------------------------------------------
    # Multi-turn chat (message array)
    # ------------------------------------------------------------------

    @_retry_on_transient()
    def chat_messages(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
    ) -> str:
        """Return a single text response given a multi-turn message array.

        ``messages`` items are ``{"role": "user"|"assistant", "content": str}``.
        """

        if self._provider == "openai":
            response = self._client.chat.completions.create(
                model=self._model,
                temperature=temperature,
                timeout=self.TIMEOUT,
                messages=[{"role": "system", "content": system_prompt}, *messages],
            )
            return response.choices[0].message.content or ""

        # Anthropic
        response = self._client.messages.create(
            model=self._model,
            max_tokens=4096,
            temperature=temperature,
            timeout=self.TIMEOUT,
            system=system_prompt,
            messages=messages,
        )
        return response.content[0].text

    def chat_messages_stream(
        self,
        system_prompt: str,
        messages: list[dict],
        temperature: float = 0.7,
    ) -> Generator[str, None, None]:
        """Yield text chunks given a multi-turn message array (sync generator)."""

        last_exc = None
        for attempt in range(2):
            try:
                if self._provider == "openai":
                    stream = self._client.chat.completions.create(
                        model=self._model,
                        temperature=temperature,
                        stream=True,
                        timeout=self.TIMEOUT,
                        messages=[{"role": "system", "content": system_prompt}, *messages],
                    )
                    for chunk in stream:
                        delta = chunk.choices[0].delta
                        if delta.content:
                            yield delta.content
                else:
                    with self._client.messages.stream(
                        model=self._model,
                        max_tokens=4096,
                        temperature=temperature,
                        timeout=self.TIMEOUT,
                        system=system_prompt,
                        messages=messages,
                    ) as stream:
                        for text in stream.text_stream:
                            yield text
                return  # success
            except Exception as e:
                last_exc = e
                err_str = str(e).lower()
                is_transient = any(k in err_str for k in (
                    '429', '500', '502', '503', 'rate limit', 'timeout',
                ))
                if not is_transient or attempt == 1:
                    raise
                delay = 2.0 * (2 ** attempt)
                logger.warning("LLM stream retry (attempt %d): %s", attempt + 1, e)
                time.sleep(delay)
        raise last_exc  # type: ignore[misc]

    # ------------------------------------------------------------------
    # Streaming chat
    # ------------------------------------------------------------------

    async def chat_stream(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Yield text chunks as they arrive from the LLM."""

        last_exc = None
        for attempt in range(2):
            try:
                if self._provider == "openai":
                    stream = self._client.chat.completions.create(
                        model=self._model,
                        temperature=temperature,
                        stream=True,
                        timeout=self.TIMEOUT,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                    )
                    for chunk in stream:
                        delta = chunk.choices[0].delta
                        if delta.content:
                            yield delta.content
                else:
                    with self._client.messages.stream(
                        model=self._model,
                        max_tokens=4096,
                        temperature=temperature,
                        timeout=self.TIMEOUT,
                        system=system_prompt,
                        messages=[{"role": "user", "content": user_message}],
                    ) as stream:
                        for text in stream.text_stream:
                            yield text
                return  # success
            except Exception as e:
                last_exc = e
                err_str = str(e).lower()
                is_transient = any(k in err_str for k in (
                    '429', '500', '502', '503', 'rate limit', 'timeout',
                ))
                if not is_transient or attempt == 1:
                    raise
                delay = 2.0 * (2 ** attempt)
                logger.warning("LLM async stream retry (attempt %d): %s", attempt + 1, e)
                import asyncio
                await asyncio.sleep(delay)
        raise last_exc  # type: ignore[misc]


# Module-level singleton
llm_service = LLMService()
