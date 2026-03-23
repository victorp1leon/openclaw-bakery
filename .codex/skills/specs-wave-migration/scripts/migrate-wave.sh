#!/usr/bin/env bash
set -euo pipefail

wave=""
domain="all"
from_status="pending"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wave)
      wave="${2:-}"
      shift 2
      ;;
    --domain)
      domain="${2:-}"
      shift 2
      ;;
    --status)
      from_status="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$wave" ]]; then
  echo "Usage: bash .codex/skills/specs-wave-migration/scripts/migrate-wave.sh --wave <A|B|C|C.1> [--domain <runtime|platform|all>] [--status <pending|migrated|verified>]" >&2
  exit 1
fi

if [[ "$domain" != "runtime" && "$domain" != "platform" && "$domain" != "all" ]]; then
  echo "Invalid --domain value: $domain" >&2
  exit 1
fi

manifest="documentation/specs/migration-manifest.md"
specs_index="documentation/specs/_index.md"
today="$(date -u +%F)"

if [[ ! -f "$manifest" ]]; then
  echo "Missing manifest: $manifest" >&2
  exit 1
fi

if [[ ! -f "$specs_index" ]]; then
  echo "Missing specs index: $specs_index" >&2
  exit 1
fi

tmp_entries="$(mktemp)"
tmp_ids="$(mktemp)"
tmp_manifest="$(mktemp)"
tmp_rows="$(mktemp)"
tmp_index="$(mktemp)"
trap 'rm -f "$tmp_entries" "$tmp_ids" "$tmp_manifest" "$tmp_rows" "$tmp_index"' EXIT

awk -F'|' -v want_wave="$wave" -v want_domain="$domain" -v want_status="$from_status" '
function trim(s) { gsub(/^ +| +$/, "", s); return s }
function unbt(s) { gsub(/`/, "", s); return s }
/^\| (R|P)-[0-9]{3} / {
  id = trim($2)
  stype = trim($3)
  d = trim($4)
  src = unbt(trim($5))
  tgt = unbt(trim($6))
  w = trim($8)
  status = trim($9)
  if (w == want_wave && status == want_status && (want_domain == "all" || d == want_domain)) {
    print id "\t" stype "\t" d "\t" src "\t" tgt
  }
}
' "$manifest" > "$tmp_entries"

if [[ ! -s "$tmp_entries" ]]; then
  echo "No entries found for wave=$wave domain=$domain status=$from_status"
  exit 0
fi

while IFS=$'\t' read -r id _stype d source target; do
  feature_dir="$(dirname "$target")"
  slug="$(basename "$feature_dir")"
  legacy_file="$(basename "$source")"

  if [[ ! -f "$source" ]]; then
    echo "Missing legacy source for $id: $source" >&2
    exit 1
  fi

  mkdir -p "$feature_dir/history/legacy-plans"
  cp "$source" "$feature_dir/history/legacy-plans/$legacy_file"

  legacy_title="$(sed -n '1s/^# //p' "$source")"
  if [[ -z "$legacy_title" ]]; then
    legacy_title="$slug"
  fi

  cat > "$feature_dir/spec.md" <<EOF
# ${legacy_title} - Spec

Domain: ${d}
Feature Slug: ${slug}
Status: migrated (Wave ${wave})
Created: ${today}
Last Updated: ${today}
Legacy Source: ${source}
Migration Entry: ${id}

## Objective
This feature package was migrated from legacy implementation planning into canonical specs structure for Wave ${wave}.

## Inputs / Outputs
- Input: legacy implementation plan at path ${source}.
- Output: canonical SDD package under ${feature_dir}.

## Business Rules
1. Keep legacy traceability while moving to canonical paths.
2. Preserve current behavior documentation; no runtime behavior changes are introduced by this migration.

## Error Behavior
- Missing legacy source blocks migration and manifest status must remain ${from_status}.

## Test Cases
1. Canonical package exists with minimum required artifacts.
2. Local legacy snapshot exists in history/legacy-plans.
EOF

  cat > "$feature_dir/clarify.md" <<EOF
# ${legacy_title} - Clarifications

## Open Questions
- None blocking for Wave ${wave} migration.

## Decisions
| Decision | Rationale | Date |
|---|---|---|
| Preserve legacy content as local snapshot in history/legacy-plans. | Keep migration traceability while canonical artifacts are stabilized. | ${today} |

## Deferred Items
- Deep functional rewrite of this spec package is deferred to later verification waves.
EOF

  cat > "$feature_dir/plan.md" <<EOF
# ${legacy_title} - Implementation Plan (Canonical)

Domain: ${d}
Feature Slug: ${slug}
Status: migrated (Wave ${wave})
Created: ${today}
Last Updated: ${today}
Legacy Source: ${source}
Migration Entry: ${id}

## Cross-References
| Document | Path | Use |
|---|---|---|
| Migration manifest | documentation/specs/migration-manifest.md | Source of migration status and wave |
| Legacy source (original) | ${source} | Original planning context |
| Legacy snapshot (local copy) | ${feature_dir}/history/legacy-plans/${legacy_file} | Stable local traceability |

## Scope
### In Scope
- Create canonical feature package with minimum SDD artifacts.
- Preserve full legacy plan snapshot for traceability.

### Out of Scope
- Rewriting or re-implementing runtime/platform behavior.
- Closing business decisions that were not part of migration.

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Create canonical feature directory | Complete | ${feature_dir} |
| 2 | Add minimum SDD artifacts | Complete | spec, clarify, plan, tasks, analyze |
| 3 | Preserve legacy snapshot | Complete | history/legacy-plans/${legacy_file} |
| 4 | Enrich feature spec depth | Pending | Deferred to verification phase |

## Validation
- rg --files ${feature_dir}
- Validate cross-links against documentation/specs/migration-manifest.md
EOF

  cat > "$feature_dir/tasks.md" <<EOF
# ${legacy_title} - Task Breakdown

| # | Task | Dependency | Status |
|---|---|---|---|
| 1 | Create canonical feature folder and minimum SDD artifacts. | None | Complete |
| 2 | Add legacy plan snapshot for traceability. | 1 | Complete |
| 3 | Validate canonical links and update migration manifest status. | 1 | Complete |
| 4 | Refine feature-specific spec depth (post-migration hardening). | 1 | Pending |
EOF

  cat > "$feature_dir/analyze.md" <<EOF
# ${legacy_title} - Analysis

## Risks
- Risk: canonical package may start as structurally complete but semantically thin.
- Mitigation: preserve full legacy snapshot and schedule follow-up verification.

## Trade-offs
| Option | Pros | Cons | Decision |
|---|---|---|---|
| Copy legacy plus minimum canonical scaffold | Fast migration coverage with traceability | Requires follow-up enrichment | Selected for Wave ${wave} |
EOF

  echo "$id" >> "$tmp_ids"
done < "$tmp_entries"

awk -F'|' -v ids_file="$tmp_ids" -v want_wave="$wave" -v want_status="$from_status" '
function trim(s) { gsub(/^ +| +$/, "", s); return s }
function unbt(s) { gsub(/`/, "", s); return s }
BEGIN {
  while ((getline line < ids_file) > 0) {
    selected[line] = 1
  }
}
{
  if ($0 ~ /^\| (R|P)-[0-9]{3} /) {
    id = trim($2)
    stype = trim($3)
    d = trim($4)
    src = unbt(trim($5))
    tgt = unbt(trim($6))
    strategy = trim($7)
    w = trim($8)
    status = trim($9)
    if (id in selected && w == want_wave && status == want_status) {
      note = "Wave " w " package created in canonical specs with legacy snapshot."
      printf("| %s | %s | %s | `%s` | `%s` | %s | %s | migrated | %s |\n", id, stype, d, src, tgt, strategy, w, note)
      next
    }
  }
  print $0
}
' "$manifest" > "$tmp_manifest"
mv "$tmp_manifest" "$manifest"

