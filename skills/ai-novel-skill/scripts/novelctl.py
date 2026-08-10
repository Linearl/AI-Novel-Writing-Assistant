#!/usr/bin/env python3
"""Deterministic controller for Codex-native novel workspaces.

This script handles workspace initialization, validation, recovery,
and context assembly. It only manages deterministic state - creative
decisions are made by Claude.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


# ===== Constants =====

SCHEMA_VERSION = 3
SUPPORTED_READ_VERSIONS = {1, 2, 3}
ARTIFACT_STATUSES = {"missing", "in_progress", "ready", "stale", "blocked"}
DIRECTOR_MODES = {"milestone_approval", "auto"}
DIRECTOR_STATUSES = {"idle", "running", "waiting_approval", "blocked", "completed"}
APPROVALS = {"required", "approved", "delegated", "not_required"}
MILESTONE_STEPS = {"novel_brief", "story_bible", "volume_strategy"}
CHAPTER_STEPS = {
    "chapter_plan",
    "context_package",
    "chapter_draft",
    "humanization_revision",
    "chapter_review",
    "chapter_repair",
    "continuity_update",
}
STEP_ORDER = {
    "novel_brief": 10,
    "story_bible": 20,
    "world_bible": 30,
    "character_roster": 31,
    "volume_strategy": 40,
    "volume_skeleton": 50,
    "beat_sheet": 60,
    "chapter_plan": 70,
    "context_package": 80,
    "chapter_draft": 90,
    "humanization_revision": 100,
    "chapter_review": 110,
    "chapter_repair": 120,
    "continuity_update": 130,
}
CHAPTER_TARGET = re.compile(r"^chapter[_-](\d+)$")
SAFE_NAME = re.compile(r"^[a-z][a-z0-9_.-]{1,63}$")


# ===== Utility Functions =====

def now_utc() -> str:
    """Return current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def configure_utf8_output() -> None:
    """Configure UTF-8 output for stdout and stderr."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


def safe_relative_path(value: str) -> str:
    """Validate and normalize a workspace-relative path."""
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("artifact path must be workspace-relative and cannot contain '..'")
    normalized = path.as_posix().strip("/")
    if not normalized:
        raise ValueError("artifact path cannot be empty")
    return normalized


def compute_hash(content: str) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


# ===== State Management =====

def state_path(workspace: Path) -> Path:
    """Return path to novel-state.yaml."""
    return workspace / "novel-state.yaml"


def read_state(workspace: Path) -> dict[str, Any]:
    """Read and validate novel-state.yaml."""
    path = state_path(workspace)
    if not path.is_file():
        raise ValueError(f"missing state file: {path}")
    loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(loaded, dict):
        raise ValueError("novel-state.yaml must contain a mapping")
    version = loaded.get("schema_version")
    if version not in SUPPORTED_READ_VERSIONS:
        raise ValueError(f"unsupported schema_version: {version}")
    return loaded


def write_state(workspace: Path, state: dict[str, Any]) -> None:
    """Write novel-state.yaml."""
    path = state_path(workspace)
    path.write_text(yaml.dump(state, allow_unicode=True, default_flow_style=False), encoding="utf-8")


def require_v3(state: dict[str, Any]) -> None:
    """Require schema version 3."""
    if state.get("schema_version") != 3:
        raise ValueError("this command requires schema_version 3")


# ===== Artifact Management =====

def artifact_path(workspace: Path, artifact_type: str, filename: str) -> Path:
    """Return path to an artifact."""
    if artifact_type == "chapters":
        return workspace / "chapters" / filename
    elif artifact_type == "characters":
        return workspace / "characters" / filename
    elif artifact_type == "continuity":
        return workspace / "continuity" / filename
    elif artifact_type == "volumes":
        return workspace / "volumes" / filename
    else:
        return workspace / artifact_type / filename


def list_artifacts(workspace: Path, artifact_type: str) -> list[dict[str, Any]]:
    """List all artifacts of a given type."""
    type_dir = workspace / artifact_type
    if not type_dir.is_dir():
        return []

    artifacts = []
    for file in sorted(type_dir.glob("*.md")):
        stat = file.stat()
        artifacts.append({
            "filename": file.name,
            "path": file.relative_to(workspace).as_posix(),
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        })
    return artifacts


def get_artifact_status(state: dict[str, Any], artifact_type: str, filename: str) -> str:
    """Get the status of an artifact from state."""
    artifacts = state.get("artifacts", {})
    type_artifacts = artifacts.get(artifact_type, {})
    artifact_info = type_artifacts.get(filename, {})
    return artifact_info.get("status", "missing")


def set_artifact_status(state: dict[str, Any], artifact_type: str, filename: str, status: str) -> dict[str, Any]:
    """Set the status of an artifact in state (immutable)."""
    if status not in ARTIFACT_STATUSES:
        raise ValueError(f"invalid status: {status}")

    new_state = state.copy()
    artifacts = new_state.setdefault("artifacts", {})
    type_artifacts = artifacts.setdefault(artifact_type, {})
    type_artifacts[filename] = {
        "status": status,
        "updated_at": now_utc(),
    }
    return new_state


# ===== Commands =====

def cmd_init(args: argparse.Namespace) -> int:
    """Initialize a new novel workspace."""
    workspace = Path(args.workspace)

    if workspace.exists() and any(workspace.iterdir()):
        if not args.force:
            print(f"error: workspace already exists: {workspace}", file=sys.stderr)
            print("use --force to reinitialize", file=sys.stderr)
            return 1
        print(f"warning: reinitializing workspace: {workspace}", file=sys.stderr)

    # Create directory structure
    for dir_name in ["chapters", "characters", "continuity", "volumes", "analyses"]:
        (workspace / dir_name).mkdir(parents=True, exist_ok=True)

    # Create initial state
    state = {
        "schema_version": SCHEMA_VERSION,
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "novel_title": args.title or "Untitled",
        "genre": args.genre or "fantasy",
        "target_words": args.target_words or 500000,
        "current_phase": "planning",
        "current_volume": 0,
        "current_chapter": 0,
        "last_completed_chapter": 0,
        "artifacts": {},
    }
    write_state(workspace, state)

    # Create initial files
    if not (workspace / "novel-brief.md").exists():
        (workspace / "novel-brief.md").write_text(
            f"# Novel Brief\n\n**Title**: {state['novel_title']}\n\n**Genre**: {state['genre']}\n\n**Target Words**: {state['target_words']:,}\n\n",
            encoding="utf-8",
        )

    print(f"initialized workspace: {workspace}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    """Show workspace status."""
    workspace = Path(args.workspace)

    try:
        state = read_state(workspace)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    # Print status
    print(f"Workspace: {workspace}")
    print(f"Title: {state.get('novel_title', 'Untitled')}")
    print(f"Genre: {state.get('genre', 'unknown')}")
    print(f"Phase: {state.get('current_phase', 'unknown')}")
    print(f"Volume: {state.get('current_volume', 0)}")
    print(f"Chapter: {state.get('current_chapter', 0)}")
    print(f"Last Completed: {state.get('last_completed_chapter', 0)}")
    print()

    # List artifacts
    for artifact_type in ["chapters", "characters", "continuity", "volumes"]:
        artifacts = list_artifacts(workspace, artifact_type)
        if artifacts:
            print(f"{artifact_type.capitalize()}:")
            for art in artifacts:
                status = get_artifact_status(state, artifact_type, art["filename"])
                print(f"  - {art['filename']} [{status}] ({art['size']:,} bytes)")
            print()

    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    """Validate workspace state and artifacts."""
    workspace = Path(args.workspace)

    try:
        state = read_state(workspace)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    errors = []

    # Validate schema version
    if state.get("schema_version") not in SUPPORTED_READ_VERSIONS:
        errors.append(f"invalid schema_version: {state.get('schema_version')}")

    # Validate required fields
    required_fields = ["novel_title", "genre", "target_words", "current_phase"]
    for field in required_fields:
        if field not in state:
            errors.append(f"missing required field: {field}")

    # Validate phase
    valid_phases = {"planning", "writing", "revision", "completed"}
    if state.get("current_phase") not in valid_phases:
        errors.append(f"invalid phase: {state.get('current_phase')}")

    # Validate artifacts exist
    for artifact_type in ["chapters", "characters", "continuity", "volumes"]:
        artifacts = list_artifacts(workspace, artifact_type)
        for art in artifacts:
            status = get_artifact_status(state, artifact_type, art["filename"])
            if status == "ready":
                # Check file actually exists
                art_path = workspace / art["path"]
                if not art_path.is_file():
                    errors.append(f"artifact marked ready but missing: {art['path']}")

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print("workspace validation passed")
    return 0


def cmd_recover(args: argparse.Namespace) -> int:
    """Recover from a checkpoint."""
    workspace = Path(args.workspace)

    try:
        state = read_state(workspace)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    require_v3(state)

    # Get checkpoints
    checkpoints = state.get("checkpoints", [])
    if not checkpoints:
        print("no checkpoints available", file=sys.stderr)
        return 1

    # Find target checkpoint
    if args.chapter:
        target = None
        for cp in checkpoints:
            if cp.get("chapter") == args.chapter:
                target = cp
                break
        if not target:
            print(f"checkpoint not found for chapter {args.chapter}", file=sys.stderr)
            return 1
    else:
        # Use latest checkpoint
        target = checkpoints[-1]

    print(f"recovering to checkpoint: chapter {target.get('chapter')}")
    print(f"timestamp: {target.get('timestamp')}")

    # Update state
    new_state = state.copy()
    new_state["current_chapter"] = target.get("chapter", 0)
    new_state["current_phase"] = "writing"
    new_state["updated_at"] = now_utc()
    write_state(workspace, new_state)

    print("recovery completed")
    return 0


def cmd_step(args: argparse.Namespace) -> int:
    """Manage production steps."""
    workspace = Path(args.workspace)

    try:
        state = read_state(workspace)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    require_v3(state)

    if args.action == "list":
        # List all steps and their status
        current_step = state.get("current_step", "novel_brief")
        completed_steps = state.get("completed_steps", [])

        print("Production Steps:")
        for step, order in sorted(STEP_ORDER.items(), key=lambda x: x[1]):
            status = "✓ completed" if step in completed_steps else "○ pending"
            if step == current_step:
                status = "● current"
            print(f"  {order:3d}. {step}: {status}")

        return 0

    elif args.action == "complete":
        if not args.step:
            print("error: --step required for complete action", file=sys.stderr)
            return 1

        step = args.step
        if step not in STEP_ORDER:
            print(f"error: unknown step: {step}", file=sys.stderr)
            return 1

        # Add to completed steps
        completed_steps = state.get("completed_steps", [])
        if step not in completed_steps:
            completed_steps.append(step)

        # Update current step to next
        current_order = STEP_ORDER[step]
        next_step = None
        for s, o in sorted(STEP_ORDER.items(), key=lambda x: x[1]):
            if o > current_order:
                next_step = s
                break

        new_state = state.copy()
        new_state["completed_steps"] = completed_steps
        new_state["current_step"] = next_step or step
        new_state["updated_at"] = now_utc()
        write_state(workspace, new_state)

        print(f"completed step: {step}")
        return 0

    else:
        print(f"error: unknown action: {args.action}", file=sys.stderr)
        return 1


def cmd_context(args: argparse.Namespace) -> int:
    """Assemble context package for a chapter."""
    workspace = Path(args.workspace)

    try:
        state = read_state(workspace)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    require_v3(state)

    chapter = args.chapter
    if chapter < 1:
        print("error: chapter must be >= 1", file=sys.stderr)
        return 1

    # Collect context
    context_parts = []

    # Add novel brief
    brief_path = workspace / "novel-brief.md"
    if brief_path.is_file():
        context_parts.append(f"# Novel Brief\n\n{brief_path.read_text(encoding='utf-8')}")

    # Add story bible
    bible_path = workspace / "story-bible.md"
    if bible_path.is_file():
        context_parts.append(f"# Story Bible\n\n{bible_path.read_text(encoding='utf-8')}")

    # Add world bible
    world_path = workspace / "world-bible.md"
    if world_path.is_file():
        context_parts.append(f"# World Bible\n\n{world_path.read_text(encoding='utf-8')}")

    # Add character roster
    roster_path = workspace / "characters" / "roster.md"
    if roster_path.is_file():
        context_parts.append(f"# Character Roster\n\n{roster_path.read_text(encoding='utf-8')}")

    # Add continuity data
    continuity_dir = workspace / "continuity"
    if continuity_dir.is_dir():
        for file in sorted(continuity_dir.glob("*.yaml")):
            context_parts.append(f"# {file.stem}\n\n```yaml\n{file.read_text(encoding='utf-8')}\n```")

    # Add previous chapter (if exists)
    if chapter > 1:
        prev_chapter = chapter - 1
        prev_path = workspace / "chapters" / f"chapter-{prev_chapter:03d}.md"
        if prev_path.is_file():
            content = prev_path.read_text(encoding="utf-8")
            # Truncate if too long
            if len(content) > 2000:
                content = content[:2000] + "\n\n[...truncated...]"
            context_parts.append(f"# Previous Chapter (Chapter {prev_chapter})\n\n{content}")

    # Assemble context
    context = "\n\n---\n\n".join(context_parts)

    # Apply budget limit (5500 chars)
    max_chars = args.max_chars or 5500
    if len(context) > max_chars:
        context = context[:max_chars] + "\n\n[...truncated to fit budget...]"

    # Output
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(context, encoding="utf-8")
        print(f"context written to: {output_path}")
    else:
        print(context)

    return 0


# ===== Main =====

def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        description="Deterministic controller for Codex-native novel workspaces",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--workspace", "-w",
        default=".",
        help="Workspace directory (default: current directory)",
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # init
    init_parser = subparsers.add_parser("init", help="Initialize a new workspace")
    init_parser.add_argument("--title", "-t", help="Novel title")
    init_parser.add_argument("--genre", "-g", help="Novel genre")
    init_parser.add_argument("--target-words", type=int, help="Target word count")
    init_parser.add_argument("--force", "-f", action="store_true", help="Force reinitialize")

    # status
    subparsers.add_parser("status", help="Show workspace status")

    # validate
    subparsers.add_parser("validate", help="Validate workspace")

    # recover
    recover_parser = subparsers.add_parser("recover", help="Recover from checkpoint")
    recover_parser.add_argument("--chapter", "-c", type=int, help="Chapter to recover to")

    # step
    step_parser = subparsers.add_parser("step", help="Manage production steps")
    step_parser.add_argument("action", choices=["list", "complete"], help="Action to perform")
    step_parser.add_argument("--step", "-s", help="Step name (for complete action)")

    # context
    context_parser = subparsers.add_parser("context", help="Assemble context package")
    context_parser.add_argument("chapter", type=int, help="Chapter number")
    context_parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    context_parser.add_argument("--max-chars", type=int, default=5500, help="Max characters")

    return parser


def main() -> int:
    """Main entry point."""
    configure_utf8_output()

    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    # Map commands to functions
    commands = {
        "init": cmd_init,
        "status": cmd_status,
        "validate": cmd_validate,
        "recover": cmd_recover,
        "step": cmd_step,
        "context": cmd_context,
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
