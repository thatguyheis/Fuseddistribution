#!/usr/bin/env python3
"""Build a render-ready long-form reel from a verified blog article."""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

MIN_BODY_SEGMENTS = 8
MAX_BODY_SEGMENTS = 12
MIN_DURATION_SECONDS = 180
MAX_DURATION_SECONDS = 240
TARGET_CHUNK_WORDS = 60
MAX_CHUNK_WORDS = 72
ESTIMATED_CHATTERBOX_WORDS_PER_SECOND = 3.25
ESTIMATED_SEGMENT_BUFFER_SECONDS = 0.4


def scrub(value: str) -> str:
    value = re.sub(r"<!--.*?-->", "", value, flags=re.S)
    value = re.sub(r"[—–]", ", ", value)
    value = re.sub(r"\(\s*Source:[^)]+\)", "", value, flags=re.I)
    value = re.sub(r"\[([^]]+)]\([^)]+\)", r"\1", value)
    replacements = {
        "name": "there",
        "service": "job",
        "specific job": "the work",
        "direct review url": "your direct review link",
        "phone or email": "your contact information",
    }
    for placeholder, replacement in replacements.items():
        value = re.sub(rf"\[{re.escape(placeholder)}\]", replacement, value, flags=re.I)
    value = re.sub(r"\[(?:source:[^]]+|https?://[^]]+|\d+)]", "", value, flags=re.I)
    value = re.sub(r"\[([^]]+)]", r"\1", value)
    value = re.sub(r"https?://\S+|www\.\S+", "", value)
    value = re.sub(r"[*_`>]", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" ,")


def article_sentences(markdown: str) -> list[str]:
    text = re.sub(r"<!--.*?-->", "", markdown, flags=re.S)
    # Correction notices belong in the article record, not in evergreen reel
    # narration. Remove a leading one-paragraph notice before sentence chunking.
    text = re.sub(r"^# .*?\n\n\*\*Correction dated[^\n]*\n\n", "", text, count=1, flags=re.S | re.I)
    text = re.split(r"^##\s+Related\s*$", text, maxsplit=1, flags=re.M | re.I)[0]
    text = re.sub(r"See how it works at\s+/#contact\.?", "", text, flags=re.I)
    text = re.sub(r"^# .*$", "", text, count=1, flags=re.M)
    text = re.sub(r"^#{2,6}\s+.*$", "", text, flags=re.M)
    text = re.sub(r"^[-*]\s+", "", text, flags=re.M)
    text = scrub(text)
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", text)
        if 7 <= len(sentence.split()) <= 80
    ]


def sentence_chunks(sentences: list[str]) -> list[str]:
    chunks: list[str] = []
    current: list[str] = []
    words = 0
    for sentence in sentences:
        count = len(sentence.split())
        if current and words + count > MAX_CHUNK_WORDS:
            chunks.append(" ".join(current))
            current, words = [], 0
        current.append(sentence)
        words += count
        if words >= TARGET_CHUNK_WORDS:
            chunks.append(" ".join(current))
            current, words = [], 0
    if current:
        if chunks and words < 24:
            chunks[-1] = f"{chunks[-1]} {' '.join(current)}"
        else:
            chunks.append(" ".join(current))
    return chunks


def evenly_select(items: list[str], count: int) -> list[str]:
    if len(items) <= count:
        return items
    if count == 1:
        return [items[0]]
    indexes = [round(i * (len(items) - 1) / (count - 1)) for i in range(count)]
    return [items[index] for index in indexes]


def narration(value: str) -> str:
    value = scrub(value)
    value = re.sub(r"(\d)\s*%", r"\1 percent", value)
    value = re.sub(r"%", " percent", value)
    value = re.sub(r"\bUS\b", "USA", value)
    return re.sub(r"\s+", " ", value).strip()


def segment_duration(value: str) -> int:
    return math.ceil(
        len(value.split()) / ESTIMATED_CHATTERBOX_WORDS_PER_SECOND
        + ESTIMATED_SEGMENT_BUFFER_SECONDS
    )


FIGURE_PATTERN = re.compile(
    r"(?:[$£€]\s*)?\d[\d,]*(?:\.\d+)?\s*(?:%|percent|million(?:\s+ounces?)?|billion(?:\s+ounces?)?|trillion(?:\s+ounces?)?|ounces?|grams?|x|years?|days?|hours?|minutes?|miles?)?",
    flags=re.I,
)
RANGE_FIGURE_PATTERN = re.compile(
    r"(?:[$£€]\s*)?\d[\d,]*(?:\.\d+)?\s*(?:to|-)\s*(?:[$£€]\s*)?\d[\d,]*(?:\.\d+)?\s*(?:%|percent|x|years?|days?|hours?|minutes?|miles?)?",
    flags=re.I,
)
PHONE_PATTERN = re.compile(r"\b\d{3}[-.\s]\d{4}\b")
LABEL_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "around",
    "as",
    "at",
    "be",
    "because",
    "but",
    "by",
    "can",
    "for",
    "from",
    "get",
    "has",
    "have",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "just",
    "more",
    "not",
    "of",
    "on",
    "or",
    "over",
    "per",
    "should",
    "so",
    "than",
    "that",
    "the",
    "their",
    "they",
    "then",
    "this",
    "those",
    "to",
    "will",
    "when",
    "which",
    "with",
    "within",
    "without",
    "you",
    "your",
    "need",
    "random",
}
PRIORITY_LABEL_WORDS = {
    "ADDRESS",
    "BARS",
    "BUDGET",
    "BUSINESS",
    "CALLS",
    "COST",
    "CUSTOMERS",
    "DEMAND",
    "EV",
    "GROWTH",
    "INSPECTION",
    "LEADS",
    "MARGINS",
    "METAL",
    "MILES",
    "OUNCES",
    "PANEL",
    "PANELS",
    "PRICE",
    "RADIUS",
    "SHARE",
    "SILVER",
    "SOLAR",
    "SPOT",
    "STACK",
    "TARGET",
    "VIDEO",
}


