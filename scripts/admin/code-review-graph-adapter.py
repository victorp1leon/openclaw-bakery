#!/usr/bin/env python3
"""Safe adapter bridge for invoking code-review-graph tools from OpenClaw.

Reads a JSON payload from stdin and returns a JSON envelope on stdout:
  {"ok": true, "result": {...}}
or
  {"ok": false, "error": "...", "detail": "..."}
"""

from __future__ import annotations

import json
import sys
from typing import Any


def _print_error(error: str, detail: str | None = None) -> int:
    payload: dict[str, Any] = {"ok": False, "error": error}
    if detail:
        payload["detail"] = detail
    print(json.dumps(payload, ensure_ascii=True))
    return 0


def _read_request() -> dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    parsed = json.loads(raw)
    if isinstance(parsed, dict):
        return parsed
    return {}


def main() -> int:
    try:
        request = _read_request()
    except Exception as err:  # noqa: BLE001
        return _print_error("invalid_json_input", str(err))

    try:
        from code_review_graph.tools import (  # type: ignore[import-untyped]
            build_or_update_graph,
            get_impact_radius,
            get_review_context,
        )
    except Exception as err:  # noqa: BLE001
        return _print_error("code_review_graph_import_failed", str(err))

    operation = request.get("operation")
    try:
        if operation == "build_or_update_graph":
            result = build_or_update_graph(
                full_rebuild=bool(request.get("full_rebuild", False)),
                repo_root=request.get("repo_root"),
                base=str(request.get("base", "HEAD~1")),
            )
        elif operation == "get_impact_radius":
            result = get_impact_radius(
                changed_files=request.get("changed_files"),
                max_depth=int(request.get("max_depth", 2)),
                repo_root=request.get("repo_root"),
                base=str(request.get("base", "HEAD~1")),
            )
        elif operation == "get_review_context":
            result = get_review_context(
                changed_files=request.get("changed_files"),
                max_depth=int(request.get("max_depth", 2)),
                include_source=bool(request.get("include_source", False)),
                max_lines_per_file=int(request.get("max_lines_per_file", 120)),
                repo_root=request.get("repo_root"),
                base=str(request.get("base", "HEAD~1")),
            )
        else:
            return _print_error("unsupported_operation", str(operation))
    except Exception as err:  # noqa: BLE001
        return _print_error("code_review_graph_execution_failed", str(err))

    print(json.dumps({"ok": True, "result": result}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
