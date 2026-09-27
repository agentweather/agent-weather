// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Agent Weather
// Pay for one Agent Weather report with x402 on XRPL mainnet.
// Requires: npm i x402-xrpl xrpl   and   XRPL_SEED for a DEDICATED, low-balance agent wallet.
// Never commit seeds. The spend cap below makes the client refuse any price above 0.01 XRP.
import { x402Fetch, decodePaymentResponseHeader } from "x402-xrpl";
import { Wallet } from "xrpl";

const URL = "https://api.agentweather.io/v1/agent-weather/current";
const PAY_TO = "rnFHPGmgTLSg7hjzfr8wiHaTdTh3PijrZZ";

const fetchPaid = x402Fetch({
  wallet: Wallet.fromSeed(process.env.XRPL_SEED!),
  network: "xrpl:0",
  invoiceBinding: "invoice_id", // InvoiceID + SourceTag, no Memos
  maxValue: "10000",            // 0.01 XRP in drops
  paymentRequirementsSelector: (accepts: any[]) => {
    const r = accepts.find((a) => a.scheme === "exact" && a.network === "xrpl:0" && a.asset === "XRP");
    if (!r || r.payTo !== PAY_TO) throw new Error("unexpected payment requirements");
    return r;
  },
});

const res = await fetchPaid(URL);
if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
const report = await res.json();
const receipt = decodePaymentResponseHeader(res.headers.get("PAYMENT-RESPONSE")!);
console.log(JSON.stringify({ conditions: report.conditions, alerts: report.alerts, tx: receipt.transaction }, null, 2));
