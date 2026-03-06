# Spec - publish-site (Phase 4 connector-ready)

Status: MVP
Last Updated: 2026-03-04

## Objective
Execute website publishing actions (`crear`, `menu`, `publicar`) after explicit confirmation.
This adapter handles publish/deploy integration only and must not bypass confirmation/authorization flow.

## Contract
### Input
- `operation_id: string`
- `payload: { action: "crear" | "menu" | "publicar"; content?: Record<string, unknown> }`
- `dryRun?: boolean` (defaults to adapter config; safe default is `true`)

### Content Profile (MVP)
- `businessName: string`
- `whatsapp: string`
- `zones: string[]`
- `menuItems: Array<{ nombre: string; descripcion?: string; precio: number }>`
- `catalogItems: Array<{ id: string; nombre: string; descripcion?: string; precio: number; categoria?: string; imageUrl: string; imageSource: "facebook" | "manual" }>`
- `brandStyle?: { colors?: string[]; tone?: string; style?: string }`
- `cta?: string`
- `gallery?: string[]`
- `facebookPageUrl?: string` (required when image extraction source is `facebook`)

### Output
- `ToolExecutionResult<WebPublishPayload & { deploy_id?: string; deploy_url?: string }>`

## Rules
- Preserve `operation_id` in result payload and outbound publish metadata.
- Support and validate actions: `crear`, `menu`, `publicar`.
- Validate minimum content per action:
  - `crear`: `businessName`, `whatsapp`
  - `menu`: at least one entry in `menuItems` or `catalogItems`
  - `publicar`: previously generated content snapshot or explicit `content`
- In live mode (`dryRun=false`), require publish auth/config (e.g., provider token/site scope).
- Apply controlled timeout and bounded retries for publish calls.
- Retry only on transient transport failures and retriable upstream statuses (`429`, `5xx`).
- Do not retry deterministic `4xx` responses.
- Return structured/sanitized details for observability and operator actions.
- Preserve selected catalog image URLs in generated content metadata for auditability.
- Support catalog image source mode:
  - `facebook`: fetch/resolve from the configured business page.
  - `manual`: accept explicit URL list provided by operator/user.

## Error Handling
- Timeout/network failures are retriable (bounded attempts).
- Invalid action payload or mapping errors are non-retriable.
- Missing live security config is non-retriable.
- Deterministic provider `4xx` errors are non-retriable.
- Facebook extraction blocked/unauthorized is non-retriable until config/permissions are corrected.

## Error Handling Classification
- Retriable: timeout/network/transient provider availability failures, `429`, `5xx`.
- Non-retriable: invalid action payload, mapping/build errors, missing live credentials/config, deterministic provider `4xx`.

## Security Constraints
- Execute only after explicit runtime confirmation.
- Do not expose deploy tokens/credentials/secrets in logs or result detail.
- Restrict deploy actions to configured site/project scope only.
- Return sanitized errors (no raw upstream secret-bearing payloads).
- Accept catalog/gallery media only from approved URL schemes (`https`) and approved domains list.
- For `facebook` source, restrict extraction to configured business page scope; no personal/private media ingestion.
- Strip tracking query params from media URLs before storing/publishing.

## Idempotency / Dedupe
- Preserve and propagate `operation_id` as canonical idempotency reference.
- Repeated publish attempts for same `operation_id` should resolve deterministically (existing deploy or controlled replay).

## Timeout and Retry Policy
- Bounded request timeout per deploy/publish call.
- Bounded retries for transient failures only.
- No infinite retry loops.

## Idempotency Strategy
- Track provider-side and runtime-side publish attempts by `operation_id`.
- Prefer provider metadata/tagging to correlate repeated calls for same operation.

## External Error Mapping
- `timeout` / transport abort: retriable
- `network` unavailable/reset: retriable (bounded retries)
- `429` provider throttling: retriable (bounded retries)
- `5xx` provider/deploy API failure: retriable (bounded retries)
- `4xx` validation/auth/business error: non-retriable
- missing live auth/config: non-retriable
- `facebook_media_unauthorized` / invalid page scope: non-retriable
- `facebook_media_not_found` / empty media set: non-retriable (use manual fallback)

## Dry-Run Behavior
- Supported and enabled by default.
- Dry-run returns structured result with no publish/deploy side effects.
- Turning dry-run off is allowed only when provider credentials/config are present.

## Test Cases
- `returns_dry_run_by_default`
- `accepts_supported_web_actions`
- `fails_when_live_without_publish_credentials`
- `maps_publish_payload_to_provider_request`
- `retries_on_retriable_provider_status`
- `does_not_retry_on_non_retriable_4xx`
- `preserves_operation_id_in_result`
- `validates_catalog_items_for_menu_action`
- `rejects_non_https_or_non_approved_image_domains`
- `fails_when_facebook_source_without_page_scope`
