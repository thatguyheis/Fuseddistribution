#!/usr/bin/env node
import { createHash } from "node:crypto";

const url = process.env.FUSED_INSTRUCTIONS_URL;
const token = process.env.FUSED_INSTRUCTIONS_TOKEN;
const MAX_BYTES = 131072;

async function main() {
  if (!url || !token) throw new Error("Set FUSED_INSTRUCTIONS_URL and FUSED_INSTRUCTIONS_TOKEN outside Git.");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("Instruction endpoint must use HTTPS.");
  }
  const response = await fetch(parsed, {
    headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Instruction fetch failed with HTTP ${response.status}.`);
  if (!(response.headers.get("Content-Type") || "").startsWith("text/markdown")) {
    throw new Error("Instruction response has the wrong content type.");
  }
  const expected = response.headers.get("X-Instruction-SHA256");
  const version = response.headers.get("X-Instruction-Version");
  if (!expected || !/^[a-f0-9]{64}$/.test(expected) || !version) {
    throw new Error("Instruction response is missing integrity metadata.");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BYTES) {
      await reader.cancel();
      throw new Error("Instruction bundle exceeds the size limit.");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks, length);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new Error("Instruction digest mismatch.");
  new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  process.stderr.write(`Loaded instruction version ${version}.\n`);
  process.stdout.write(bytes);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
