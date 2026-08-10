#!/usr/bin/env python3
"""Cross-book asset graph management.

This script manages a private asset library for sharing IP, characters,
world settings, and other assets across multiple novels.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


# ===== Constants =====

SCHEMA_VERSION = 1
VALID_NAMESPACES = {"reusable", "universe"}
VALID_ASSET_TYPES = {
    "character", "world", "item", "ability", "event",
    "mechanic", "template", "pattern", "research",
}
VALID_STATUSES = {"draft", "published", "deprecated", "archived"}
VALID_GOVERNANCE = {"author_approval", "codex_delegated"}
VALID_IMPORT_MODES = {"fork", "sync"}
VALID_LINK_STATUSES = {"synced", "update_available", "conflict", "forked"}


# ===== Utility Functions =====

def now_utc() -> str:
    """Return current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def configure_utf8_output() -> None:
    """Configure UTF-8 output for stdout and stderr."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")


def compute_hash(content: str) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def generate_id() -> str:
    """Generate a unique ID."""
    return str(uuid.uuid4())[:8]


# ===== Library Management =====

def library_path(root: Path) -> Path:
    """Return path to library.yaml."""
    return root / "library.yaml"


def read_library(root: Path) -> dict[str, Any]:
    """Read library.yaml."""
    path = library_path(root)
    if not path.is_file():
        raise ValueError(f"library not found: {path}")

    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("library.yaml must contain a mapping")

    return data


def write_library(root: Path, data: dict[str, Any]) -> None:
    """Write library.yaml."""
    path = library_path(root)
    path.write_text(yaml.dump(data, allow_unicode=True, default_flow_style=False), encoding="utf-8")


def asset_path(root: Path, asset_id: str) -> Path:
    """Return path to an asset file."""
    return root / "assets" / f"{asset_id}.yaml"


def read_asset(root: Path, asset_id: str) -> dict[str, Any]:
    """Read an asset file."""
    path = asset_path(root, asset_id)
    if not path.is_file():
        raise ValueError(f"asset not found: {asset_id}")

    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"asset {asset_id} must contain a mapping")

    return data


def write_asset(root: Path, asset_id: str, data: dict[str, Any]) -> None:
    """Write an asset file."""
    path = asset_path(root, asset_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.dump(data, allow_unicode=True, default_flow_style=False), encoding="utf-8")


# ===== Validation =====

def validate_asset(data: dict[str, Any]) -> list[str]:
    """Validate an asset."""
    errors = []

    # Required fields
    required = ["id", "namespace", "type", "version", "status", "content"]
    for field in required:
        if field not in data:
            errors.append(f"missing required field: {field}")

    # Validate namespace
    if "namespace" in data and data["namespace"] not in VALID_NAMESPACES:
        errors.append(f"invalid namespace: {data['namespace']}")

    # Validate type
    if "type" in data and data["type"] not in VALID_ASSET_TYPES:
        errors.append(f"invalid type: {data['type']}")

    # Validate status
    if "status" in data and data["status"] not in VALID_STATUSES:
        errors.append(f"invalid status: {data['status']}")

    # Validate governance
    if "governance" in data and data["governance"] not in VALID_GOVERNANCE:
        errors.append(f"invalid governance: {data['governance']}")

    # Validate content structure
    content = data.get("content", {})
    if not isinstance(content, dict):
        errors.append("content must be a mapping")
    else:
        if "name" not in content:
            errors.append("content must have a 'name' field")

    return errors


# ===== Graph Operations =====

def build_graph(root: Path) -> None:
    """Build asset graph from published assets."""
    graph_dir = root / "graph"
    graph_dir.mkdir(parents=True, exist_ok=True)

    nodes_path = graph_dir / "nodes.jsonl"
    edges_path = graph_dir / "edges.jsonl"

    # Collect all published assets
    assets_dir = root / "assets"
    if not assets_dir.is_dir():
        print("warning: no assets directory", file=sys.stderr)
        return

    nodes = []
    edges = []

    for asset_file in sorted(assets_dir.glob("*.yaml")):
        try:
            data = yaml.safe_load(asset_file.read_text(encoding="utf-8"))
        except yaml.YAMLError as e:
            print(f"warning: failed to parse {asset_file.name}: {e}", file=sys.stderr)
            continue

        if not isinstance(data, dict):
            continue

        # Only include published assets
        if data.get("status") != "published":
            continue

        asset_id = data.get("id")
        if not asset_id:
            continue

        # Create node
        node = {
            "id": asset_id,
            "type": data.get("type"),
            "namespace": data.get("namespace"),
            "name": data.get("content", {}).get("name", ""),
            "version": data.get("version"),
            "status": data.get("status"),
        }
        nodes.append(node)

        # Create edges from relationships
        relationships = data.get("relationships", [])
        for rel in relationships:
            if isinstance(rel, dict) and "target" in rel:
                edge = {
                    "source": asset_id,
                    "target": rel["target"],
                    "type": rel.get("type", "related"),
                    "evidence": rel.get("evidence"),
                }
                edges.append(edge)

    # Write nodes
    with open(nodes_path, "w", encoding="utf-8") as f:
        for node in nodes:
            f.write(json.dumps(node, ensure_ascii=False) + "\n")

    # Write edges
    with open(edges_path, "w", encoding="utf-8") as f:
        for edge in edges:
            f.write(json.dumps(edge, ensure_ascii=False) + "\n")

    print(f"built graph: {len(nodes)} nodes, {len(edges)} edges")


def query_neighbors(root: Path, node_id: str, depth: int = 2) -> list[dict[str, Any]]:
    """Query neighbors of a node in the graph."""
    graph_dir = root / "graph"
    nodes_path = graph_dir / "nodes.jsonl"
    edges_path = graph_dir / "edges.jsonl"

    if not nodes_path.is_file() or not edges_path.is_file():
        return []

    # Load graph
    nodes = {}
    with open(nodes_path, encoding="utf-8") as f:
        for line in f:
            node = json.loads(line)
            nodes[node["id"]] = node

    edges = []
    with open(edges_path, encoding="utf-8") as f:
        for line in f:
            edges.append(json.loads(line))

    # BFS to find neighbors
    visited = set()
    queue = [(node_id, 0)]
    result = []

    while queue:
        current_id, current_depth = queue.pop(0)

        if current_id in visited or current_depth > depth:
            continue

        visited.add(current_id)

        if current_id != node_id and current_id in nodes:
            result.append({
                "id": current_id,
                "depth": current_depth,
                **nodes[current_id],
            })

        # Find neighbors
        for edge in edges:
            if edge["source"] == current_id and edge["target"] not in visited:
                queue.append((edge["target"], current_depth + 1))
            elif edge["target"] == current_id and edge["source"] not in visited:
                queue.append((edge["source"], current_depth + 1))

    return result


# ===== Commands =====

def cmd_init(args: argparse.Namespace) -> int:
    """Initialize a new asset library."""
    root = Path(args.library)

    if root.exists() and any(root.iterdir()):
        if not args.force:
            print(f"error: library already exists: {root}", file=sys.stderr)
            return 1

    # Create directory structure
    (root / "assets").mkdir(parents=True, exist_ok=True)
    (root / "graph").mkdir(parents=True, exist_ok=True)

    # Create library.yaml
    library_data = {
        "schema_version": SCHEMA_VERSION,
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "universe_id": args.universe_id or root.name,
        "universe_governance": "author_approval",
    }
    write_library(root, library_data)

    print(f"initialized library: {root}")
    return 0


def cmd_publish(args: argparse.Namespace) -> int:
    """Publish an asset to the library."""
    root = Path(args.library)

    # Read asset
    asset_file = Path(args.asset)
    if not asset_file.is_file():
        print(f"error: asset file not found: {asset_file}", file=sys.stderr)
        return 1

    try:
        data = yaml.safe_load(asset_file.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        print(f"error: failed to parse asset: {e}", file=sys.stderr)
        return 1

    # Validate
    errors = validate_asset(data)
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    asset_id = data["id"]

    # Check governance
    governance = data.get("governance", "author_approval")
    if governance == "author_approval" and not args.author_approved:
        print(f"error: asset requires author approval", file=sys.stderr)
        print("use --author-approved to approve", file=sys.stderr)
        return 1

    # Compute content hash
    content_str = yaml.dump(data.get("content", {}), allow_unicode=True)
    data["content_hash"] = compute_hash(content_str)

    # Update metadata
    data["published_at"] = now_utc()
    data["status"] = "published"

    # Write to library
    write_asset(root, asset_id, data)

    # Rebuild graph
    build_graph(root)

    print(f"published asset: {asset_id}")
    return 0


def cmd_import(args: argparse.Namespace) -> int:
    """Import an asset from the library to a workspace."""
    root = Path(args.library)
    workspace = Path(args.workspace)

    asset_id = args.asset_id
    mode = args.mode

    # Read asset from library
    try:
        asset_data = read_asset(root, asset_id)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    # Read library
    try:
        library_data = read_library(root)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    # Create workspace continuity directory if needed
    continuity_dir = workspace / "continuity"
    continuity_dir.mkdir(parents=True, exist_ok=True)

    # Create asset-links.yaml if needed
    links_path = continuity_dir / "asset-links.yaml"
    if links_path.is_file():
        links = yaml.safe_load(links_path.read_text(encoding="utf-8")) or {}
    else:
        links = {}

    # Create cross-book-assets directory if needed
    cross_book_dir = workspace / "cross-book-assets"
    cross_book_dir.mkdir(parents=True, exist_ok=True)

    # Save workspace snapshot
    snapshot_path = cross_book_dir / f"{asset_id}.yaml"
    snapshot_data = {
        "asset_id": asset_id,
        "library_version": asset_data.get("version"),
        "library_hash": asset_data.get("content_hash"),
        "imported_at": now_utc(),
        "import_mode": mode,
        "content": asset_data.get("content", {}),
    }
    snapshot_path.write_text(yaml.dump(snapshot_data, allow_unicode=True, default_flow_style=False), encoding="utf-8")

    # Update links
    links[asset_id] = {
        "mode": mode,
        "library_version": asset_data.get("version"),
        "library_hash": asset_data.get("content_hash"),
        "workspace_snapshot": snapshot_path.as_posix(),
        "status": "synced",
        "imported_at": now_utc(),
    }

    links_path.write_text(yaml.dump(links, allow_unicode=True, default_flow_style=False), encoding="utf-8")

    print(f"imported asset: {asset_id} (mode: {mode})")
    return 0


def cmd_build(args: argparse.Namespace) -> int:
    """Build asset graph."""
    root = Path(args.library)

    try:
        build_graph(root)
        return 0
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


def cmd_neighbors(args: argparse.Namespace) -> int:
    """Query neighbors of an asset."""
    root = Path(args.library)
    node_id = args.node_id
    depth = args.depth or 2

    neighbors = query_neighbors(root, node_id, depth)

    if not neighbors:
        print(f"no neighbors found for: {node_id}")
        return 0

    if args.format == "json":
        print(json.dumps(neighbors, indent=2, ensure_ascii=False))
    else:
        print(f"neighbors of {node_id}:")
        for n in neighbors:
            print(f"  - {n['id']} (depth {n['depth']}): {n.get('name', 'unnamed')}")

    return 0


def cmd_context(args: argparse.Namespace) -> int:
    """Get context for assets in a workspace."""
    root = Path(args.library)
    workspace = Path(args.workspace)
    asset_ids = [a.strip() for a in args.assets.split(",")]

    # Load workspace snapshot
    neighbors = []
    for asset_id in asset_ids:
        asset_neighbors = query_neighbors(root, asset_id, args.max_depth or 2)
        neighbors.extend(asset_neighbors)

    # Deduplicate
    seen = set()
    unique_neighbors = []
    for n in neighbors:
        if n["id"] not in seen:
            seen.add(n["id"])
            unique_neighbors.append(n)

    # Build context
    context_parts = []
    for n in unique_neighbors[:10]:  # Limit to 10 items
        context_parts.append(f"## {n.get('name', n['id'])}\n\nType: {n.get('type')}\nNamespace: {n.get('namespace')}")

    context = "\n\n---\n\n".join(context_parts)

    # Apply budget
    max_chars = args.max_chars or 4000
    if len(context) > max_chars:
        context = context[:max_chars] + "\n\n[...truncated...]"

    if args.output:
        Path(args.output).write_text(context, encoding="utf-8")
        print(f"context written to: {args.output}")
    else:
        print(context)

    return 0


def cmd_timeline(args: argparse.Namespace) -> int:
    """Show timeline of universe events."""
    root = Path(args.library)

    # Find all universe events
    assets_dir = root / "assets"
    if not assets_dir.is_dir():
        print("error: no assets directory", file=sys.stderr)
        return 1

    events = []
    for asset_file in sorted(assets_dir.glob("*.yaml")):
        try:
            data = yaml.safe_load(asset_file.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue

        if not isinstance(data, dict):
            continue

        if data.get("namespace") == "universe" and data.get("type") == "event":
            content = data.get("content", {})
            sequence = content.get("sequence")
            if sequence is not None:
                events.append({
                    "id": data.get("id"),
                    "name": content.get("name", ""),
                    "sequence": sequence,
                    "participants": content.get("participants", []),
                    "effects": content.get("effects", []),
                })

    # Sort by sequence
    events.sort(key=lambda x: x["sequence"])

    if not events:
        print("no universe events found")
        return 0

    if args.format == "json":
        print(json.dumps(events, indent=2, ensure_ascii=False))
    else:
        print("Timeline:")
        for event in events:
            print(f"  {event['sequence']:3d}. {event['name']} ({event['id']})")
            print(f"      Participants: {', '.join(event['participants'])}")
            print(f"      Effects: {', '.join(event['effects'])}")
            print()

    return 0


# ===== Main =====

def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        description="Cross-book asset graph management",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--library", "-l",
        default="libraries",
        help="Library directory (default: libraries)",
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # init
    init_parser = subparsers.add_parser("init", help="Initialize a new library")
    init_parser.add_argument("--universe-id", help="Universe ID")
    init_parser.add_argument("--force", "-f", action="store_true", help="Force reinitialize")

    # publish
    publish_parser = subparsers.add_parser("publish", help="Publish an asset")
    publish_parser.add_argument("asset", help="Asset file path")
    publish_parser.add_argument("--author-approved", action="store_true", help="Author has approved")

    # import
    import_parser = subparsers.add_parser("import", help="Import asset to workspace")
    import_parser.add_argument("asset_id", help="Asset ID to import")
    import_parser.add_argument("--workspace", "-w", required=True, help="Target workspace")
    import_parser.add_argument("--mode", choices=["fork", "sync"], default="fork", help="Import mode")

    # build
    subparsers.add_parser("build", help="Build asset graph")

    # neighbors
    neighbors_parser = subparsers.add_parser("neighbors", help="Query neighbors")
    neighbors_parser.add_argument("node_id", help="Node ID to query")
    neighbors_parser.add_argument("--depth", "-d", type=int, default=2, help="Query depth")
    neighbors_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

    # context
    context_parser = subparsers.add_parser("context", help="Get context for assets")
    context_parser.add_argument("assets", help="Comma-separated asset IDs")
    context_parser.add_argument("--workspace", "-w", required=True, help="Workspace directory")
    context_parser.add_argument("--max-depth", type=int, default=2, help="Max depth")
    context_parser.add_argument("--max-chars", type=int, default=4000, help="Max characters")
    context_parser.add_argument("--output", "-o", help="Output file")

    # timeline
    timeline_parser = subparsers.add_parser("timeline", help="Show universe timeline")
    timeline_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

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
        "init": cmd_init,
        "publish": cmd_publish,
        "import": cmd_import,
        "build": cmd_build,
        "neighbors": cmd_neighbors,
        "context": cmd_context,
        "timeline": cmd_timeline,
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