awk -F'|' '
function trim(s) { gsub(/^ +| +$/, "", s); return s }
function unbt(s) { gsub(/`/, "", s); return s }
/^\| (R|P)-[0-9]{3} / {
  stype = trim($3)
  d = trim($4)
  src = unbt(trim($5))
  tgt = unbt(trim($6))
  status = trim($9)
  if ((stype == "runtime_plan" || stype == "platform_plan") && status == "migrated") {
    split(tgt, parts, "/")
    slug = parts[length(parts)-1]
    canonical_dir = substr(tgt, 1, length(tgt) - length("/plan.md"))
    printf("| %s | %s | migrated | %s/ | %s | Migrated from legacy implementation plan. |\n", d, slug, canonical_dir, src)
  }
}
' "$manifest" | sort > "$tmp_rows"

if [[ ! -s "$tmp_rows" ]]; then
  echo "| _pending_ | _pending_ | pending | _pending_ | _pending_ | Registry starts in migration waves (A-D). |" > "$tmp_rows"
fi

awk -v rows_file="$tmp_rows" '
BEGIN {
  while ((getline l < rows_file) > 0) {
    rows = rows l "\n"
  }
}
{
  if ($0 ~ /^## Feature Registry$/) {
    print
    in_registry = 1
    next
  }
  if (in_registry == 1 && $0 ~ /^\| Domain \| Feature Slug \| Status \| Canonical Path \| Legacy Sources \| Notes \|$/) {
    print
    next
  }
  if (in_registry == 1 && $0 ~ /^\|---\|---\|---\|---\|---\|---\|$/) {
    print
    printf("%s", rows)
    skipping = 1
    in_registry = 0
    next
  }
  if (skipping == 1) {
    if ($0 ~ /^## Slug And Metadata Rules$/) {
      print
      skipping = 0
    }
    next
  }
  print
}
' "$specs_index" > "$tmp_index"
mv "$tmp_index" "$specs_index"

echo "Migrated entries:"
wc -l < "$tmp_ids"
echo "Manifest updated: $manifest"
echo "Index updated: $specs_index"
