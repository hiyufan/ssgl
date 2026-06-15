"""Document chunking service for splitting text into embedding-ready chunks."""

import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """A text chunk with metadata."""

    content: str
    index: int
    start_char: int
    end_char: int
    metadata: dict


class ChunkingService:
    """Split documents into chunks for embedding.

    Supports multiple chunking strategies:
    - Paragraph-based: Split by double newlines
    - Sentence-based: Split by sentence boundaries
    - Fixed-length: Split by character count with overlap
    - Semantic: Split by semantic boundaries (headings, sections)
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        min_chunk_size: int = 20,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size

    def chunk(
        self,
        text: str,
        strategy: str = "semantic",
        metadata: dict | None = None,
    ) -> list[Chunk]:
        """Split text into chunks using the specified strategy.

        Args:
            text: Input text to chunk
            strategy: Chunking strategy ("paragraph", "sentence", "fixed", "semantic")
            metadata: Additional metadata to attach to each chunk

        Returns:
            List of Chunk objects
        """
        if not text or not text.strip():
            return []

        metadata = metadata or {}

        if strategy == "paragraph":
            chunks = self._chunk_by_paragraph(text, metadata)
        elif strategy == "sentence":
            chunks = self._chunk_by_sentence(text, metadata)
        elif strategy == "fixed":
            chunks = self._chunk_fixed_length(text, metadata)
        elif strategy == "semantic":
            chunks = self._chunk_semantic(text, metadata)
        else:
            raise ValueError(f"Unknown chunking strategy: {strategy}")

        # Fallback: if no chunks were produced but text exists, create one chunk
        if not chunks and text.strip():
            chunks = [Chunk(
                content=text.strip(),
                index=0,
                start_char=0,
                end_char=len(text),
                metadata=metadata,
            )]

        return chunks

    def _chunk_by_paragraph(self, text: str, metadata: dict) -> list[Chunk]:
        """Split by double newlines (paragraphs)."""
        paragraphs = re.split(r"\n\s*\n", text)
        chunks = []
        current_pos = 0

        for i, para in enumerate(paragraphs):
            para = para.strip()
            if not para or len(para) < self.min_chunk_size:
                current_pos += len(para) + 2  # +2 for \n\n
                continue

            # If paragraph is too long, split it further
            if len(para) > self.chunk_size * 2:
                sub_chunks = self._split_long_text(para, current_pos, metadata)
                chunks.extend(sub_chunks)
            else:
                chunks.append(
                    Chunk(
                        content=para,
                        index=len(chunks),
                        start_char=current_pos,
                        end_char=current_pos + len(para),
                        metadata=metadata,
                    )
                )

            current_pos += len(para) + 2

        return chunks

    def _chunk_by_sentence(self, text: str, metadata: dict) -> list[Chunk]:
        """Split by sentence boundaries."""
        # Chinese and English sentence endings
        sentences = re.split(r"(?<=[。！？.!?])\s*", text)
        chunks = []
        current_chunk = ""
        current_start = 0
        current_pos = 0

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                current_pos += len(sentence) + 1
                continue

            # If adding this sentence exceeds chunk_size, save current chunk
            if current_chunk and len(current_chunk) + len(sentence) > self.chunk_size:
                if len(current_chunk) >= self.min_chunk_size:
                    chunks.append(
                        Chunk(
                            content=current_chunk.strip(),
                            index=len(chunks),
                            start_char=current_start,
                            end_char=current_pos,
                            metadata=metadata,
                        )
                    )
                current_chunk = sentence
                current_start = current_pos
            else:
                if not current_chunk:
                    current_start = current_pos
                current_chunk += " " + sentence if current_chunk else sentence

            current_pos += len(sentence) + 1

        # Add the last chunk
        if current_chunk and len(current_chunk) >= self.min_chunk_size:
            chunks.append(
                Chunk(
                    content=current_chunk.strip(),
                    index=len(chunks),
                    start_char=current_start,
                    end_char=current_pos,
                    metadata=metadata,
                )
            )

        return chunks

    def _chunk_fixed_length(self, text: str, metadata: dict) -> list[Chunk]:
        """Split by fixed character count with overlap."""
        chunks = []
        start = 0

        while start < len(text):
            end = start + self.chunk_size

            # Try to break at a sentence or paragraph boundary
            if end < len(text):
                # Look for a good break point
                for sep in ["\n\n", "\n", "。", ".", "！", "!", "？", "?"]:
                    last_sep = text.rfind(sep, start + self.min_chunk_size, end)
                    if last_sep != -1:
                        end = last_sep + len(sep)
                        break

            chunk_text = text[start:end].strip()
            if chunk_text and len(chunk_text) >= self.min_chunk_size:
                chunks.append(
                    Chunk(
                        content=chunk_text,
                        index=len(chunks),
                        start_char=start,
                        end_char=end,
                        metadata=metadata,
                    )
                )

            # Move start with overlap
            start = end - self.chunk_overlap if end < len(text) else end

        return chunks

    def _chunk_semantic(self, text: str, metadata: dict) -> list[Chunk]:
        """Split by semantic boundaries (headings, sections, paragraphs)."""
        # First, split by major sections (headings)
        sections = re.split(r"(?=^#{1,3}\s)", text, flags=re.MULTILINE)

        if len(sections) <= 1:
            # No headings found, fall back to paragraph chunking
            return self._chunk_by_paragraph(text, metadata)

        chunks = []
        current_pos = 0

        for section in sections:
            section = section.strip()
            if not section:
                current_pos += len(section) + 1
                continue

            # Extract heading if present
            heading_match = re.match(r"^(#{1,3})\s+(.+)", section)
            heading = heading_match.group(2).strip() if heading_match else ""

            # If section is small enough, keep as one chunk
            if len(section) <= self.chunk_size * 1.5:
                if len(section) >= self.min_chunk_size:
                    chunk_metadata = {**metadata}
                    if heading:
                        chunk_metadata["heading"] = heading

                    chunks.append(
                        Chunk(
                            content=section,
                            index=len(chunks),
                            start_char=current_pos,
                            end_char=current_pos + len(section),
                            metadata=chunk_metadata,
                        )
                    )
            else:
                # Split section by paragraphs
                section_chunks = self._chunk_by_paragraph(section, metadata)
                for chunk in section_chunks:
                    chunk.start_char += current_pos
                    chunk.end_char += current_pos
                    chunk.index = len(chunks)
                    if heading:
                        chunk.metadata["heading"] = heading
                    chunks.append(chunk)

            current_pos += len(section) + 1

        # Merge very small chunks
        return self._merge_small_chunks(chunks)

    def _split_long_text(
        self, text: str, offset: int, metadata: dict
    ) -> list[Chunk]:
        """Split a long text into smaller chunks."""
        chunks = []
        start = 0

        while start < len(text):
            end = min(start + self.chunk_size, len(text))

            # Try to break at a sentence boundary
            if end < len(text):
                for sep in ["。", ".", "！", "!", "？", "?", "\n"]:
                    last_sep = text.rfind(sep, start + self.min_chunk_size, end)
                    if last_sep != -1:
                        end = last_sep + 1
                        break

            chunk_text = text[start:end].strip()
            if chunk_text and len(chunk_text) >= self.min_chunk_size:
                chunks.append(
                    Chunk(
                        content=chunk_text,
                        index=len(chunks),
                        start_char=offset + start,
                        end_char=offset + end,
                        metadata=metadata,
                    )
                )

            start = end

        return chunks

    def _merge_small_chunks(self, chunks: list[Chunk]) -> list[Chunk]:
        """Merge chunks that are too small."""
        if not chunks:
            return []

        merged = []
        current = chunks[0]

        for next_chunk in chunks[1:]:
            # If current chunk is too small, merge with next
            if len(current.content) < self.min_chunk_size:
                current = Chunk(
                    content=current.content + "\n\n" + next_chunk.content,
                    index=current.index,
                    start_char=current.start_char,
                    end_char=next_chunk.end_char,
                    metadata=current.metadata,
                )
            elif len(current.content) + len(next_chunk.content) <= self.chunk_size:
                # Merge if combined size is within limit
                current = Chunk(
                    content=current.content + "\n\n" + next_chunk.content,
                    index=current.index,
                    start_char=current.start_char,
                    end_char=next_chunk.end_char,
                    metadata=current.metadata,
                )
            else:
                merged.append(current)
                current = next_chunk

        # Don't forget the last chunk
        if current:
            merged.append(current)

        # Re-index
        for i, chunk in enumerate(merged):
            chunk.index = i

        return merged


# Module-level singleton
chunking_service = ChunkingService()
