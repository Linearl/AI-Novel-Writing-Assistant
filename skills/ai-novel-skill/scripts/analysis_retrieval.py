#!/usr/bin/env python3
"""Book analysis retrieval and caching.

This script manages book analysis segments, caching, and retrieval
for the book analysis workflow.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


def configure_utf8_output() -> None:
    """Configure UTF-8 output for stdout and stderr."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


def now_utc() -> str:
    """Return current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def compute_hash(content: str) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


# ===== Segment Management =====

def segment_path(workspace: Path, analysis_id: str) -> Path:
    """Return path to analysis segments directory."""
    return workspace / "analyses" / analysis_id / "segments"


def list_segments(workspace: Path, analysis_id: str) -> list[dict[str, Any]]:
    """List all segments for an analysis."""
    seg_dir = segment_path(workspace, analysis_id)
    if not seg_dir.is_dir():
        return []

    segments = []
    for file in sorted(seg_dir.glob("*.md")):
        stat = file.stat()
        content = file.read_text(encoding="utf-8")
        segments.append({
            "filename": file.name,
            "path": file.relative_to(workspace).as_posix(),
            "size": stat.st_size,
            "hash": compute_hash(content),
            "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        })

    return segments


def read_segment(workspace: Path, analysis_id: str, segment_name: str) -> str | None:
    """Read a segment file."""
    seg_dir = segment_path(workspace, analysis_id)
    file_path = seg_dir / segment_name
    if not file_path.is_file():
        return None
    return file_path.read_text(encoding="utf-8")


def write_segment(workspace: Path, analysis_id: str, segment_name: str, content: str) -> None:
    """Write a segment file."""
    seg_dir = segment_path(workspace, analysis_id)
    seg_dir.mkdir(parents=True, exist_ok=True)
    file_path = seg_dir / segment_name
    file_path.write_text(content, encoding="utf-8")


# ===== Cache Management =====

def get_db_path(workspace: Path) -> Path:
    """Get path to analysis cache database."""
    return workspace / "analyses" / "cache.sqlite3"


def init_db(db_path: Path) -> None:
    """Initialize analysis cache database."""
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS segments (
            id TEXT PRIMARY KEY,
            analysis_id TEXT NOT NULL,
            segment_name TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            cached_at TEXT NOT NULL,
            source_file TEXT,
            metadata TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS coverage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id TEXT NOT NULL,
            segment_name TEXT NOT NULL,
            source_start INTEGER,
            source_end INTEGER,
            coverage_type TEXT,
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def cache_segment(
    workspace: Path,
    analysis_id: str,
    segment_name: str,
    content: str,
    source_file: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Cache a segment in the database."""
    db_path = get_db_path(workspace)
    init_db(db_path)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    segment_id = f"{analysis_id}:{segment_name}"
    content_hash = compute_hash(content)

    cursor.execute("""
        INSERT OR REPLACE INTO segments (id, analysis_id, segment_name, content_hash, cached_at, source_file, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        segment_id,
        analysis_id,
        segment_name,
        content_hash,
        now_utc(),
        source_file,
        json.dumps(metadata) if metadata else None,
    ))

    conn.commit()
    conn.close()


def get_cached_segment(workspace: Path, analysis_id: str, segment_name: str) -> dict[str, Any] | None:
    """Get cached segment info."""
    db_path = get_db_path(workspace)
    if not db_path.is_file():
        return None

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    segment_id = f"{analysis_id}:{segment_name}"
    cursor.execute("SELECT * FROM segments WHERE id = ?", (segment_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row[0],
        "analysis_id": row[1],
        "segment_name": row[2],
        "content_hash": row[3],
        "cached_at": row[4],
        "source_file": row[5],
        "metadata": json.loads(row[6]) if row[5] else None,
    }


def is_segment_cached(workspace: Path, analysis_id: str, segment_name: str, content: str) -> bool:
    """Check if a segment is already cached with the same content."""
    cached = get_cached_segment(workspace, analysis_id, segment_name)
    if not cached:
        return False

    return cached["content_hash"] == compute_hash(content)


# ===== Coverage Management =====

def record_coverage(
    workspace: Path,
    analysis_id: str,
    segment_name: str,
    source_start: int | None = None,
    source_end: int | None = None,
    coverage_type: str | None = None,
) -> None:
    """Record coverage information."""
    db_path = get_db_path(workspace)
    init_db(db_path)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO coverage (analysis_id, segment_name, source_start, source_end, coverage_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        analysis_id,
        segment_name,
        source_start,
        source_end,
        coverage_type,
        now_utc(),
    ))

    conn.commit()
    conn.close()


def get_coverage(workspace: Path, analysis_id: str) -> list[dict[str, Any]]:
    """Get coverage information for an analysis."""
    db_path = get_db_path(workspace)
    if not db_path.is_file():
        return []

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM coverage WHERE analysis_id = ? ORDER BY source_start
    """, (analysis_id,))

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "analysis_id": row[1],
            "segment_name": row[2],
            "source_start": row[3],
            "source_end": row[4],
            "coverage_type": row[5],
            "created_at": row[6],
        }
        for row in rows
    ]


# ===== Retrieval =====

