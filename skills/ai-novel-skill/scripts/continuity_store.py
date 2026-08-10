#!/usr/bin/env python3
"""YAML-based continuity store management.

This script manages YAML-based continuity data (facts, payoffs, resources,
character-state). It provides validation, indexing, and rebuild capabilities.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


# ===== Constants =====

CONTINUITY_FILES = {
    "facts": "facts.yaml",
    "payoffs": "payoffs.yaml",
    "resources": "resources.yaml",
    "character-state": "character-state.yaml",
}

VALID_FACT_CATEGORIES = {"completed", "revealed", "planted", "abandoned"}
VALID_FACT_STATUSES = {"active", "resolved", "abandoned"}
VALID_PAYOFF_STATUSES = {"planted", "partially_harvested", "harvested", "abandoned"}
VALID_RESOURCE_TYPES = {"item", "ability", "relationship", "knowledge", "location"}
VALID_RESOURCE_STATUSES = {"in_possession", "lost", "consumed", "active", "inactive"}


# ===== Utility Functions =====

def now_utc() -> str:
    """Return current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def configure_utf8_output() -> None:
    """Configure UTF-8 output for stdout and stderr."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


# ===== Validation =====

def validate_facts(data: Any) -> list[str]:
    """Validate facts.yaml structure."""
    errors = []

    if not isinstance(data, list):
        errors.append("facts.yaml must contain a list")
        return errors

    seen_ids = set()
    for i, item in enumerate(data):
        prefix = f"facts[{i}]"

        if not isinstance(item, dict):
            errors.append(f"{prefix}: must be a mapping")
            continue

        # Check required fields
        if "id" not in item:
            errors.append(f"{prefix}: missing 'id'")
        else:
            if item["id"] in seen_ids:
                errors.append(f"{prefix}: duplicate id '{item['id']}'")
            seen_ids.add(item["id"])

        if "text" not in item:
            errors.append(f"{prefix}: missing 'text'")

        # Validate enums
        if "category" in item and item["category"] not in VALID_FACT_CATEGORIES:
            errors.append(f"{prefix}: invalid category '{item['category']}'")

        if "status" in item and item["status"] not in VALID_FACT_STATUSES:
            errors.append(f"{prefix}: invalid status '{item['status']}'")

    return errors


def validate_payoffs(data: Any) -> list[str]:
    """Validate payoffs.yaml structure."""
    errors = []

    if not isinstance(data, list):
        errors.append("payoffs.yaml must contain a list")
        return errors

    seen_ids = set()
    for i, item in enumerate(data):
        prefix = f"payoffs[{i}]"

        if not isinstance(item, dict):
            errors.append(f"{prefix}: must be a mapping")
            continue

        # Check required fields
        if "id" not in item:
            errors.append(f"{prefix}: missing 'id'")
        else:
            if item["id"] in seen_ids:
                errors.append(f"{prefix}: duplicate id '{item['id']}'")
            seen_ids.add(item["id"])

        if "text" not in item:
            errors.append(f"{prefix}: missing 'text'")

        # Validate enums
        if "status" in item and item["status"] not in VALID_PAYOFF_STATUSES:
            errors.append(f"{prefix}: invalid status '{item['status']}'")

    return errors


def validate_resources(data: Any) -> list[str]:
    """Validate resources.yaml structure."""
    errors = []

    if not isinstance(data, list):
        errors.append("resources.yaml must contain a list")
        return errors

    seen_ids = set()
    for i, item in enumerate(data):
        prefix = f"resources[{i}]"

        if not isinstance(item, dict):
            errors.append(f"{prefix}: must be a mapping")
            continue

        # Check required fields
        if "id" not in item:
            errors.append(f"{prefix}: missing 'id'")
        else:
            if item["id"] in seen_ids:
                errors.append(f"{prefix}: duplicate id '{item['id']}'")
            seen_ids.add(item["id"])

        if "text" not in item:
            errors.append(f"{prefix}: missing 'text'")

        # Validate enums
        if "type" in item and item["type"] not in VALID_RESOURCE_TYPES:
            errors.append(f"{prefix}: invalid type '{item['type']}'")

        if "status" in item and item["status"] not in VALID_RESOURCE_STATUSES:
            errors.append(f"{prefix}: invalid status '{item['status']}'")

    return errors


def validate_character_state(data: Any) -> list[str]:
    """Validate character-state.yaml structure."""
    errors = []

    if not isinstance(data, list):
        errors.append("character-state.yaml must contain a list")
        return errors

    seen_ids = set()
    for i, item in enumerate(data):
        prefix = f"character-state[{i}]"

        if not isinstance(item, dict):
            errors.append(f"{prefix}: must be a mapping")
            continue

        # Check required fields
        if "character_id" not in item:
            errors.append(f"{prefix}: missing 'character_id'")
        else:
            if item["character_id"] in seen_ids:
                errors.append(f"{prefix}: duplicate character_id '{item['character_id']}'")
            seen_ids.add(item["character_id"])

        if "name" not in item:
            errors.append(f"{prefix}: missing 'name'")

        # Validate relationships
        relationships = item.get("relationships", [])
        if not isinstance(relationships, list):
            errors.append(f"{prefix}: 'relationships' must be a list")
        else:
            for j, rel in enumerate(relationships):
                rel_prefix = f"{prefix}.relationships[{j}]"
                if not isinstance(rel, dict):
                    errors.append(f"{rel_prefix}: must be a mapping")
                    continue
                if "target" not in rel:
                    errors.append(f"{rel_prefix}: missing 'target'")
                if "type" not in rel:
                    errors.append(f"{rel_prefix}: missing 'type'")

    return errors


VALIDATORS = {
    "facts": validate_facts,
    "payoffs": validate_payoffs,
    "resources": validate_resources,
    "character-state": validate_character_state,
}


# ===== Indexing =====

def build_index(workspace: Path, db_path: Path | None = None) -> None:
    """Build SQLite index from YAML files."""
    if db_path is None:
        db_path = workspace / "continuity" / "index.sqlite3"

    # Ensure directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Remove existing index
    if db_path.is_file():
        db_path.unlink()

    # Create new index
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS facts (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            category TEXT,
            chapter_order INTEGER,
            source TEXT,
            status TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payoffs (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            planted_chapter INTEGER,
            harvest_chapter INTEGER,
            status TEXT,
            related_facts TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resources (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            type TEXT,
            acquired_chapter INTEGER,
            lost_chapter INTEGER,
            status TEXT,
            owner TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS character_state (
            character_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            current_status TEXT,
            last_updated_chapter INTEGER,
            relationships TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)

    conn.commit()

    # Index YAML files
    continuity_dir = workspace / "continuity"
    if not continuity_dir.is_dir():
        print(f"warning: continuity directory not found: {continuity_dir}", file=sys.stderr)
        conn.close()
        return

    now = now_utc()

    # Index facts
    facts_path = continuity_dir / "facts.yaml"
    if facts_path.is_file():
        data = yaml.safe_load(facts_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "id" in item:
                    cursor.execute("""
                        INSERT OR REPLACE INTO facts (id, text, category, chapter_order, source, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.get("id"),
                        item.get("text", ""),
                        item.get("category"),
                        item.get("chapter_order"),
                        item.get("source"),
                        item.get("status", "active"),
                        item.get("created_at", now),
                        now,
                    ))
            conn.commit()
            print(f"indexed {len(data)} facts")

    # Index payoffs
    payoffs_path = continuity_dir / "payoffs.yaml"
    if payoffs_path.is_file():
        data = yaml.safe_load(payoffs_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "id" in item:
                    cursor.execute("""
                        INSERT OR REPLACE INTO payoffs (id, text, planted_chapter, harvest_chapter, status, related_facts, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.get("id"),
                        item.get("text", ""),
                        item.get("planted_chapter"),
                        item.get("harvest_chapter"),
                        item.get("status", "planted"),
                        json.dumps(item.get("related_facts", [])),
                        item.get("created_at", now),
                        now,
                    ))
            conn.commit()
            print(f"indexed {len(data)} payoffs")

    # Index resources
    resources_path = continuity_dir / "resources.yaml"
    if resources_path.is_file():
        data = yaml.safe_load(resources_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "id" in item:
                    cursor.execute("""
                        INSERT OR REPLACE INTO resources (id, text, type, acquired_chapter, lost_chapter, status, owner, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.get("id"),
                        item.get("text", ""),
                        item.get("type"),
                        item.get("acquired_chapter"),
                        item.get("lost_chapter"),
                        item.get("status", "active"),
                        item.get("owner"),
                        item.get("created_at", now),
                        now,
                    ))
            conn.commit()
            print(f"indexed {len(data)} resources")

    # Index character state
    char_state_path = continuity_dir / "character-state.yaml"
    if char_state_path.is_file():
        data = yaml.safe_load(char_state_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "character_id" in item:
                    cursor.execute("""
                        INSERT OR REPLACE INTO character_state (character_id, name, current_status, last_updated_chapter, relationships, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.get("character_id"),
                        item.get("name", ""),
                        item.get("current_status"),
                        item.get("last_updated_chapter"),
                        json.dumps(item.get("relationships", [])),
                        item.get("created_at", now),
                        now,
                    ))
            conn.commit()
            print(f"indexed {len(data)} character states")

    conn.close()
    print(f"index built: {db_path}")


# ===== Commands =====

def cmd_validate(args: argparse.Namespace) -> int:
    """Validate continuity YAML files."""
    workspace = Path(args.workspace)
    continuity_dir = workspace / "continuity"

    if not continuity_dir.is_dir():
        print(f"error: continuity directory not found: {continuity_dir}", file=sys.stderr)
        return 1

    all_errors = []

    for name, filename in CONTINUITY_FILES.items():
        file_path = continuity_dir / filename
        if not file_path.is_file():
            print(f"warning: {filename} not found, skipping", file=sys.stderr)
            continue

        try:
            data = yaml.safe_load(file_path.read_text(encoding="utf-8"))
        except yaml.YAMLError as e:
            all_errors.append(f"{filename}: YAML parse error: {e}")
            continue

        validator = VALIDATORS.get(name)
        if validator:
            errors = validator(data)
            all_errors.extend(f"{filename}: {err}" for err in errors)

    if all_errors:
        for error in all_errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print("continuity validation passed")
    return 0


def cmd_build(args: argparse.Namespace) -> int:
    """Build SQLite index from YAML files."""
    workspace = Path(args.workspace)
    db_path = Path(args.db) if args.db else None

    try:
        build_index(workspace, db_path)
        return 0
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


def cmd_rebuild(args: argparse.Namespace) -> int:
    """Rebuild index from YAML files (same as build, but removes existing)."""
    workspace = Path(args.workspace)
    db_path = Path(args.db) if args.db else workspace / "continuity" / "index.sqlite3"

    # Remove existing index
    if db_path.is_file():
        db_path.unlink()
        print(f"removed existing index: {db_path}")

    # Build new index
    return cmd_build(args)


def cmd_query(args: argparse.Namespace) -> int:
    """Query the SQLite index."""
    workspace = Path(args.workspace)
    db_path = Path(args.db) if args.db else workspace / "continuity" / "index.sqlite3"

    if not db_path.is_file():
        print(f"error: index not found: {db_path}", file=sys.stderr)
        print("run 'build' command first", file=sys.stderr)
        return 1

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    if args.type == "facts":
        if args.id:
            cursor.execute("SELECT * FROM facts WHERE id = ?", (args.id,))
        else:
            cursor.execute("SELECT * FROM facts")
    elif args.type == "payoffs":
        if args.id:
            cursor.execute("SELECT * FROM payoffs WHERE id = ?", (args.id,))
        else:
            cursor.execute("SELECT * FROM payoffs")
    elif args.type == "resources":
        if args.id:
            cursor.execute("SELECT * FROM resources WHERE id = ?", (args.id,))
        else:
            cursor.execute("SELECT * FROM resources")
    elif args.type == "characters":
        if args.id:
            cursor.execute("SELECT * FROM character_state WHERE character_id = ?", (args.id,))
        else:
            cursor.execute("SELECT * FROM character_state")
    else:
        print(f"error: unknown type: {args.type}", file=sys.stderr)
        conn.close()
        return 1

    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]

    if args.format == "json":
        result = [dict(zip(columns, row)) for row in rows]
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        for row in rows:
            print(dict(zip(columns, row)))
            print()

    conn.close()
    return 0


# ===== Main =====

def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        description="YAML-based continuity store management",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--workspace", "-w",
        default=".",
        help="Workspace directory (default: current directory)",
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # validate
    subparsers.add_parser("validate", help="Validate continuity YAML files")

    # build
    build_parser = subparsers.add_parser("build", help="Build SQLite index")
    build_parser.add_argument("--db", help="Database path (default: continuity/index.sqlite3)")

    # rebuild
    rebuild_parser = subparsers.add_parser("rebuild", help="Rebuild index from YAML")
    rebuild_parser.add_argument("--db", help="Database path")

    # query
    query_parser = subparsers.add_parser("query", help="Query the index")
    query_parser.add_argument("type", choices=["facts", "payoffs", "resources", "characters"], help="Type to query")
    query_parser.add_argument("--id", "-i", help="ID to query")
    query_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

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
        "validate": cmd_validate,
        "build": cmd_build,
        "rebuild": cmd_rebuild,
        "query": cmd_query,
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
