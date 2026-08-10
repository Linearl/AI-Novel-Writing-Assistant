#!/usr/bin/env python3
"""Token usage tracking and reporting."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def configure_utf8_output() -> None:
    """Configure UTF-8 output for stdout and stderr."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


def now_utc() -> str:
    """Return current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_db_path(workspace: Path) -> Path:
    """Get path to token usage database."""
    return workspace / "token_usage.sqlite3"


def init_db(db_path: Path) -> None:
    """Initialize token usage database."""
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            operation TEXT NOT NULL,
            chapter INTEGER,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            model TEXT,
            provider TEXT,
            cost_usd REAL DEFAULT 0.0,
            metadata TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            period TEXT NOT NULL,
            total_prompt_tokens INTEGER DEFAULT 0,
            total_completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            total_cost_usd REAL DEFAULT 0.0,
            operation_count INTEGER DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()


def record_usage(
    workspace: Path,
    operation: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    chapter: int | None = None,
    model: str | None = None,
    provider: str | None = None,
    cost_usd: float = 0.0,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Record token usage."""
    db_path = get_db_path(workspace)
    init_db(db_path)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    total_tokens = prompt_tokens + completion_tokens

    cursor.execute("""
        INSERT INTO usage (timestamp, operation, chapter, prompt_tokens, completion_tokens, total_tokens, model, provider, cost_usd, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        now_utc(),
        operation,
        chapter,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        model,
        provider,
        cost_usd,
        json.dumps(metadata) if metadata else None,
    ))

    conn.commit()
    conn.close()


def get_summary(workspace: Path, period: str = "all") -> dict[str, Any]:
    """Get usage summary."""
    db_path = get_db_path(workspace)
    if not db_path.is_file():
        return {
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_tokens": 0,
            "total_cost_usd": 0.0,
            "operation_count": 0,
        }

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    if period == "all":
        cursor.execute("""
            SELECT
                SUM(prompt_tokens),
                SUM(completion_tokens),
                SUM(total_tokens),
                SUM(cost_usd),
                COUNT(*)
            FROM usage
        """)
    else:
        # For now, just use all. Could add time-based filtering.
        cursor.execute("""
            SELECT
                SUM(prompt_tokens),
                SUM(completion_tokens),
                SUM(total_tokens),
                SUM(cost_usd),
                COUNT(*)
            FROM usage
        """)

    row = cursor.fetchone()
    conn.close()

    return {
        "total_prompt_tokens": row[0] or 0,
        "total_completion_tokens": row[1] or 0,
        "total_tokens": row[2] or 0,
        "total_cost_usd": row[3] or 0.0,
        "operation_count": row[4] or 0,
    }


def get_by_chapter(workspace: Path) -> list[dict[str, Any]]:
    """Get usage grouped by chapter."""
    db_path = get_db_path(workspace)
    if not db_path.is_file():
        return []

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            chapter,
            SUM(prompt_tokens),
            SUM(completion_tokens),
            SUM(total_tokens),
            SUM(cost_usd),
            COUNT(*)
        FROM usage
        WHERE chapter IS NOT NULL
        GROUP BY chapter
        ORDER BY chapter
    """)

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "chapter": row[0],
            "prompt_tokens": row[1],
            "completion_tokens": row[2],
            "total_tokens": row[3],
            "cost_usd": row[4],
            "operation_count": row[5],
        }
        for row in rows
    ]


def get_by_operation(workspace: Path) -> list[dict[str, Any]]:
    """Get usage grouped by operation."""
    db_path = get_db_path(workspace)
    if not db_path.is_file():
        return []

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            operation,
            SUM(prompt_tokens),
            SUM(completion_tokens),
            SUM(total_tokens),
            SUM(cost_usd),
            COUNT(*)
        FROM usage
        GROUP BY operation
        ORDER BY SUM(total_tokens) DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "operation": row[0],
            "prompt_tokens": row[1],
            "completion_tokens": row[2],
            "total_tokens": row[3],
            "cost_usd": row[4],
            "operation_count": row[5],
        }
        for row in rows
    ]


def main() -> int:
    """Main entry point."""
    configure_utf8_output()

    parser = argparse.ArgumentParser(description="Token usage tracking")
    parser.add_argument("--workspace", "-w", default=".", help="Workspace directory")

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # record
    record_parser = subparsers.add_parser("record", help="Record token usage")
    record_parser.add_argument("operation", help="Operation name")
    record_parser.add_argument("--prompt-tokens", type=int, default=0, help="Prompt tokens")
    record_parser.add_argument("--completion-tokens", type=int, default=0, help="Completion tokens")
    record_parser.add_argument("--chapter", type=int, help="Chapter number")
    record_parser.add_argument("--model", help="Model name")
    record_parser.add_argument("--provider", help="Provider name")
    record_parser.add_argument("--cost", type=float, default=0.0, help="Cost in USD")

    # summary
    summary_parser = subparsers.add_parser("summary", help="Show usage summary")
    summary_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

    # by-chapter
    by_chapter_parser = subparsers.add_parser("by-chapter", help="Show usage by chapter")
    by_chapter_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

    # by-operation
    by_operation_parser = subparsers.add_parser("by-operation", help="Show usage by operation")
    by_operation_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    workspace = Path(args.workspace)

    try:
        if args.command == "record":
            record_usage(
                workspace,
                args.operation,
                args.prompt_tokens,
                args.completion_tokens,
                args.chapter,
                args.model,
                args.provider,
                args.cost,
            )
            print("usage recorded")
            return 0

        elif args.command == "summary":
            summary = get_summary(workspace)
            if args.format == "json":
                print(json.dumps(summary, indent=2))
            else:
                print(f"Total Prompt Tokens: {summary['total_prompt_tokens']:,}")
                print(f"Total Completion Tokens: {summary['total_completion_tokens']:,}")
                print(f"Total Tokens: {summary['total_tokens']:,}")
                print(f"Total Cost: ${summary['total_cost_usd']:.4f}")
                print(f"Operations: {summary['operation_count']}")
            return 0

        elif args.command == "by-chapter":
            data = get_by_chapter(workspace)
            if args.format == "json":
                print(json.dumps(data, indent=2))
            else:
                if not data:
                    print("no data")
                else:
                    print(f"{'Chapter':<10} {'Tokens':<15} {'Cost':<10} {'Ops':<5}")
                    print("-" * 40)
                    for row in data:
                        print(f"{row['chapter']:<10} {row['total_tokens']:<15,} ${row['cost_usd']:<10.4f} {row['operation_count']:<5}")
            return 0

        elif args.command == "by-operation":
            data = get_by_operation(workspace)
            if args.format == "json":
                print(json.dumps(data, indent=2))
            else:
                if not data:
                    print("no data")
                else:
                    print(f"{'Operation':<25} {'Tokens':<15} {'Cost':<10} {'Ops':<5}")
                    print("-" * 55)
                    for row in data:
                        print(f"{row['operation']:<25} {row['total_tokens']:<15,} ${row['cost_usd']:<10.4f} {row['operation_count']:<5}")
            return 0

        else:
            print(f"error: unknown command: {args.command}", file=sys.stderr)
            return 1

    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
