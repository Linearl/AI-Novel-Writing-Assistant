#!/usr/bin/env python3
"""Export novel to TXT format."""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml


def configure_utf8_output() -> None:
    """Configure UTF-8 output for stdout and stderr."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


def load_chapter(path: Path) -> dict[str, Any] | None:
    """Load a chapter file."""
    if not path.is_file():
        return None

    content = path.read_text(encoding="utf-8")

    # Extract chapter number from filename
    match = re.search(r"chapter[_-](\d+)", path.name)
    if not match:
        return None

    chapter_num = int(match.group(1))

    # Extract title (first heading)
    title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    title = title_match.group(1) if title_match else f"Chapter {chapter_num}"

    # Remove YAML frontmatter if present
    content = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)

    return {
        "number": chapter_num,
        "title": title.strip(),
        "content": content.strip(),
    }


def export_chapters(workspace: Path, output: Path, format: str = "plain") -> None:
    """Export all chapters to a single file."""
    chapters_dir = workspace / "chapters"
    if not chapters_dir.is_dir():
        print(f"error: chapters directory not found: {chapters_dir}", file=sys.stderr)
        return

    # Load all chapters
    chapters = []
    for path in sorted(chapters_dir.glob("*.md")):
        chapter = load_chapter(path)
        if chapter:
            chapters.append(chapter)

    if not chapters:
        print("warning: no chapters found", file=sys.stderr)
        return

    # Sort by number
    chapters.sort(key=lambda c: c["number"])

    # Build output
    parts = []

    # Add title page
    state_path = workspace / "novel-state.yaml"
    if state_path.is_file():
        state = yaml.safe_load(state_path.read_text(encoding="utf-8"))
        title = state.get("novel_title", "Untitled")
        parts.append(f"{title}\n")

    # Add chapters
    for chapter in chapters:
        if format == "markdown":
            parts.append(f"\n\n# {chapter['title']}\n\n{chapter['content']}")
        else:
            parts.append(f"\n\n{chapter['title']}\n{'=' * len(chapter['title'])}\n\n{chapter['content']}")

    # Write output
    content = "\n".join(parts)
    output.write_text(content, encoding="utf-8")
    print(f"exported {len(chapters)} chapters to: {output}")


def main() -> int:
    """Main entry point."""
    configure_utf8_output()

    parser = argparse.ArgumentParser(description="Export novel to TXT format")
    parser.add_argument("--workspace", "-w", default=".", help="Workspace directory")
    parser.add_argument("--output", "-o", required=True, help="Output file")
    parser.add_argument("--format", "-f", choices=["plain", "markdown"], default="plain", help="Output format")

    args = parser.parse_args()

    workspace = Path(args.workspace)
    output = Path(args.output)

    try:
        export_chapters(workspace, output, args.format)
        return 0
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
