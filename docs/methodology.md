# Agent Weather methodology

Applies to report `schema_version` **0.1.0-draft**, which is what the live API serves today (server v1.3.0).

New in 1.3.0, the model-metrics directory (`/v1/models`) is a conditions report on AI models, not a ranking. It uses OpenRouter's public models list and the vendors' free status feeds, and every derived value carries its formula (details in the [README](../README.md#model-metrics-directory-new-in-130)).

## Principles

- **Never invent.** A failed source yields `null` plus a `data_gaps` entry.
- **Label everything.** Values are `observed: true` (read directly from a source) or `modeled: true` (derived, with the formula in `method`).
- **Timestamp everything.** Every entry in `sources[]` has `name`, `url`, `observed_at` and `status`.
- **Cache:** reports are cached for up to 5 minutes. `valid_from`/`valid_to` give a 15-minute validity window.

## Sources used in the live report

| Area | Source | Endpoint | Notes |
|---|---|---|---|
| Agent frameworks | GitHub REST API | `api.github.com/repos/{owner}/{repo}` for langchain-ai/langchain, langchain-ai/langgraph, microsoft/autogen, crewAIInc/crewAI, openai/openai-agents-python, modelcontextprotocol/servers | Stars, forks, open issues+PRs (GitHub counts PRs as issues), push recency. Subject to GitHub rate limits; on failure the fields are `null` and a gap is recorded. |
| Provider status | Statuspage v2 | OpenAI `status.openai.com`, Anthropic `status.claude.com`, GitHub `www.githubstatus.com`, Cursor `status.cursor.com` | Indicator, description, degraded components. |
| MCP ecosystem | Official MCP Registry | `registry.modelcontextprotocol.io/v0/servers` | Count of server entries updated in the last hour. The registry is in preview (v0). |
| Adoption | npm downloads API | `api.npmjs.org/downloads/point/last-week/{pkg}` for `@modelcontextprotocol/sdk`, `@x402/core`, `@x402/xrpl` | Weekly downloads; npm data lags ~1–2 days. |
| Settlement rail | XRPL JSON-RPC `server_info` | xrplcluster.com | Validated ledger sequence and age, base fee, reserve, load factor. Read-only. |

## Indices

| Field | Kind | Definition |
|---|---|---|
| `conditions.visibility` | observed | Fraction of expected sources that reported successfully (0–1): 15 public sources (6 GitHub repos, 4 status pages, 3 npm packages, XRPL `server_info`, MCP Registry) plus the x402 activity section, which counts as not reporting when it is unavailable or stale (see `confidence.overall`). |
| `conditions.pressure` | modeled | "Provider disturbance index": `100 * disturbed_providers / providers_reporting` over OpenAI, Anthropic, GitHub, Cursor, where "disturbed" means Statuspage indicator ≠ `none`. |
| `conditions.temperature` | not yet computed | Planned: activity z-score vs a 30-day baseline. `null` until a baseline exists. |
| `conditions.wind` | not yet computed | Planned: share shifts from star/download deltas over time. `null` until history exists. |
| `confidence.overall` | modeled, `calibrated: false` | With stored history: `visibility × (0.5 + 0.3·cov24h + 0.2·cov7d)`, where `cov` = distinct 15-minute slots holding a scheduler snapshot ÷ expected slots (96 per 24h, 672 per 7d); paid/served snapshots do not count. `visibility` includes the x402 activity section as one expected source, counted as not reporting when it is unavailable, stale (ingest lag > 600 s), its 24h window is incomplete, or the classifier is stale. Without history (point-in-time only): `visibility × 0.5`. Not calibrated against outcomes: the coverage term measures history continuity, not accuracy, and reaches 1.0 after 7 days of uninterrupted collection. The report's `confidence` object carries `modeled: true` and `calibrated: false`. Snapshots stored before 2026-10-03 used older formulas and may list GitHub sources mislabeled as "npm downloads: …" (a source-fetching race, fixed 2026-10-03); the free `/v1/sample/yesterday` route can still return such a snapshot until about 2026-10-04. |
| `alerts[]` | observed | Active provider incidents. |
| `fronts[]`, `forecast[]` | empty | Not produced until history exists, and listed in `data_gaps`. |

## Known gaps (as reported in `data_gaps`)

- Trend-based conditions (temperature, wind, humidity): no stored 30/90-day baseline yet.
- Forecast: no history yet, so it's omitted rather than invented.
- x402 payment volume: not included in the live report yet.
- Framework repo stats can be partially missing when the GitHub API rate-limits.

## Schema

The JSON Schema in [`../schemas/report.schema.json`](../schemas/report.schema.json) is draft 0.3 and stays backward-compatible with 0.1 reports. It defines optional sections (baselines, x402 activity and its heuristic real-vs-automated split); those sections are absent from 0.1 responses.

## Sources evaluated but not used

- x402scan: no documented public API.
- OpenRouter rankings: HTML only.
- XRPL AI Hub (xrpl-ai.org): its terms prohibit systematic data extraction. It's used as a directory only, not as a data source.
- Some provider status pages (Mistral, OpenRouter, Hugging Face, Groq): blocked, or not machine-readable Statuspage JSON.
