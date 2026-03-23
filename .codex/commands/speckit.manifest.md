# speckit.manifest

Purpose: open migration manifest and inspect migration status by wave.

## Run
```bash
sed -n '1,320p' documentation/specs/migration-manifest.md
```

## Expected
- Manifest exists and tracks `pending`, `migrated`, `verified` states.
