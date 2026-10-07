---
name: agent-weather
description: Use when you need current conditions in the AI-agent economy before acting. Covers x402 payment activity on the XRP Ledger, AI provider status and incidents, agent-framework and MCP activity, and AI model prices, price changes, vendor status and upcoming retirements (expiration dates). Data comes from the Agent Weather API (api.agentweather.io), which has free sample and discovery routes and paid routes at 0.01 RLUSD via x402 on XRPL.
---

# Agent Weather

Agent Weather sells **conditions reports on the AI-agent economy**. It applies meteorology concepts to the collective behavior of AI agents: observation networks, pressure systems, fronts, storms, climate vs. weather, ensemble forecasting, confidence intervals and alerts. It is **not** meteorological weather: there is no rain, temperature or air-quality data.

Base URL: `https://api.agentweather.io` (API v1.3.0)

## Free entry points (no payment)

| URL | Use |
|---|---|
| `/v1/sample/yesterday` | Yesterday's full conditions report, same format as the paid `/v1/agent-weather/current` |
| `/v1/models` | Model directory index (filters: `?vendor=`, `?category=`, `?q=`, `?limit=` up to 500, `?offset=`) |
| `/v1/sample/models-yesterday` | Day-old change summary of the model directory |
| `/.well-known/x402` | x402 catalog: every paid route with its price (source of truth) |
| `/openapi.json` | OpenAPI 3.1 spec |
| `/llms.txt` | LLM-oriented index |

## Paid flow (x402 on XRPL mainnet, `xrpl:0`, RLUSD only)

Core routes cost **0.01 RLUSD**. Some routes cost less or more; see `/.well-known/x402` for the full list. RLUSD issuer: `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`. Pay to: `rnFHPGmgTLSg7hjzfr8wiHaTdTh3PijrZZ`.

1. `GET` the route with no payment. You get `402 Payment Required`, with a `PAYMENT-REQUIRED` header (base64 JSON, same as the body). It lists one RLUSD `accepts[]` entry and a fresh single-use `extra.invoiceId`.
2. Pay: sign an XRPL `Payment` for that amount, bound to that invoice. The T54 facilitator settles it. Use the `x402-xrpl` client (npm/PyPI).
3. Retry the same request with the base64 payment payload in the `PAYMENT-SIGNATURE` header. You get `200` with the JSON report, plus a `PAYMENT-RESPONSE` header carrying the XRPL transaction hash (your receipt).

Always pay the latest 402, because each invoice is single-use. Invalid inputs (an unknown model id or category) get `400` before payment, so nothing is charged.

## Model directory (new in 1.3.0)

This covers the AI models on OpenRouter's public model list. Vendor status comes from each vendor's free status feed. It is `unknown` where no free feed exists, and it is never guessed.

- `GET /v1/models/report?id={id}` (0.01 RLUSD): prices per 1M tokens with 24h/7d change, standard job cost (10,000 input + 1,000 output tokens), context, modalities, vendor status and incidents, listing events, and days until expiration.
- `GET /v1/models/category/{name}` (0.01 RLUSD): counts, price movers, new/removed models, retiring models, disturbances, and each model's standard job cost. Order is by id by default; with `?sort=cost` the response is labelled "sorted by cost, not quality".
- Categories, derived from declared metadata only: `reasoning`, `coding`, `vision-input`, `image-output`, `audio`, `retiring-soon` (expires within 60 days), `price-moved` (price change in 24h), `free-tier`. Each response states the rule.
- 24h changes fill in from Oct 8, 2026, and 7d changes from Oct 14, 2026. Until then they are `null`, with a reason.

## Report format

Reports are JSON with a short readable `summary`, plus `sources` and `observed_at`/`issued_at` timestamps, `data_age`, and `data_gaps`. Missing data is reported as a gap, never invented. Derived and modeled values are labeled and ship with their formula (`derived_fields`). Schemas: [`schemas/report.schema.json`](../../schemas/report.schema.json) and [`openapi.yaml`](../../openapi.yaml).

These are **conditions reports, not rankings**. They make no statement about how well any model or service performs.

## Examples

```bash
curl -s https://api.agentweather.io/v1/sample/yesterday | jq '.conditions'
curl -s 'https://api.agentweather.io/v1/models?category=retiring-soon' | jq '.models[] | {id, expiration_date}'
curl -s https://api.agentweather.io/.well-known/x402 | jq '.resources[] | {url, amount, symbol}'
curl -i 'https://api.agentweather.io/v1/models/report?id=openai/gpt-4o'   # 402: pay 0.01 RLUSD, then retry
```
