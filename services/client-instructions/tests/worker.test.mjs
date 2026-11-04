import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import worker from "../src/worker.js";

const token = "a".repeat(43);
const digest = createHash("sha256").update(token).digest("hex");
const bundle = {
  version: "pilot-v1",
  body: "# Pilot reel rules\n",
  sha256: createHash("sha256").update("# Pilot reel rules\n").digest("hex"),
};

function fixture(options = {}) {
  const calls = [];
  const client = options.client === undefined ? {
    id: "pilot-client",
    paid: 1,
    access_until: null,
    bundle_name: "reel-core",
  } : options.client;
  return {
    calls,
    env: {
      DB: {
        prepare(sql) {
          return {
            bind(value) {
              calls.push({ sql, value });
              return {
                async first() {
                  if (options.error) throw new Error("database offline");
                  if (sql.includes("FROM clients")) return value === digest ? client : null;
                  return options.bundle === undefined ? bundle : options.bundle;
                },
              };
            },
          };
        },
      },
    },
  };
}

function request(method = "GET", bearer = token) {
  return new Request("https://instructions.example.test/v1/instructions/reel", {
    method,
    headers: bearer === null ? {} : { Authorization: `Bearer ${bearer}` },
  });
}

test("serves only the mapped bundle to a paid client", async () => {
  const { env, calls } = fixture();
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), bundle.body);
  assert.equal(response.headers.get("X-Instruction-SHA256"), bundle.sha256);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(calls[0].value, digest);
  assert.equal(calls[1].value, "reel-core");
});

test("rejects missing and unknown credentials without a bundle read", async () => {
  const fixtureOne = fixture();
  assert.equal((await worker.fetch(request("GET", null), fixtureOne.env)).status, 401);
  assert.equal(fixtureOne.calls.length, 0);
  assert.equal((await worker.fetch(request("GET", "b".repeat(43)), fixtureOne.env)).status, 401);
  assert.equal(fixtureOne.calls.length, 1);
});

test("unpaid and expired clients receive no instructions", async () => {
  for (const client of [
    { id: "pilot-client", paid: 0, access_until: null, bundle_name: "reel-core" },
    { id: "pilot-client", paid: 1, access_until: "2020-01-01T00:00:00Z", bundle_name: "reel-core" },
  ]) {
    const { env, calls } = fixture({ client });
    const response = await worker.fetch(request(), env);
    assert.equal(response.status, 403);
    assert.equal(await response.text(), "Instruction access is inactive.");
    assert.equal(calls.length, 1);
  }
});

test("ignores a caller supplied bundle name", async () => {
  const { env, calls } = fixture();
  const response = await worker.fetch(new Request(
    "https://instructions.example.test/v1/instructions/reel?bundle=another-client",
    { headers: { Authorization: `Bearer ${token}` } },
  ), env);
  assert.equal(response.status, 200);
  assert.equal(calls[1].value, "reel-core");
});

test("storage failures and missing bundles fail closed", async () => {
  for (const options of [
    { error: true },
    { bundle: null },
    { client: { id: "pilot-client", paid: 1, access_until: "invalid", bundle_name: "reel-core" } },
  ]) {
    const response = await worker.fetch(request(), fixture(options).env);
    assert.equal(response.status, 503);
    assert.equal(await response.text(), "Instruction service unavailable.");
  }
});

test("HEAD authorizes but returns no body and other methods are rejected", async () => {
  const response = await worker.fetch(request("HEAD"), fixture().env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  assert.equal((await worker.fetch(request("POST"), fixture().env)).status, 405);
});
