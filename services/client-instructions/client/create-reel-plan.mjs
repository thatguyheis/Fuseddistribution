#!/usr/bin/env node
import { readFileSync } from "node:fs";

async function main() {
  const token = process.env.FUSED_INSTRUCTIONS_TOKEN;
  const address = process.env.FUSED_REEL_SERVICE_URL || "https://fused-client-instructions.luxraycoco.workers.dev/v1/reels/plan";
  const url = new URL(address);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use an HTTPS service URL without credentials.");
  if (!token || process.argv.length !== 3) throw new Error("Set FUSED_INSTRUCTIONS_TOKEN privately and run: node create-reel-plan.mjs <brief.json>");
  const brief = readFileSync(process.argv[2]);
  if (brief.byteLength > 16384) throw new Error("Brief is too large.");
  JSON.parse(brief.toString("utf8"));
  const response = await fetch(url, { method: "POST", redirect: "error", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: brief, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Reel service returned HTTP ${response.status}. No local fallback is permitted.`);
  if (!(response.headers.get("Content-Type") || "").startsWith("application/json")) throw new Error("Invalid service response.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new Error("Service response is too large."); }
    chunks.push(value);
  }
  const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!result.plan || result.reviewRequired !== true) throw new Error("Invalid reel result.");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
