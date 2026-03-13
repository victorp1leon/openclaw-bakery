#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "[security:scan:history] gitleaks is not installed."
  echo "[security:scan:history] Install it and run again."
  echo "  macOS: brew install gitleaks"
  echo "  Linux: https://github.com/gitleaks/gitleaks#installing"
  exit 1
fi

echo "[security:scan:history] Running gitleaks against full git history..."
gitleaks git --source . --log-opts="--all" --redact --verbose
