# speckit.validate

Purpose: validate canonical specs structure and references.

## Run
```bash
rg --files documentation/specs
rg -n "documentation/specs" .codex/commands documentation/specs
```

## Expected
- Canonical specs files are discoverable.
- Local speckit command definitions point to `documentation/specs` paths.
