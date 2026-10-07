# Agent Weather

<p align="center">
  <img src="assets/logo.png" alt="Agent Weather logo" width="120" />
</p>

Weather is the state of a system in flux: observed, forecast, acted on. Meteorology is one layer of that idea. Agent Weather applies meteorological concepts (observation networks, pressure systems, fronts, storms, climate vs weather, ensemble forecasting, confidence intervals, alerts) to the collective behavior of AI agents.

We collect verifiable signals—agent frameworks and marketplaces, on-chain agent and x402 payment activity, public API/usage stats, GitHub activity, agent directories—and turn them into agent-consumable conditions reports: near real-time (or at least daily) intelligence on current agent-ecosystem conditions, as structured JSON with sources, timestamps, and confidence. Modeled or estimated values are labeled.

Product: pay-per-request on the XRPL AI Hub via x402 (0.01 RLUSD (roughly one cent) on core routes). Live API: https://api.agentweather.io (v1.3.0) · Discovery: `/.well-known/x402` · Free sample: `/v1/sample/yesterday` · New in 1.3.0: [model-metrics directory](#model-metrics-directory-new-in-130) (`/v1/models`)

Help grow the history: contribute signals or data (agents and people welcome) so the record is deep enough to support forecasts and predictions later.

<p align="center">
  <a href="https://api.agentweather.io/.well-known/x402">x402 catalog</a> ·
  <a href="https://xrpl-ai.org/directory">XRPL AI Hub</a> ·
  <a href="./openapi.yaml">OpenAPI</a> ·
  <a href="./llms.txt">llms.txt</a> ·
  <a href="./docs/methodology.md">Methodology</a> ·
  <a href="https://x.com/agentweatherio">@agentweatherio</a>
</p>

![Agent Weather banner](assets/banner.png)

---

## TL;DR for agents

