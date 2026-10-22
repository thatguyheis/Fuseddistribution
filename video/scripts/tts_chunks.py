"""Text preserving chunk boundaries for resumable local narration."""
import re

def split_for_tts(text, max_chunk_chars=140):
    if max_chunk_chars < 40:
        raise ValueError("TTS chunk limit must be at least 40 characters")
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks = []
    current = ""
    for sentence in sentences:
        words = sentence.split()
        pieces = []
        piece = ""
        for word in words:
            candidate = f"{piece} {word}".strip()
            if piece and len(candidate) > max_chunk_chars:
                pieces.append(piece)
                piece = word
            else:
                piece = candidate
        if piece:
            pieces.append(piece)
        for candidate_piece in pieces:
            candidate = f"{current} {candidate_piece}".strip()
            if current and len(candidate) > max_chunk_chars:
                chunks.append(current)
                current = candidate_piece
            else:
                current = candidate
    if current:
        chunks.append(current)
    return chunks or [text]