def find_figure(value: str) -> re.Match[str] | None:
    masked = PHONE_PATTERN.sub(lambda match: " " * len(match.group(0)), value)
    range_match = RANGE_FIGURE_PATTERN.search(masked)
    if range_match:
        raw_range = range_match.group(0).strip()
        range_values = [int(value.replace(",", "")) for value in re.findall(r"\d[\d,]*", raw_range)]
        has_range_unit = bool(re.search(r"[$£€%]|percent|x|years?|days?|hours?|minutes?|miles?", raw_range, flags=re.I))
        # A publication or forecast window such as "2024 to 2028" is context,
        # not the stat. Prefer the next measurable figure in the narration so
        # the on-screen label satisfies the release validator.
        if has_range_unit or not (
            len(range_values) == 2 and all(1900 <= number <= 2100 for number in range_values)
        ):
            return range_match
    for match in FIGURE_PATTERN.finditer(masked):
        raw = match.group(0).strip()
        digits = re.sub(r"\D", "", raw)
        has_unit = bool(re.search(r"[$£€%]|percent|million|billion|trillion|ounces?|grams?|x|years?|days?|hours?|minutes?|miles?", raw, flags=re.I))
        # Stray ordered-list markers can survive sentence chunking as a bare
        # trailing number (for example "5."). They are structure, not stats.
        if digits and int(digits) <= 12 and not has_unit:
            continue
        if digits and 1900 <= int(digits) <= 2100 and not has_unit:
            continue
        return match
    return None


def normalize_figure_label(value: str) -> str:
    figure = re.sub(r"\s+", " ", value.strip())
    figure = re.sub(r"\bpercent\b", "%", figure, flags=re.I)
    figure = re.sub(r"\s*-\s*", " TO ", figure)
    figure = re.sub(r"\s+to\s+", " TO ", figure, flags=re.I)
    figure = re.sub(r"\s+", " ", figure)
    return figure.upper()


def content_words(value: str) -> list[str]:
    words = []
    for raw in re.findall(r"[A-Za-z][A-Za-z0-9']*", value):
        word = raw.lower().strip("'")
        if len(word) < 3 or word in LABEL_STOPWORDS:
            continue
        words.append(word.upper())
    return words


def display_label(value: str, include_figure: bool) -> str:
    clean = scrub(value)
    figure_match = find_figure(clean)
    figure = normalize_figure_label(figure_match.group(0)) if include_figure and figure_match else ""
    if figure_match:
        before_words = content_words(clean[: figure_match.start()])
        after_words = content_words(clean[figure_match.end() :])
        priority = [word for word in before_words if word in PRIORITY_LABEL_WORDS][-3:]
        words = priority + after_words[:5]
    else:
        words = content_words(clean)
    figure_words = set(content_words(figure))
    deduped: list[str] = []
    for word in words:
        if word in figure_words or word in deduped:
            continue
        deduped.append(word)
        if len(deduped) >= 4:
            break
    words = deduped
    context = " ".join(words[:4])
    label = f"{figure} {context}".strip()
    label = re.sub(r"\s+", " ", label)
    return label[:52] or "KEY TAKEAWAY"


def has_figure(value: str) -> bool:
    return find_figure(value) is not None


def normalize_question(value: str, brand: str) -> str:
    fallback = "What is your take?" if brand == "silver" else "What would you change first?"
    question = scrub(value or fallback).strip('"\' ')
    if not question.endswith("?"):
        question = question.rstrip(".! ") + "?"
    words = question.split()
    if len(words) > 10:
        question = " ".join(words[:10]).rstrip(".,!?") + "?"
    return question


def follow_line(brand: str) -> str:
    return "Follow for more silver news." if brand == "silver" else "Follow for more practical business tips."


