"""AI Novel Skill Scripts.

This package provides deterministic state management scripts for the
AI Novel Skill. These scripts handle workspace initialization, validation,
recovery, continuity management, and cross-book asset graph operations.

Key Scripts:
- novelctl: Workspace management (init, status, validate, recover, context)
- continuity_store: YAML continuity management (validate, build, query)
- asset_graph: Cross-book asset graph (init, publish, import, build, neighbors)
- analysis_retrieval: Book analysis retrieval and caching
- export_novel_txt: Export novel to TXT format
- token_usage: Token usage tracking

Usage:
    python scripts/novelctl.py init --title "My Novel" --genre fantasy
    python scripts/novelctl.py status
    python scripts/continuity_store.py validate
    python scripts/asset_graph.py init libraries
"""

__version__ = "0.1.0"
