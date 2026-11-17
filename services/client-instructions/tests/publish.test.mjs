import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import worker from "../src/worker.js";

const migrations = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const sha = value => createHash("sha256").update(value).digest("hex");
const tokens = { coin: "c".repeat(43), other: "o".repeat(43), plain: "p".repeat(43) };
const BUFFER_KEY = "buffer-secret-key-never-shown-0001";
const channels = { youtube: "a".repeat(24), instagram: "b".repeat(24), facebook: "c".repeat(24) };
const profile = { token: BUFFER_KEY, organizationId: "d".repeat(24), channels, maxPending: 10 };
const video = new Uint8Array(4096);
video.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70], 0); // MP4 "ftyp" box header
const upload = { filename: "lot-12.mp4", bytes: video.byteLength, sha256: sha(video) };
const soon = minutes => new Date(Date.now() + minutes * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");

function setup(options = {}) {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(migrations).sort()) db.exec(readFileSync(path.join(migrations, file), "utf8"));
  const add = db.prepare("INSERT INTO clients (id, token_hash, paid, bundle_name, status_actor, status_reason, publish_profile, reel_enabled) VALUES (?, ?, 1, 'p', 't', 't', ?, ?)");
  add.run("coin-client", sha(tokens.coin), "c1994", 0);
  add.run("other-client", sha(tokens.other), "c1994", 0);
  add.run("plain-client", sha(tokens.plain), null, 1);
  const kv = new Map();
  const buffer = { calls: [], pending: options.pending || [], posts: new Map(), reject: options.reject || null };
  const env = {
    DAILY_RUN_LIMIT: "5",
    MEDIA_BASE_URL: "https://media.example.test",
    PUBLISH_PROFILE_C1994: JSON.stringify(profile),
    REELS_KV: { async put(key, value, opts) { kv.set(key, { value, opts }); } },
    DB: { prepare(sql) { return { bind(...values) {
      const statement = db.prepare(sql);
      return {
        async first() { return statement.get(...values) ?? null; },
        async run() { statement.run(...values); return {}; },
        async all() { return { results: statement.all(...values) }; },
      };
    } }; } },
  };
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.buffer.com");
    assert.equal(init.headers.authorization, `Bearer ${BUFFER_KEY}`);
    const { query, variables } = JSON.parse(init.body);
    buffer.calls.push({ query, variables });
    let data;
    if (query.includes("posts(")) data = { posts: { edges: buffer.pending.map(node => ({ node })) } };
    else if (query.includes("createPost")) {
      if (buffer.reject) data = { createPost: { message: buffer.reject } };
      else {
        const id = (buffer.posts.size + 1).toString(16).padStart(24, "0");
        const post = { id, status: "scheduled", dueAt: variables.input.dueAt, channelId: variables.input.channelId, assets: [{ id: "v", mimeType: "video/mp4", source: variables.input.assets[0].video.url }] };
        buffer.posts.set(id, post);
        data = { createPost: { post } };
      }
    } else data = { post: buffer.posts.get(variables.input.id) || null };
    return Response.json({ data });
  };
  return { env, db, kv, buffer };
}

async function rpc(env, method, params, bearer) {
  const response = await worker.fetch(new Request("https://svc.example.test/mcp", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }), env);
  const text = await response.text();
  const body = text.trim().startsWith("{") ? JSON.parse(text) : JSON.parse(text.split("\n").find(line => line.startsWith("data: ")).slice(6));
  return { status: response.status, body, text };
}
async function call(env, name, args = {}, bearer = tokens.coin) {
  const { body, text } = await rpc(env, "tools/call", { name, arguments: args }, bearer);
  assert.equal(text.includes(BUFFER_KEY), false, "Buffer key must never leave the Worker");
  assert.ok(body.result, text);
  const content = body.result.content[0].text;
  return body.result.isError ? { error: content } : JSON.parse(content);
}
function put(env, url, body = video, headers = {}) {
  return worker.fetch(new Request(url, { method: "PUT", headers: { "Content-Type": "video/mp4", ...headers }, body }), env);
}
async function uploaded(state, bearer = tokens.coin) {
  const ticket = await call(state.env, "create_video_upload", upload, bearer);
  assert.equal((await put(state.env, ticket.upload_url)).status, 200);
  return ticket;
}

