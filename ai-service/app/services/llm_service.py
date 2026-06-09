"""Unified LLM service supporting OpenAI and Anthropic backends."""

from typing import AsyncGenerator

from app.config import get_settings

settings = get_settings()


class LLMService:
    """Unified interface for chat completions via OpenAI or Anthropic."""

    def __init__(self):
        provider = settings.LLM_PROVIDER

        if provider == "openai":
            from openai import OpenAI

            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self._model = settings.OPENAI_MODEL
        elif provider == "anthropic":
            import anthropic

            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            self._model = settings.ANTHROPIC_MODEL
        else:
            raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")

        self._provider = provider

    # ------------------------------------------------------------------
    # Synchronous chat
    # ------------------------------------------------------------------

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
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

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

        if self._provider == "openai":
            stream = self._client.chat.completions.create(
                model=self._model,
                temperature=temperature,
                stream=True,
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
            # Anthropic streaming
            with self._client.messages.stream(
                model=self._model,
                max_tokens=4096,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                for text in stream.text_stream:
                    yield text


# Module-level singleton
llm_service = LLMService()
