# Component Contracts Specs

Target directory for migrated component contracts from:
- `documentation/c4/ComponentSpecs/**`

Path pattern:
- `documentation/specs/contracts/components/<component-slug>.spec.md`

Migration policy:
1. Preserve contract meaning and field names.
2. Add traceability note to source C4 path.
3. After legacy retirement, keep C4 focused on architecture (`component.description` + `system.description`) and keep contracts canonical in this directory.

Current migration status (Wave C.1):
- `39/39` contracts migrated from `documentation/c4/ComponentSpecs/**`.
- Manifest tracker: `documentation/specs/migration-manifest.md` entries `C4-001` to `C4-039`.

Wave D closure status:
- `39/39` contracts verified in canonical path.
- Manifest status for `C4-001` to `C4-039`: `verified`.
- Post-retirement policy: C4 `source` paths are historical trace metadata and may not exist after Wave `C.2`.