test("publish tools appear only for a client with a publish profile", async () => {
  const { env } = setup();
  const names = async bearer => (await rpc(env, "tools/list", {}, bearer)).body.result.tools.map(tool => tool.name);
  assert.deepEqual(await names(tokens.coin), ["create_video_upload", "list_videos", "schedule_post", "get_post_status"]);
  assert.deepEqual(await names(tokens.plain), ["create_reel_plan"]);
  const refused = await rpc(env, "tools/call", { name: "schedule_post", arguments: {} }, tokens.plain);
  assert.ok(refused.body.error || refused.body.result.isError);
});

test("a client without reel access cannot use the reel plan route", async () => {
  const { env } = setup();
  const response = await worker.fetch(new Request("https://svc.example.test/v1/reels/plan", {
    method: "POST", headers: { Authorization: `Bearer ${tokens.coin}`, "Content-Type": "application/json" },
    body: JSON.stringify({ topic: "A museum's collection", audience: "Local history visitors", facts: [{ statement: "The collection includes maps.", sourceUrl: "https://museum.example/c" }], callToAction: "Visit.", targetSeconds: 15 }),
  }), env);
  assert.equal(response.status, 403);
});

test("upload, schedule to three channels, retry without duplicates, read status", async () => {
  const state = setup();
  const ticket = await call(state.env, "create_video_upload", upload);
  assert.match(ticket.video_id, /^c1994-up-[a-f0-9]{12}$/);
  const stored = await put(state.env, ticket.upload_url);
  assert.equal(stored.status, 200);
  const ready = await stored.json();
  assert.equal(ready.video_url, `https://media.example.test/reels/${ticket.video_id}/${ticket.video_id}.mp4`);
  const object = state.kv.get(`reels/${ticket.video_id}/${ticket.video_id}.mp4`);
  assert.equal(object.opts.expirationTtl, 5 * 24 * 3600);
  assert.equal(sha(object.value), upload.sha256);

  const request = { video_id: ticket.video_id, caption: "1921 Morgan dollar. Lot 12 is open for bidding.", youtube_title: "1921 Morgan Dollar | Lot 12", due_at: soon(60) };
  const first = await call(state.env, "schedule_post", request);
  assert.deepEqual(first.posts.map(post => [post.service, post.status, post.video_attached]), [["youtube", "scheduled", true], ["instagram", "scheduled", true], ["facebook", "scheduled", true]]);
  const creates = state.buffer.calls.filter(entry => entry.query.includes("createPost")).map(entry => entry.variables.input);
  assert.deepEqual(creates.map(input => input.channelId), [channels.youtube, channels.instagram, channels.facebook]);
  assert.equal(creates[0].metadata.youtube.title, request.youtube_title);
  assert.equal(creates[1].assets[0].video.url, ready.video_url);

  const again = await call(state.env, "schedule_post", request);
  assert.equal(again.posts.every(post => post.already_scheduled), true);
  assert.equal(state.buffer.calls.filter(entry => entry.query.includes("createPost")).length, 3);

  const status = await call(state.env, "get_post_status", { post_id: first.posts[0].post_id });
  assert.equal(status.status, "scheduled");
  assert.equal((await call(state.env, "get_post_status", { post_id: first.posts[0].post_id }, tokens.other)).error, "Post not found.");
  const listed = await call(state.env, "list_videos");
  assert.equal(listed.videos[0].posts.length, 3);
  assert.deepEqual((await call(state.env, "list_videos", {}, tokens.other)).videos, []);
});

