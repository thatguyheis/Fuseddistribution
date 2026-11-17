// Client video upload and Buffer scheduling.
// A client only reaches this code when its D1 row names a publish profile. The profile
// (Buffer key, organization, channel IDs) is a Worker secret and is never returned or logged.
import { z } from "zod";
import { ServiceError, hash } from "./errors.js";

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // KV value cap and Buffer video cap
const UPLOAD_WINDOW_MS = 15 * 60_000;
const RETENTION_SECONDS = 5 * 24 * 3600;
const MIN_LEAD_MS = 15 * 60_000;
const EXPIRY_MARGIN_MS = 60 * 60_000;
const DAILY_LIMITS = { upload: 20, post: 30 };
const BUFFER_API = "https://api.buffer.com";
const SERVICES = ["youtube", "instagram", "facebook"];
const VIDEO_ID = /^[a-z0-9]{2,16}-up-[a-f0-9]{12}$/;
const POST_FIELDS = "id status dueAt channelId assets { id mimeType source }";

const ProfileSchema = z.strictObject({
  token: z.string().min(20),
  organizationId: z.string().regex(/^[a-f0-9]{24}$/),
  channels: z.strictObject({
    youtube: z.string().regex(/^[a-f0-9]{24}$/).optional(),
    instagram: z.string().regex(/^[a-f0-9]{24}$/).optional(),
    facebook: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  }),
  maxPending: z.number().int().min(1).max(2000).default(10),
});

export const UploadSchema = z.strictObject({
  filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,115}\.mp4$/i).describe("MP4 file name, for your own reference."),
  bytes: z.number().int().min(1024).max(MAX_VIDEO_BYTES).describe("Exact file size in bytes. Maximum 26214400 (25 MiB)."),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).describe("Lowercase hex SHA-256 of the file (shasum -a 256 file.mp4)."),
});
export const ScheduleSchema = z.strictObject({
  video_id: z.string().regex(VIDEO_ID),
  caption: z.string().trim().min(1).max(2200).describe("Post text for every chosen channel."),
  youtube_title: z.string().trim().min(1).max(100).optional().describe("Required when youtube is one of the channels."),
  channels: z.array(z.enum(SERVICES)).min(1).max(3).optional().describe("Defaults to every connected channel."),
  due_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/).describe("Publish time with offset, for example 2026-11-17T17:30:00-08:00. At least 15 minutes ahead and before the video expires."),
});
export const StatusSchema = z.strictObject({ post_id: z.string().regex(/^[a-f0-9]{24}$/) });

function profileFor(env, client) {
  const name = client.publish_profile;
  if (typeof name !== "string" || !/^[a-z0-9]{2,16}$/.test(name)) throw new ServiceError(403, "Publishing is not enabled for this account.");
  let parsed;
  try { parsed = ProfileSchema.safeParse(JSON.parse(env[`PUBLISH_PROFILE_${name.toUpperCase()}`])); } catch { parsed = null; }
  if (!parsed?.success || !env.REELS_KV || !/^https:\/\/[a-z0-9.-]+$/.test(env.MEDIA_BASE_URL || "")) throw new ServiceError(503, "Service unavailable.");
  return { name, ...parsed.data };
}
function mediaUrl(env, id) { return `${env.MEDIA_BASE_URL}/reels/${id}/${id}.mp4`; }
function iso(ms) { return new Date(ms).toISOString(); }

async function reserve(env, client, kind, count = 1) {
  const day = iso(Date.now()).slice(0, 10);
  const row = await env.DB.prepare(`INSERT INTO publish_usage (client_id, day, kind, runs) VALUES (?, ?, ?, ?)
    ON CONFLICT(client_id, day, kind) DO UPDATE SET runs = runs + excluded.runs WHERE runs + excluded.runs <= ? RETURNING runs`)
    .bind(client.id, day, kind, count, DAILY_LIMITS[kind]).first();
  if (!row) throw new ServiceError(429, `Daily ${kind} limit reached (${DAILY_LIMITS[kind]} per day).`);
}

