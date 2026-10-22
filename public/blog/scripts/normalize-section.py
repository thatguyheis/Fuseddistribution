#!/usr/bin/env python3
"""Remove only an echoed opening section title; preserve all other content."""
import re
import sys


def normalize_section(text: str, heading: str) -> str:
    lines = text.splitlines(keepends=True)
    first = next((i for i, line in enumerate(lines) if line.strip()), None)
    if first is not None:
        match = re.fullmatch(r"\s*#{1,6}\s+(.+?)\s*", lines[first].rstrip("\r\n"))
        if match and match.group(1).strip().casefold() == heading.strip().casefold():
            lines.pop(first)
    return "".join(lines)


if __name__ == "__main__":
    sys.stdout.write(normalize_section(sys.stdin.read(), sys.argv[1]))