test("upload link refuses wrong key, wrong content, reuse, expiry and inactive clients", async () => {
  const state = setup();
  const ticket = await call(state.env, "create_video_upload", upload);
  const status = async (...args) => (await put(state.env, ...args)).status;
  assert.equal(await status(ticket.upload_url.replace(/key=.{4}/, "key=AAAA")), 403);
  assert.equal(await status(ticket.upload_url, video.slice(0, 2048)), 400);
  const notVideo = new Uint8Array(4096);
  assert.equal(await status(ticket.upload_url, notVideo), 415);
  const tampered = video.slice(); tampered[100] = 7;
  assert.equal(await status(ticket.upload_url, tampered), 422);
  assert.equal((await worker.fetch(new Request(ticket.upload_url, { method: "GET" }), state.env)).status, 405);
  assert.equal(state.kv.size, 0);
  assert.equal(await status(ticket.upload_url), 200);
  assert.equal(await status(ticket.upload_url), 403);

  const expired = await call(state.env, "create_video_upload", upload);
  state.db.prepare("UPDATE publish_videos SET upload_expires_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(expired.video_id);
  assert.equal(await status(expired.upload_url), 403);
  const revoked = await call(state.env, "create_video_upload", upload);
  state.db.prepare("UPDATE clients SET paid = 0 WHERE id = 'coin-client'").run();
  assert.equal(await status(revoked.upload_url), 403);
  assert.equal(state.kv.size, 1);
});

test("schedule refuses foreign videos, bad times, missing title and a full queue", async () => {
  const state = setup({ pending: Array.from({ length: 10 }, (_, index) => ({ id: `p${index}`, channelId: channels.instagram })) });
  const ticket = await uploaded(state);
  const base = { video_id: ticket.video_id, caption: "Lot 12", youtube_title: "Lot 12", due_at: soon(60) };
  assert.match((await call(state.env, "schedule_post", base, tokens.other)).error, /Video not found/);
  assert.match((await call(state.env, "schedule_post", { ...base, due_at: soon(5) })).error, /15 minutes/);
  assert.match((await call(state.env, "schedule_post", { ...base, due_at: soon(6 * 24 * 60) })).error, /5 day storage/);
  assert.match((await call(state.env, "schedule_post", { ...base, youtube_title: undefined })).error, /youtube_title/);
  assert.match((await call(state.env, "schedule_post", base)).error, /instagram queue is full/);
  assert.equal(state.buffer.calls.some(entry => entry.query.includes("createPost")), false);
  const partial = await call(state.env, "schedule_post", { ...base, channels: ["facebook"] });
  assert.deepEqual(partial.posts.map(post => [post.service, post.status]), [["facebook", "scheduled"]]);
});

test("a Buffer rejection is reported and can be retried", async () => {
  const state = setup({ reject: "Video could not be read from its URL" });
  const ticket = await uploaded(state);
  const request = { video_id: ticket.video_id, caption: "Lot 12", channels: ["facebook"], due_at: soon(60) };
  const failed = await call(state.env, "schedule_post", request);
  assert.deepEqual(failed.posts, [{ service: "facebook", status: "rejected", error: "Video could not be read from its URL" }]);
  state.buffer.reject = null;
  assert.equal((await call(state.env, "schedule_post", request)).posts[0].status, "scheduled");
});

test("daily upload limit is enforced per client", async () => {
  const state = setup();
  for (let index = 0; index < 20; index++) assert.ok((await call(state.env, "create_video_upload", upload)).video_id);
  assert.match((await call(state.env, "create_video_upload", upload)).error, /Daily upload limit/);
  assert.ok((await call(state.env, "create_video_upload", upload, tokens.other)).video_id);
});

test("a missing or malformed publish profile fails closed", async () => {
  const state = setup();
  state.env.PUBLISH_PROFILE_C1994 = "{not json";
  assert.equal((await call(state.env, "create_video_upload", upload)).error, "Service unavailable.");
});