def retrieve_segments(
    workspace: Path,
    analysis_id: str,
    query: str | None = None,
    max_chars: int = 4000,
) -> str:
    """Retrieve segments for context assembly."""
    segments = list_segments(workspace, analysis_id)

    if not segments:
        return ""

    # Simple retrieval: concatenate all segments
    parts = []
    total_chars = 0

    for seg in segments:
        content = read_segment(workspace, analysis_id, seg["filename"])
        if not content:
            continue

        # Apply budget
        if total_chars + len(content) > max_chars:
            remaining = max_chars - total_chars
            if remaining > 100:
                content = content[:remaining] + "\n\n[...truncated...]"
            else:
                break

        parts.append(f"## {seg['filename']}\n\n{content}")
        total_chars += len(content)

    return "\n\n---\n\n".join(parts)


# ===== Commands =====

def cmd_list(args: argparse.Namespace) -> int:
    """List segments for an analysis."""
    workspace = Path(args.workspace)
    analysis_id = args.analysis_id

    segments = list_segments(workspace, analysis_id)

    if not segments:
        print(f"no segments found for analysis: {analysis_id}")
        return 0

    if args.format == "json":
        print(json.dumps(segments, indent=2))
    else:
        print(f"Segments for analysis: {analysis_id}")
        for seg in segments:
            print(f"  - {seg['filename']} ({seg['size']:,} bytes, hash: {seg['hash']})")

    return 0


def cmd_read(args: argparse.Namespace) -> int:
    """Read a segment."""
    workspace = Path(args.workspace)
    analysis_id = args.analysis_id
    segment_name = args.segment

    content = read_segment(workspace, analysis_id, segment_name)
    if content is None:
        print(f"error: segment not found: {segment_name}", file=sys.stderr)
        return 1

    print(content)
    return 0


def cmd_write(args: argparse.Namespace) -> int:
    """Write a segment."""
    workspace = Path(args.workspace)
    analysis_id = args.analysis_id
    segment_name = args.segment

    # Read from stdin or file
    if args.input:
        content = Path(args.input).read_text(encoding="utf-8")
    else:
        content = sys.stdin.read()

    write_segment(workspace, analysis_id, segment_name, content)
    cache_segment(workspace, analysis_id, segment_name, content)

    print(f"written segment: {segment_name}")
    return 0


def cmd_retrieve(args: argparse.Namespace) -> int:
    """Retrieve segments for context."""
    workspace = Path(args.workspace)
    analysis_id = args.analysis_id

    context = retrieve_segments(workspace, analysis_id, args.query, args.max_chars or 4000)

    if args.output:
        Path(args.output).write_text(context, encoding="utf-8")
        print(f"context written to: {args.output}")
    else:
        print(context)

    return 0


def cmd_coverage(args: argparse.Namespace) -> int:
    """Show coverage information."""
    workspace = Path(args.workspace)
    analysis_id = args.analysis_id

    coverage = get_coverage(workspace, analysis_id)

    if not coverage:
        print(f"no coverage data for analysis: {analysis_id}")
        return 0

    if args.format == "json":
        print(json.dumps(coverage, indent=2))
    else:
        print(f"Coverage for analysis: {analysis_id}")
        for cov in coverage:
            source_range = ""
            if cov["source_start"] is not None:
                source_range = f" (source: {cov['source_start']}-{cov['source_end'] or '?'})"
            print(f"  - {cov['segment_name']}{source_range} [{cov['coverage_type'] or 'unknown'}]")

    return 0


# ===== Main =====

def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        description="Book analysis retrieval and caching",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--workspace", "-w",
        default=".",
        help="Workspace directory (default: current directory)",
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # list
    list_parser = subparsers.add_parser("list", help="List segments")
    list_parser.add_argument("analysis_id", help="Analysis ID")
    list_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

    # read
    read_parser = subparsers.add_parser("read", help="Read a segment")
    read_parser.add_argument("analysis_id", help="Analysis ID")
    read_parser.add_argument("segment", help="Segment name")

    # write
    write_parser = subparsers.add_parser("write", help="Write a segment")
    write_parser.add_argument("analysis_id", help="Analysis ID")
    write_parser.add_argument("segment", help="Segment name")
    write_parser.add_argument("--input", "-i", help="Input file (default: stdin)")

    # retrieve
    retrieve_parser = subparsers.add_parser("retrieve", help="Retrieve segments")
    retrieve_parser.add_argument("analysis_id", help="Analysis ID")
    retrieve_parser.add_argument("--query", "-q", help="Search query")
    retrieve_parser.add_argument("--max-chars", type=int, default=4000, help="Max characters")
    retrieve_parser.add_argument("--output", "-o", help="Output file")

    # coverage
    coverage_parser = subparsers.add_parser("coverage", help="Show coverage")
    coverage_parser.add_argument("analysis_id", help="Analysis ID")
    coverage_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

    return parser


def main() -> int:
    """Main entry point."""
    configure_utf8_output()

    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    commands = {
        "list": cmd_list,
        "read": cmd_read,
        "write": cmd_write,
        "retrieve": cmd_retrieve,
        "coverage": cmd_coverage,
    }

    cmd_func = commands.get(args.command)
    if not cmd_func:
        print(f"error: unknown command: {args.command}", file=sys.stderr)
        return 1

    try:
        return cmd_func(args)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