| | |
|---|---|
| **Endpoint** | `GET https://api.agentweather.io/v1/agent-weather/current` (POST behaves identically) |
| **Price** | `0.01 RLUSD` per call (other routes: see [`openapi.yaml`](./openapi.yaml) / live catalog) |
| **Free sample** | `GET https://api.agentweather.io/v1/sample/yesterday`: yesterday's report in the same format, no payment |
| **Model directory (new in 1.3.0)** | `GET https://api.agentweather.io/v1/models` (free); per-model and per-category reports 0.01 RLUSD each, see [below](#model-metrics-directory-new-in-130) |
| **API version** | `1.3.0` (`GET /healthz` reports it) |
| **Protocol** | x402 v2, scheme `exact`, network `xrpl:0` (XRPL mainnet) |
| **Pay to** | `rnFHPGmgTLSg7hjzfr8wiHaTdTh3PijrZZ` |
| **RLUSD issuer** | `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De` |
| **Facilitator** | T54 XRPL mainnet, `https://xrpl-facilitator-mainnet.t54.ai` |
| **Discovery** | `GET https://api.agentweather.io/.well-known/x402` |
| **Health (free)** | `GET https://api.agentweather.io/healthz` |
| **Response** | `application/json`, matches [`schemas/report.schema.json`](./schemas/report.schema.json), cached up to 5 min |
| **Rate limit** | 30 requests/min per IP on the paid route |

1. An unpaid request returns `402 Payment Required`. The body and the `PAYMENT-REQUIRED` header (base64) list the RLUSD `accepts[]` entry and a fresh single-use `invoiceId` ([example](./examples/402-response.json)).
2. Sign an XRPL `Payment` bound to that invoice, then retry with `PAYMENT-SIGNATURE`.
3. You receive the report ([example](./examples/sample-report.json)) plus a `PAYMENT-RESPONSE` header containing the XRPL transaction hash, which is your receipt.

**Try the format first, free:** `GET https://api.agentweather.io/v1/sample/yesterday` returns the stored conditions report from about 24 hours ago, in the same JSON format as the paid route, with a `sample` block marking it as free and not live. No payment, no 402. Buy `/v1/agent-weather/current` for current conditions.

## What you get

A snapshot of "conditions" across the agent economy. Every number is traceable to a public source:

- **Agent frameworks:** GitHub activity for LangChain, LangGraph, AutoGen, CrewAI, OpenAI Agents SDK and MCP servers
- **Provider status:** OpenAI, Anthropic, GitHub and Cursor status pages and active incidents
- **MCP ecosystem:** Official MCP Registry entries updated in the last hour
- **Adoption:** npm weekly downloads for `@modelcontextprotocol/sdk`, `@x402/core` and `@x402/xrpl`
- **Settlement rail:** XRPL mainnet `server_info` (ledger age, fees, load)
- **Weather-style indices:** visibility (data coverage), pressure (provider disturbance), and a modeled confidence score

Every source is reported with `observed_at` and a status. A source that fails comes back as `null` plus a `data_gaps` entry, so nothing is silently invented. Derived values carry `modeled: true` and their formula. See [docs/methodology.md](./docs/methodology.md).

## Why weather?

Agents need to decide whether to act *now*: which provider to call, whether a framework is healthy, whether the payment rail is congested. Agent Weather packages those signals the way a forecast does.

| Weather term | Meaning in the current report |
|---|---|
| Visibility | Fraction of expected sources that reported (observed) |
| Pressure | Share of tracked providers (OpenAI, Anthropic, GitHub, Cursor) whose status page shows a disturbance (modeled) |
| Alerts | Active provider incidents |
| Temperature / wind / fronts / forecast | Not yet populated. They need a stored baseline and are listed in `data_gaps` rather than invented |
| Confidence | Modeled 0–1 score (`calibrated: false`): visibility scaled by 24h/7d history coverage. It measures data coverage and continuity, not accuracy |

## Quickstart: pay as an agent (TypeScript)

Uses T54's [`x402-xrpl`](https://www.npmjs.com/package/x402-xrpl) client, which works with the T54 mainnet facilitator today. Full file: [examples/typescript/pay.ts](./examples/typescript/pay.ts).

```bash
npm i x402-xrpl xrpl
```

```ts
import { x402Fetch, decodePaymentResponseHeader } from "x402-xrpl";
import { Wallet } from "xrpl";

// RLUSD on XRPL mainnet (40-hex currency code). Wallet needs an RLUSD trust line + balance.
const RLUSD = "524C555344000000000000000000000000000000";

const fetchPaid = x402Fetch({
  wallet: Wallet.fromSeed(process.env.XRPL_SEED!), // dedicated, low-balance agent wallet
  network: "xrpl:0",
  invoiceBinding: "invoice_id",
  // maxValue is compared numerically to accepts[].amount. For RLUSD that amount is a decimal
  // value string (not drops), so "0.01" refuses anything above 0.01 RLUSD.
  maxValue: "0.01",
  paymentRequirementsSelector: (accepts) => {
    const r = accepts.find((a) => a.scheme === "exact" && a.network === "xrpl:0" && a.asset === RLUSD);
    if (!r) throw new Error("no RLUSD option offered");
    return r;
  },
});

const res = await fetchPaid("https://api.agentweather.io/v1/agent-weather/current");
const report = await res.json();
const receipt = decodePaymentResponseHeader(res.headers.get("PAYMENT-RESPONSE")!);
console.log(report.conditions, receipt.transaction);
```

> **Compatibility:** the reference `@x402/xrpl` client can't currently pay through the T54 mainnet facilitator ([x402#3527](https://github.com/x402-foundation/x402/issues/3527)). Use `x402-xrpl` (npm or PyPI) until that is fixed. Payers settling through T54 carry SourceTag `804681468`, which is how the XRPL AI Hub Index attributes the sale.

## Inspect the 402 without paying

```bash
curl -i https://api.agentweather.io/v1/agent-weather/current
curl -s https://api.agentweather.io/v1/sample/yesterday | jq '.sample, .conditions'   # free sample, ~24h old
curl -s https://api.agentweather.io/.well-known/x402 | jq
curl -s https://api.agentweather.io/healthz | jq
```

## Model-metrics directory (new in 1.3.0)

Assistants and agents increasingly route each task to a different model from a different vendor. A router needs fresh, machine-readable conditions for each model: what it costs, whether that changed, whether the vendor reports an incident, whether the model is being retired. The model-metrics directory reports those conditions for the AI models on OpenRouter's public model list (465 models from 63 vendors on Oct 7, 2026).

These are **conditions reports, not rankings**. They make no statement about how well any model performs, and nothing is ordered by performance. Every derived value ships with its formula in the response (`derived_fields`).

| Route | What you get | Price |
|---|---|---|
| `GET /v1/models` | Directory index: id, name, vendor, categories, input/output modalities, context length, `price_in_usd_per_1m`, `price_out_usd_per_1m`, expiration date, `first_seen`, vendor status. Filters `?vendor=`, `?category=`, `?q=`, paging with `?limit=` (max 500) and `?offset=` | free |
| `GET /v1/sample/models-yesterday` | Day-old change summary: models added and removed, price changes, expiration-date changes and vendor status changes observed during the previous day (America/Chicago) | free |
| `GET /v1/models/report?id={id}` | One model: current prices with 24h and 7d change (absolute and %), standard job cost, context and modalities, vendor status and active incidents, events in the last 24h and 7d, days until expiration, sources, timestamps, data age, and a one-line summary | 0.01 RLUSD |
| `GET /v1/models/category/{name}` | One category: counts, 24h price movers, new and removed models, models with an expiration date, vendor disturbances, and every model in the category with its standard job cost as a plain fact. Ordered by id by default; `?sort=cost` orders by cost and says so ("sorted by cost, not quality") | 0.01 RLUSD |

Paid routes use the same x402 flow as the rest of the API (RLUSD only, network `xrpl:0`). An unknown model id or category gets `400` before any payment, so nothing is charged.

**Derived values**

- `price_in_usd_per_1m` / `price_out_usd_per_1m` = OpenRouter's USD-per-token price × 1,000,000. OpenRouter lists `-1` for router entries whose price depends on the routed model; those come back as `null` with a note.
- `standard_job_cost_usd` = 10,000 × input price + 1,000 × output price (a fixed reference job of 10,000 input + 1,000 output tokens; other listed fees such as images, web search or caching are excluded).
- 24h change compares with the hourly snapshot from at least 24 hours ago. 7d change compares with the daily baseline (first snapshot after midnight America/Chicago) from 7 days ago. Change % = (current − reference) ÷ reference × 100.
- `days_until_expiration` = whole days from now to the listed `expiration_date`.

**Categories** (derived only from declared metadata; each response states the rule)

| Category | Rule |
|---|---|
| `reasoning` | OpenRouter's `reasoning` object is present, or `supported_parameters` includes `reasoning` / `include_reasoning` |
| `coding` | The id or name contains the token code, coder, codex, codestral, devstral or coding, or the first sentence of the description calls it a coding/code model or agent (self-described) |
| `vision-input` | `image` is in `input_modalities` |
| `image-output` | `image` is in `output_modalities` |
| `audio` | `audio` is in the input or output modalities |
| `retiring-soon` | `expiration_date` is set and is at most 60 days away |
| `price-moved` | An input or output price change was observed in the last 24 hours |
| `free-tier` | Both prices are 0, or the id ends in `:free` |

**Data sources and attribution**

- Model list, prices, context length, modalities and expiration dates: the [OpenRouter public models list](https://openrouter.ai/api/v1/models) (no key), collected hourly. Data courtesy of OpenRouter. Prices are OpenRouter's listing and may differ from a vendor's direct price.
- Vendor status (every 10 minutes): each vendor's own free status feed. These are Atlassian Statuspage `summary.json` feeds for OpenAI, Anthropic, Cohere, Perplexity, Fireworks, Moonshot AI, MiniMax, Poolside, Thinking Machines, Morph and Inference.net. Google uses Google Cloud Service Health incidents for Gemini / Vertex AI, and Amazon uses AWS Health public events for Bedrock.
- Status is **`unknown`** wherever a vendor has no free status feed (for example Mistral, xAI, DeepSeek, Qwen, Meta and OpenRouter itself), or when the last check is more than 30 minutes old. It is never guessed. Status is vendor-level, not per model or per hosting provider.

**History fills in over time.** Collection started on Oct 7, 2026. 24h changes fill in from Oct 8, and 7d changes from Oct 14. Until then those fields are `null`, and the response explains why. Coverage is text-heavy (12 image-output and 4 audio-output models on OpenRouter today). Dedicated image and music services such as MidJourney and Suno are not on the list.

```bash
curl -s 'https://api.agentweather.io/v1/models?category=coding&limit=5' | jq '.total, .models[].id'
curl -s https://api.agentweather.io/v1/sample/models-yesterday | jq '.summary'
curl -i 'https://api.agentweather.io/v1/models/report?id=openai/gpt-4o'      # 402: pay 0.01 RLUSD via x402
```

One entry from `GET /v1/models` (trimmed):

```json
{
  "id": "openai/gpt-4o",
  "name": "OpenAI: GPT-4o",
  "vendor": "openai",
  "categories": ["vision-input"],
  "input_modalities": ["text", "image", "file"],
  "output_modalities": ["text"],
  "context_length": 128000,
  "price_in_usd_per_1m": 2.5,
  "price_out_usd_per_1m": 10,
  "expiration_date": null,
  "first_seen": "2026-10-07T13:39:34.249Z",
  "status": "operational"
}
```

## Files in this repo

| File | Purpose |
|---|---|
| [`llms.txt`](./llms.txt) | LLM-oriented index of this project |
| [`openapi.yaml`](./openapi.yaml) | OpenAPI 3.1: every public endpoint, the 402 body, headers and error codes |
| [`schemas/report.schema.json`](./schemas/report.schema.json) | JSON Schema (2020-12) for the report body |
| [`docs/methodology.md`](./docs/methodology.md) | Sources, indices, confidence, known gaps |
| [`docs/agent-card.draft.json`](./docs/agent-card.draft.json) | Draft A2A agent card (not served yet) |
| [`examples/`](./examples) | Real 402 body, catalog snapshot (all 10 paid routes, v1.3.0), sample paid report, TypeScript buyer |

## Reliability and safety

- Live on XRPL mainnet since Sep 26, 2026.
- Settlement completes **before** data is served. Each payment is then independently re-checked on-ledger (validated, `tesSUCCESS`, exact `delivered_amount`, correct destination, `InvoiceID = SHA-256(invoiceId)`).
- Invoices are single-use and tx hashes are deduplicated, so one payment can't unlock two responses.
- Status page / SLA: none published yet. Use the free [`/healthz`](https://api.agentweather.io/healthz) endpoint for liveness.

## Pricing

Prices are in RLUSD only (API v1.3.0).

| Resource | Price |
|---|---|
| `/v1/agent-weather/current` | 0.01 RLUSD |
| `/v1/agent-weather/x402-activity` | 0.01 RLUSD |
| `/v1/pulse/storm`, `/v1/pulse/facilitator`, `/v1/pulse/providers` | 0.001 RLUSD each |
| `/v1/merchant/{address}` | 0.03 RLUSD |
| `/v1/health/report` | 0.01 RLUSD |
| `/v1/price-index` | 0.005 RLUSD |
| `/v1/models/report?id={id}` (new in 1.3.0) | 0.01 RLUSD |
| `/v1/models/category/{name}` (new in 1.3.0) | 0.01 RLUSD |
| `/v1/sample/yesterday`, `/v1/models`, `/v1/sample/models-yesterday` | free |

All paid resources are also listed in [`openapi.yaml`](./openapi.yaml). The buyer also pays the XRPL network transaction fee (typically ~10 drops). The live [`/.well-known/x402`](https://api.agentweather.io/.well-known/x402) catalog is the source of truth.

## Links

- API: https://api.agentweather.io
- X: [@agentweatherio](https://x.com/agentweatherio)
- XRPL AI Hub directory: https://xrpl-ai.org/directory
- Contact: [open an issue](https://github.com/agentweather/agent-weather/issues) or message [@agentweatherio](https://x.com/agentweatherio) on X

## License

This repository is dual-licensed:

| What | License |
|---|---|
| Code and machine-readable files: `examples/`, `schemas/` | [MIT](./LICENSE) |
| Documentation: `README.md`, `docs/`, `openapi.yaml`, `llms.txt` | [CC-BY-4.0](./LICENSE-docs) |

The Agent Weather name, logo and banner (`assets/`) are not licensed for reuse beyond referring to this project. The hosted API at `api.agentweather.io` is a commercial pay-per-call service and is not covered by these licenses.
