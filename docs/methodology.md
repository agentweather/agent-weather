# Agent Weather methodology

Applies to report `schema_version` **0.1.0-draft**, which is what the live API serves today (server v1.2.0).

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
| `conditions.visibility` | observed | Fraction of expected sources that reported successfully (0–1). |
| `conditions.pressure` | modeled | "Provider disturbance index": `100 * disturbed_providers / providers_reporting` over OpenAI, Anthropic, GitHub, Cursor, where "disturbed" means Statuspage indicator ≠ `none`. |
| `conditions.temperature` | not yet computed | Planned: activity z-score vs a 30-day baseline. `null` until a baseline exists. |
| `conditions.wind` | not yet computed | Planned: share shifts from star/download deltas over time. `null` until history exists. |
| `confidence.overall` | modeled | `visibility × 0.5`, capped at 0.5 while there is no history (point-in-time snapshot only). |
| `alerts[]` | observed | Active provider incidents. |
| `fronts[]`, `forecast[]` | empty | Not produced until history exists, and listed in `data_gaps`. |

## Known gaps (as reported in `data_gaps`)

- Trend-based conditions (temperature, wind, humidity): no stored 30/90-day baseline yet.
- Forecast: no history yet, so it's omitted rather than invented.
- x402 payment volume: not included in the live report yet.
- Framework repo stats can be partially missing when the GitHub API rate-limits.

## Schema

The JSON Schema in [`../schemas/report.schema.json`](../schemas/report.schema.json) is draft 0.2 and stays backward-compatible with 0.1 reports. It already defines optional sections (e.g. baselines, x402 activity) that the live API doesn't serve yet; those sections are absent from 0.1 responses.

## Sources evaluated but not used

- x402scan: no documented public API.
- OpenRouter rankings: HTML only.
- XRPL AI Hub (xrpl-ai.org): its terms prohibit systematic data extraction. It's used as a directory only, not as a data source.
- Some provider status pages (Mistral, OpenRouter, Hugging Face, Groq): blocked, or not machine-readable Statuspage JSON.
