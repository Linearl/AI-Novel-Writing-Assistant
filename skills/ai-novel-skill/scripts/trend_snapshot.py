#!/usr/bin/env python3
"""Validate, summarize, and compare metadata-only ranking snapshots."""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


REQUIRED_FIELDS = (
    "platform",
    "chart",
    "window",
    "captured_at",
    "rank",
    "title",
    "author",
    "source_url",
    "access_level",
)
SIGNAL_DIMENSIONS = {
    "genre",
    "subgenre",
    "protagonist_identity",
    "core_mechanism",
    "emotional_promise",
    "hook_pattern",
    "audience_signal",
}
EVIDENCE_FIELDS = {"title", "tags", "synopsis"}
CONFIDENCE_LEVELS = {"high", "medium", "low"}


class SnapshotError(ValueError):
    """Raised when a snapshot violates the trend data contract."""


def _configure_output() -> None:
    """Configure UTF-8 output."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8")


def _nonempty_string(value: Any) -> bool:
    """Check if value is a non-empty string."""
    return isinstance(value, str) and bool(value.strip())


def _parse_date(value: Any, field: str, line_number: int) -> str:
    """Parse and validate a date field."""
    if not _nonempty_string(value):
        raise SnapshotError(f"line {line_number}: {field} must be a YYYY-MM-DD string")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise SnapshotError(f"line {line_number}: invalid {field}: {value!r}") from exc
    if parsed.isoformat() != value:
        raise SnapshotError(f"line {line_number}: {field} must use YYYY-MM-DD")
    return value


def _validate_url(value: Any, line_number: int) -> None:
    """Validate a URL field."""
    if not _nonempty_string(value):
        raise SnapshotError(f"line {line_number}: source_url must be a public HTTP(S) URL")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SnapshotError(f"line {line_number}: source_url must be a public HTTP(S) URL")


def _field_has_evidence(record: dict[str, Any], field: str) -> bool:
    """Check if a field has evidence."""
    value = record.get(field)
    if field == "tags":
        return isinstance(value, list) and any(_nonempty_string(item) for item in value)
    return _nonempty_string(value)


def _validate_signals(record: dict[str, Any], line_number: int) -> None:
    """Validate signals in a record."""
    signals = record.get("signals", [])
    if not isinstance(signals, list):
        raise SnapshotError(f"line {line_number}: signals must be a list")
    seen: set[tuple[str, str]] = set()
    for index, signal in enumerate(signals, start=1):
        prefix = f"line {line_number}, signal {index}"
        if not isinstance(signal, dict):
            raise SnapshotError(f"{prefix}: signal must be an object")
        dimension = signal.get("dimension")
        value = signal.get("value")
        confidence = signal.get("confidence")
        evidence_fields = signal.get("evidence_fields")
        if dimension not in SIGNAL_DIMENSIONS:
            raise SnapshotError(f"{prefix}: unsupported dimension {dimension!r}")
        if not _nonempty_string(value):
            raise SnapshotError(f"{prefix}: value must be a non-empty string")
        if confidence not in CONFIDENCE_LEVELS:
            raise SnapshotError(f"{prefix}: confidence must be high, medium, or low")
        if not isinstance(evidence_fields, list) or not evidence_fields:
            raise SnapshotError(f"{prefix}: evidence_fields must be a non-empty list")
        if any(field not in EVIDENCE_FIELDS for field in evidence_fields):
            raise SnapshotError(f"{prefix}: evidence_fields may only use title, tags, synopsis")
        if any(not _field_has_evidence(record, field) for field in evidence_fields):
            raise SnapshotError(f"{prefix}: every evidence field must contain source metadata")
        key = (dimension, value.strip().casefold())
        if key in seen:
            raise SnapshotError(f"{prefix}: duplicate signal {dimension}:{value}")
        seen.add(key)


def load_snapshot(path: Path) -> list[dict[str, Any]]:
    """Load and validate a snapshot file."""
    if not path.is_file():
        raise SnapshotError(f"snapshot not found: {path}")
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            if not raw_line.strip():
                continue
            try:
                record = json.loads(raw_line)
            except json.JSONDecodeError as exc:
                raise SnapshotError(f"line {line_number}: invalid JSON: {exc.msg}") from exc
            if not isinstance(record, dict):
                raise SnapshotError(f"line {line_number}: each JSONL entry must be an object")
            _validate_record(record, line_number)
            records.append(record)
    if not records:
        raise SnapshotError("snapshot contains no records")
    _validate_snapshot_consistency(records)
    return records


def _validate_record(record: dict[str, Any], line_number: int) -> None:
    """Validate a single record."""
    missing = [field for field in REQUIRED_FIELDS if field not in record]
    if missing:
        raise SnapshotError(f"line {line_number}: missing required fields: {', '.join(missing)}")
    for field in ("platform", "chart", "window", "title", "author"):
        if not _nonempty_string(record[field]):
            raise SnapshotError(f"line {line_number}: {field} must be a non-empty string")
    _parse_date(record["captured_at"], "captured_at", line_number)
    rank = record["rank"]
    if isinstance(rank, bool) or not isinstance(rank, int) or rank < 1:
        raise SnapshotError(f"line {line_number}: rank must be a positive integer")
    _validate_url(record["source_url"], line_number)
    if record["access_level"] != "metadata_only":
        raise SnapshotError(f"line {line_number}: access_level must be metadata_only")
    if "tags" in record and (
        not isinstance(record["tags"], list)
        or any(not _nonempty_string(item) for item in record["tags"])
    ):
        raise SnapshotError(f"line {line_number}: tags must be a list of non-empty strings")
    _validate_signals(record, line_number)


def _validate_snapshot_consistency(records: list[dict[str, Any]]) -> None:
    """Validate consistency across snapshot records."""
    anchor = records[0]
    for field in ("platform", "chart", "window", "captured_at"):
        values = {str(record[field]).strip().casefold() for record in records}
        if len(values) != 1:
            raise SnapshotError(f"snapshot entries must share one {field}")
    works: set[tuple[str, str]] = set()
    ranks: set[int] = set()
    for record in records:
        work_key = (record["title"].strip().casefold(), record["author"].strip().casefold())
        if work_key in works:
            raise SnapshotError(f"duplicate work: {record['title']} / {record['author']}")
        works.add(work_key)
        if record["rank"] in ranks:
            raise SnapshotError(f"duplicate rank in {anchor['platform']} / {anchor['chart']}: {record['rank']}")
        ranks.add(record["rank"])


def rank_weight(rank: int) -> float:
    """Calculate rank weight using log formula."""
    return 1.0 / math.log2(rank + 1)


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Summarize snapshot records by signal dimensions."""
    groups: dict[tuple[str, str], dict[str, Any]] = {}
    for record in records:
        for signal in record.get("signals", []):
            key = (signal["dimension"], signal["value"].strip().casefold())
            group = groups.setdefault(
                key,
                {
                    "dimension": signal["dimension"],
                    "value": signal["value"].strip(),
                    "works": set(),
                    "platforms": set(),
                    "ranks": [],
                    "rank_weight": 0.0,
                },
            )
            group["works"].add((record["title"].casefold(), record["author"].casefold()))
            group["platforms"].add(record["platform"])
            group["ranks"].append(record["rank"])
            group["rank_weight"] += rank_weight(record["rank"])

    signals = []
    for group in groups.values():
        signals.append(
            {
                "dimension": group["dimension"],
                "value": group["value"],
                "work_count": len(group["works"]),
                "platform_count": len(group["platforms"]),
                "platforms": sorted(group["platforms"]),
                "average_rank": round(sum(group["ranks"]) / len(group["ranks"]), 4),
                "rank_weight": round(group["rank_weight"], 6),
            }
        )
    signals.sort(key=lambda item: (-item["rank_weight"], item["dimension"], item["value"]))

    return {
        "snapshot": {
            "platform": records[0]["platform"],
            "chart": records[0]["chart"],
            "window": records[0]["window"],
            "captured_at": records[0]["captured_at"],
            "entry_count": len(records),
        },
        "ranking_weight_formula": "1 / log2(rank + 1)",
        "signals": signals,
    }