def build(args: argparse.Namespace) -> tuple[Path, Path, int, int]:
    blog_dir = Path(__file__).resolve().parent.parent
    slug = args.slug or Path(args.output).parent.name
    input_path = Path(args.input or blog_dir / slug / "verified.md")
    hooks_path = Path(args.hooks or blog_dir / slug / "hooks.json")
    output_path = Path(args.output or blog_dir / slug / "reel-data.md")
    if not input_path.is_file():
        raise SystemExit(f"error: no input {input_path}")

    article = input_path.read_text()
    hooks = json.loads(hooks_path.read_text()) if hooks_path.is_file() else {}
    sentences = article_sentences(article)
    chunks = sentence_chunks(sentences)
    if len(chunks) < MIN_BODY_SEGMENTS:
        raise SystemExit(
            f"error: article produced {len(chunks)} body chunks; need at least {MIN_BODY_SEGMENTS} for a complete reel"
        )

    hook = scrub(hooks.get("hook") or sentences[0])
    question = normalize_question(hooks.get("discussion_question", ""), args.brand)
    hashtags = hooks.get("hashtags", "#Silver #PreciousMetals #Investing" if args.brand == "silver" else "#SmallBusiness #Marketing #BusinessTips")
    keyword = args.keyword or slug.replace("-", " ")

    body_segments: list[str] | None = None
    total_duration = 0
    for count in range(MIN_BODY_SEGMENTS, min(MAX_BODY_SEGMENTS, len(chunks)) + 1):
        selected = evenly_select(chunks, count)
        hook_narration = narration(hook)
        question_narration = narration(f"{question} {follow_line(args.brand)}")
        duration = segment_duration(hook_narration) + segment_duration(question_narration)
        duration += sum(segment_duration(narration(chunk)) for chunk in selected)
        if MIN_DURATION_SECONDS <= duration <= MAX_DURATION_SECONDS:
            body_segments, total_duration = selected, duration
            break
    if body_segments is None:
        selected = evenly_select(chunks, min(MAX_BODY_SEGMENTS, len(chunks)))
        duration = segment_duration(narration(hook)) + segment_duration(narration(f"{question} {follow_line(args.brand)}"))
        duration += sum(segment_duration(narration(chunk)) for chunk in selected)
        raise SystemExit(
            f"error: generated reel duration is {duration}s; article must support {MIN_DURATION_SECONDS}-{MAX_DURATION_SECONDS}s without filler"
        )

    reel_lines = [
        f"# Reel Data: {slug}",
        f"topic: {args.brand}",
        "format: long-form",
        "",
        f"hook: {hook}",
        f"hook_type: {hooks.get('hook_type', 'statement')}",
        "",
        "## segments",
    ]
    script_sections = [
        "## HOOK\n\n"
        f"**Visual:** Topic intro shot\n**Duration:** {segment_duration(narration(hook))}s minimum\n\n"
        f"Narration: {narration(hook)}"
    ]
    media_lines = ["## media_queries", "- segment: 0", f'  query: "{keyword}"', "  prefer: video"]

    for index, chunk in enumerate(body_segments, start=1):
        numeric = has_figure(chunk)
        segment_type = "STAT" if numeric else "OVERLAY"
        label = display_label(chunk, numeric)
        spoken = narration(chunk)
        reel_lines.extend([
            f"- type: {segment_type.lower()}",
            f"  text: {label}",
            f"  narration: {spoken}",
        ])
        script_sections.append(
            f"## {segment_type}: {label}\n\n"
            f"**Visual:** Supporting article visual\n**Duration:** {segment_duration(spoken)}s minimum\n\n"
            f"Narration: {spoken}"
        )
        query_words = " ".join(re.findall(r"[A-Za-z0-9]+", label.lower())[:3])
        media_lines.extend([
            f"- segment: {index}",
            f'  query: "{keyword} {query_words}"',
            "  prefer: photo",
        ])

    question_narration = narration(f"{question} {follow_line(args.brand)}")
    media_lines.extend([
        f"- segment: {len(body_segments) + 1}",
        f'  query: "{keyword} customer feedback"',
        "  prefer: photo",
    ])
    script_sections.append(
        "## QUESTION\n\n"
        f"**Visual:** Question card\n**Duration:** {segment_duration(question_narration)}s minimum\n\n"
        f"Text: {question}\nSubtext: COMMENT BELOW\nNarration: {question_narration}"
    )
    reel_lines.extend([
        "",
        "## question",
        f"text: {question}",
        "subtext: COMMENT BELOW",
        f"narration: {question_narration}",
        "",
        "## shared",
        f"discussion_question: {question}",
        f"hashtags: {hashtags}",
        "",
        *media_lines,
        "",
    ])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(reel_lines))
    script_path = output_path.parent / "reel-script.md"
    script_path.write_text(
        f"# Reel Script: {slug}\nformat: long-form\nsegments: {len(script_sections)}\n"
        f"target-duration: {total_duration}s\n\n---\n\n"
        + "\n\n---\n\n".join(script_sections)
        + "\n"
    )
    return output_path, script_path, len(body_segments), total_duration


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", nargs="?")
    parser.add_argument("--in", dest="input")
    parser.add_argument("--hooks")
    parser.add_argument("--out", dest="output")
    parser.add_argument("--brand", choices=("silver", "tech"), default="silver")
    parser.add_argument("--keyword", default="")
    return parser.parse_args()


if __name__ == "__main__":
    parsed = parse_args()
    out, script, count, duration = build(parsed)
    print(f"[reel] wrote {out} + {script} ({count} body segments, {duration}s)")