async function buffer(profile, query, variables) {
  let response, body;
  try {
    response = await fetch(BUFFER_API, {
      method: "POST",
      headers: { authorization: `Bearer ${profile.token}`, "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    });
    body = await response.json();
  } catch { throw new ServiceError(502, "Buffer did not respond. Try again shortly."); }
  if (response.status === 429) throw new ServiceError(429, "Buffer rate limit reached. Try again later.");
  if (!response.ok || !body || body.errors?.length || !body.data) throw new ServiceError(502, "Buffer rejected the request.");
  return body.data;
}

export async function createUpload(raw, client, env, origin) {
  const profile = profileFor(env, client);
  const input = UploadSchema.safeParse(raw);
  if (!input.success) throw new ServiceError(400, "Invalid upload request. Supply an .mp4 filename, exact bytes (max 26214400) and lowercase sha256.");
  await reserve(env, client, "upload");
  const random = crypto.getRandomValues(new Uint8Array(38));
  const id = `${profile.name}-up-${Array.from(random.slice(0, 6), b => b.toString(16).padStart(2, "0")).join("")}`;
  const key = btoa(String.fromCharCode(...random.slice(6))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const expires = iso(Date.now() + UPLOAD_WINDOW_MS);
  await env.DB.prepare("INSERT INTO publish_videos (id, client_id, filename, bytes, sha256, upload_key_hash, upload_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, client.id, input.data.filename, input.data.bytes, input.data.sha256, await hash(key), expires).run();
  const uploadUrl = `${origin}/v1/uploads/${id}?key=${key}`;
  return {
    video_id: id, upload_url: uploadUrl, method: "PUT", upload_expires_at: expires,
    command: `curl -fsS -X PUT -H "Content-Type: video/mp4" --data-binary @"${input.data.filename}" "${uploadUrl}"`,
    note: "The link works once and only for the declared file. After upload the video is kept for 5 days.",
  };
}

// Reached without a bearer token: the one time key in the URL is the credential.
export async function receiveUpload(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.slice("/v1/uploads/".length);
  const key = url.searchParams.get("key") || "";
  const denied = new ServiceError(403, "Upload link is invalid, used or expired.");
  if (!VIDEO_ID.test(id) || !/^[A-Za-z0-9_-]{40,50}$/.test(key)) throw denied;
  const row = await env.DB.prepare(`SELECT v.bytes, v.sha256, v.status, v.upload_key_hash, v.upload_expires_at, c.paid, c.access_until, c.publish_profile
    FROM publish_videos v JOIN clients c ON c.id = v.client_id WHERE v.id = ?`).bind(id).first();
  if (!row || row.upload_key_hash !== await hash(key) || row.status !== "pending" || Date.parse(row.upload_expires_at) <= Date.now()) throw denied;
  if (row.paid !== 1 || (row.access_until && !(Date.parse(row.access_until) > Date.now())) || !id.startsWith(`${row.publish_profile}-up-`)) throw denied;
  if (!env.REELS_KV) throw new ServiceError(503, "Service unavailable.");
  const declared = request.headers.get("Content-Length");
  if (declared !== null && Number(declared) !== row.bytes) throw new ServiceError(400, "File size does not match the declared bytes.");
  if (!request.body) throw new ServiceError(400, "Send the MP4 as the request body.");
  const media = new Uint8Array(row.bytes);
  const reader = request.body.getReader();
  let offset = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (offset + value.byteLength > row.bytes) { await reader.cancel(); throw new ServiceError(400, "File size does not match the declared bytes."); }
    media.set(value, offset);
    offset += value.byteLength;
  }
  if (offset !== row.bytes) throw new ServiceError(400, "File size does not match the declared bytes.");
  if (String.fromCharCode(...media.slice(4, 8)) !== "ftyp") throw new ServiceError(415, "The file is not an MP4 video.");
  if (await hash(media) !== row.sha256) throw new ServiceError(422, "File checksum does not match the declared sha256.");
  const expiresAt = iso(Date.now() + RETENTION_SECONDS * 1000);
  await env.REELS_KV.put(`reels/${id}/${id}.mp4`, media, { expirationTtl: RETENTION_SECONDS });
  const claimed = await env.DB.prepare("UPDATE publish_videos SET status = 'ready', expires_at = ? WHERE id = ? AND status = 'pending' RETURNING id")
    .bind(expiresAt, id).first();
  if (!claimed) throw denied;
  console.log(JSON.stringify({ event: "publish_upload_stored", videoId: id, bytes: row.bytes }));
  return { video_id: id, status: "ready", video_url: mediaUrl(env, id), expires_at: expiresAt };
}

export async function listVideos(client, env) {
  profileFor(env, client);
  const now = iso(Date.now());
  const videos = (await env.DB.prepare(`SELECT id, filename, bytes, status, upload_expires_at, expires_at, created_at FROM publish_videos
    WHERE client_id = ? AND ((status = 'ready' AND expires_at > ?) OR (status = 'pending' AND upload_expires_at > ?)) ORDER BY created_at DESC LIMIT 50`)
    .bind(client.id, now, now).all()).results;
  const posts = (await env.DB.prepare("SELECT video_id, service, post_id, due_at, status FROM publish_posts WHERE client_id = ? ORDER BY created_at DESC LIMIT 200")
    .bind(client.id).all()).results;
  return { videos: videos.map(video => ({
    video_id: video.id, filename: video.filename, bytes: video.bytes, status: video.status,
    ...(video.status === "ready" ? { video_url: mediaUrl(env, video.id), expires_at: video.expires_at } : { upload_expires_at: video.upload_expires_at }),
    posts: posts.filter(post => post.video_id === video.id).map(({ service, post_id, due_at, status }) => ({ service, post_id, due_at, status })),
  })) };
}

function metadataFor(service, title) {
  if (service === "youtube") return { youtube: { title, categoryId: "27", privacy: "public", madeForKids: false, notifySubscribers: true, embeddable: true, license: "youtube" } };
  if (service === "instagram") return { instagram: { type: "reel", shouldShareToFeed: true } };
  return { facebook: { type: "reel" } };
}

export async function schedulePost(raw, client, env, recheck) {
  const profile = profileFor(env, client);
  const input = ScheduleSchema.safeParse(raw);
  if (!input.success) throw new ServiceError(400, "Invalid schedule request. Supply video_id, caption, due_at with a UTC offset, and youtube_title when posting to YouTube.");
  const { video_id: videoId, caption, youtube_title: title } = input.data;
  const services = [...new Set(input.data.channels || SERVICES.filter(service => profile.channels[service]))];
  const missing = services.filter(service => !profile.channels[service]);
  if (!services.length || missing.length) throw new ServiceError(400, `Channel not connected: ${missing.join(", ") || "none available"}.`);
  if (services.includes("youtube") && !title) throw new ServiceError(400, "youtube_title is required when posting to YouTube.");
  const video = await env.DB.prepare("SELECT id, status, expires_at FROM publish_videos WHERE id = ? AND client_id = ?").bind(videoId, client.id).first();
  if (!video || video.status !== "ready" || Date.parse(video.expires_at) <= Date.now()) throw new ServiceError(404, "Video not found, not uploaded yet, or expired. Upload it again.");
  const due = Date.parse(input.data.due_at);
  if (!Number.isFinite(due) || due < Date.now() + MIN_LEAD_MS) throw new ServiceError(400, "due_at must be at least 15 minutes from now.");
  if (due > Date.parse(video.expires_at) - EXPIRY_MARGIN_MS) throw new ServiceError(400, `due_at must be before ${iso(Date.parse(video.expires_at) - EXPIRY_MARGIN_MS)}, when this video's 5 day storage ends. Pick an earlier time or upload again closer to the date.`);
  const dueAt = iso(due);

  const existing = (await env.DB.prepare("SELECT service, post_id, due_at, status FROM publish_posts WHERE video_id = ?").bind(videoId).all()).results;
  const results = existing.filter(post => services.includes(post.service)).map(post => ({ ...post, already_scheduled: true }));
  const todo = services.filter(service => !existing.some(post => post.service === service));
  if (!todo.length) return { video_id: videoId, posts: results };

  // The plan caps pending posts per channel. Check room before creating anything.
  const pending = (await buffer(profile, "query Q($i: PostsInput!) { posts(first: 100, input: $i) { edges { node { id channelId } } } }",
    { i: { organizationId: profile.organizationId, filter: { status: ["scheduled", "sending"] } } })).posts.edges.map(edge => edge.node);
  for (const service of todo) {
    const have = pending.filter(post => post.channelId === profile.channels[service]).length;
    if (have + 1 > profile.maxPending) throw new ServiceError(409, `The ${service} queue is full (${have} of ${profile.maxPending} pending). Nothing was scheduled.`);
  }
  await reserve(env, client, "post", todo.length);

  for (const service of todo) {
    // Access revoked mid run must stop further posts.
    await recheck();
    // Claim the slot first so a retry or a parallel call can never post the same video twice.
    const claim = await env.DB.prepare("INSERT INTO publish_posts (video_id, service, client_id, due_at, status) VALUES (?, ?, ?, ?, 'creating') ON CONFLICT DO NOTHING RETURNING service")
      .bind(videoId, service, client.id, dueAt).first();
    if (!claim) { results.push({ service, status: "in_progress", already_scheduled: true }); continue; }
    const channelId = profile.channels[service];
    let created;
    try {
      created = (await buffer(profile, `mutation M($input: CreatePostInput!) { createPost(input: $input) {
        ... on PostActionSuccess { post { ${POST_FIELDS} } } ... on MutationError { message } } }`, { input: {
        channelId, mode: "customScheduled", schedulingType: "automatic", text: caption,
        assets: [{ video: { url: mediaUrl(env, videoId) } }], metadata: metadataFor(service, title), dueAt,
      } })).createPost;
    } catch (error) {
      // Outcome unknown (timeout or transport failure): keep the claim so a retry cannot double post.
      await env.DB.prepare("UPDATE publish_posts SET status = 'unknown' WHERE video_id = ? AND service = ?").bind(videoId, service).run();
      results.push({ service, status: "unknown", error: `${error.message} Check the Buffer queue before retrying.` });
      continue;
    }
    if (!created?.post?.id) {
      // Buffer refused cleanly, so nothing exists there; release the claim to allow a corrected retry.
      await env.DB.prepare("DELETE FROM publish_posts WHERE video_id = ? AND service = ? AND status = 'creating'").bind(videoId, service).run();
      results.push({ service, status: "rejected", error: String(created?.message || "Buffer rejected the post.").slice(0, 300) });
      continue;
    }
    let live = null;
    try { live = (await buffer(profile, `query P($input: PostInput!) { post(input: $input) { ${POST_FIELDS} } }`, { input: { id: created.post.id } })).post; } catch { /* reported below */ }
    const verified = Boolean(live && ["scheduled", "sending"].includes(live.status) && live.channelId === channelId && live.assets?.some(asset => asset.mimeType?.startsWith("video/")));
    const status = verified ? live.status : "unverified";
    await env.DB.prepare("UPDATE publish_posts SET post_id = ?, status = ? WHERE video_id = ? AND service = ?").bind(created.post.id, status, videoId, service).run();
    console.log(JSON.stringify({ event: "publish_post_created", clientId: client.id, videoId, service, verified }));
    results.push({ service, post_id: created.post.id, due_at: live?.dueAt || dueAt, status,
      ...(verified ? { video_attached: true } : { error: "Created, but the read back did not confirm a scheduled post with video. Check this post in Buffer." }) });
  }
  return { video_id: videoId, posts: results };
}

export async function postStatus(raw, client, env) {
  const profile = profileFor(env, client);
  const input = StatusSchema.safeParse(raw);
  if (!input.success) throw new ServiceError(400, "Invalid post_id.");
  const own = await env.DB.prepare("SELECT video_id, service FROM publish_posts WHERE post_id = ? AND client_id = ?").bind(input.data.post_id, client.id).first();
  if (!own) throw new ServiceError(404, "Post not found.");
  const live = (await buffer(profile, "query P($input: PostInput!) { post(input: $input) { id status dueAt sentAt externalLink } }", { input: { id: input.data.post_id } })).post;
  const status = live?.status || "missing";
  await env.DB.prepare("UPDATE publish_posts SET status = ? WHERE post_id = ? AND client_id = ?").bind(status, input.data.post_id, client.id).run();
  return { post_id: input.data.post_id, video_id: own.video_id, service: own.service, status, due_at: live?.dueAt || null, sent_at: live?.sentAt || null, link: live?.externalLink || null };
}