def compare_snapshots(
    baseline: list[dict[str, Any]],
    current: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compare two snapshots and show differences."""
    baseline_summary = summarize(baseline)
    current_summary = summarize(current)

    baseline_signals = {
        (s["dimension"], s["value"]): s
        for s in baseline_summary["signals"]
    }
    current_signals = {
        (s["dimension"], s["value"]): s
        for s in current_summary["signals"]
    }

    new = [current_signals[key] for key in set(current_signals) - set(baseline_signals)]
    disappeared = [baseline_signals[key] for key in set(baseline_signals) - set(current_signals)]

    changed = []
    for key in set(baseline_signals) & set(current_signals):
        b = baseline_signals[key]
        c = current_signals[key]
        if b["rank_weight"] != c["rank_weight"]:
            changed.append({
                "dimension": key[0],
                "value": key[1],
                "old_weight": b["rank_weight"],
                "new_weight": c["rank_weight"],
                "delta": round(c["rank_weight"] - b["rank_weight"], 6),
            })

    new.sort(key=lambda x: -x["rank_weight"])
    disappeared.sort(key=lambda x: -x["rank_weight"])
    changed.sort(key=lambda x: -abs(x["delta"]))

    return {
        "baseline": baseline_summary["snapshot"],
        "current": current_summary["snapshot"],
        "new_signals": new,
        "disappeared_signals": disappeared,
        "changed_signals": changed,
    }


# ===== Commands =====

def cmd_validate(args: argparse.Namespace) -> int:
    """Validate a snapshot file."""
    try:
        records = load_snapshot(Path(args.snapshot))
        print(f"VALID: {len(records)} records")
        return 0
    except SnapshotError as e:
        print(f"INVALID: {e}", file=sys.stderr)
        return 1


def cmd_summarize(args: argparse.Namespace) -> int:
    """Summarize a snapshot file."""
    try:
        records = load_snapshot(Path(args.snapshot))
        summary = summarize(records)
        if args.format == "json":
            print(json.dumps(summary, indent=2, ensure_ascii=False))
        else:
            print(f"Platform: {summary['snapshot']['platform']}")
            print(f"Chart: {summary['snapshot']['chart']}")
            print(f"Window: {summary['snapshot']['window']}")
            print(f"Entries: {summary['snapshot']['entry_count']}")
            print()
            print("Top Signals:")
            for signal in summary["signals"][:10]:
                print(f"  {signal['dimension']}: {signal['value']} (weight: {signal['rank_weight']:.4f})")
        return 0
    except SnapshotError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


def cmd_compare(args: argparse.Namespace) -> int:
    """Compare two snapshot files."""
    try:
        baseline = load_snapshot(Path(args.baseline))
        current = load_snapshot(Path(args.current))
        diff = compare_snapshots(baseline, current)
        if args.format == "json":
            print(json.dumps(diff, indent=2, ensure_ascii=False))
        else:
            print(f"Baseline: {diff['baseline']['platform']} / {diff['baseline']['chart']}")
            print(f"Current: {diff['current']['platform']} / {diff['current']['chart']}")
            print()
            if diff["new_signals"]:
                print("New Signals:")
                for s in diff["new_signals"][:5]:
                    print(f"  + {s['dimension']}: {s['value']}")
            if diff["disappeared_signals"]:
                print("Disappeared Signals:")
                for s in diff["disappeared_signals"][:5]:
                    print(f"  - {s['dimension']}: {s['value']}")
            if diff["changed_signals"]:
                print("Changed Signals:")
                for s in diff["changed_signals"][:5]:
                    print(f"  ~ {s['dimension']}: {s['value']} ({s['delta']:+.4f})")
        return 0
    except SnapshotError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


# ===== Main =====

def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        description="Validate, summarize, and compare trend snapshots",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # validate
    validate_parser = subparsers.add_parser("validate", help="Validate a snapshot")
    validate_parser.add_argument("snapshot", help="Snapshot file path")

    # summarize
    summarize_parser = subparsers.add_parser("summarize", help="Summarize a snapshot")
    summarize_parser.add_argument("snapshot", help="Snapshot file path")
    summarize_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

    # compare
    compare_parser = subparsers.add_parser("compare", help="Compare two snapshots")
    compare_parser.add_argument("baseline", help="Baseline snapshot path")
    compare_parser.add_argument("current", help="Current snapshot path")
    compare_parser.add_argument("--format", "-f", choices=["json", "text"], default="text", help="Output format")

    return parser


def main() -> int:
    """Main entry point."""
    _configure_output()

    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    commands = {
        "validate": cmd_validate,
        "summarize": cmd_summarize,
        "compare": cmd_compare,
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
