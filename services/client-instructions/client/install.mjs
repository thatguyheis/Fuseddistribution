#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants, closeSync, fstatSync, ftruncateSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const kitRoot = path.dirname(fileURLToPath(import.meta.url));
const kitFiles = ["README.md", "FUSED-CLIENT-WORKFLOW.md", "create-reel-plan.mjs", "brief.example.json", "install.mjs", "config/codex.toml", "config/claude.mcp.json"];
const markerStart = "<!-- BEGIN FUSED CLIENT WORKFLOW -->";
const markerEnd = "<!-- END FUSED CLIENT WORKFLOW -->";
const pointer = `${markerStart}\nFor this client project's paid reel work, follow [.fused-reel/FUSED-CLIENT-WORKFLOW.md](.fused-reel/FUSED-CLIENT-WORKFLOW.md) and make a fresh Fused service call for each reel. Keep credentials outside project files.\n${markerEnd}`;

function statOrMissing(file) {
  try { return lstatSync(file); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function safePath(root, relative) {
  const parts = relative.split("/");
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const state = statOrMissing(current);
    if (!state) continue;
    if (state.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${relative}`);
    if (index < parts.length - 1 && !state.isDirectory()) throw new Error(`Expected a directory in: ${relative}`);
    if (index === parts.length - 1 && !state.isFile()) throw new Error(`Expected a regular file: ${relative}`);
  }
  return current;
}
function readOptional(root, relative) {
  const file = safePath(root, relative);
  const state = statOrMissing(file);
  return { file, state, content: state ? readFileSync(file, "utf8") : "" };
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function withPointer(content, name) {
  if (content.includes(markerStart) || content.includes(markerEnd)) {
    if (!content.includes(pointer) || content.split(markerStart).length !== 2 || content.split(markerEnd).length !== 2) throw new Error(`Conflicting Fused workflow pointer in ${name}.`);
    return content;
  }
  return `${content}${content && !content.endsWith("\n") ? "\n" : ""}${content ? "\n" : ""}${pointer}\n`;
}
function verifyKit() {
  const manifest = JSON.parse(readFileSync(safePath(kitRoot, "manifest.json"), "utf8"));
  if (manifest.formatVersion !== 1 || !manifest.files || JSON.stringify(Object.keys(manifest.files).sort()) !== JSON.stringify([...kitFiles].sort())) throw new Error("Invalid kit manifest.");
  for (const file of kitFiles) {
    const digest = createHash("sha256").update(readFileSync(safePath(kitRoot, file))).digest("hex");
    if (manifest.files[file] !== digest) throw new Error(`Kit integrity check failed for ${file}. Obtain a fresh kit from Fused.`);
  }
}
function install(target) {
  verifyKit();
  const requested = path.resolve(target);
  const rootState = statOrMissing(requested);
  if (!rootState?.isDirectory() || rootState.isSymbolicLink()) throw new Error("The client project must be an existing directory, not a symbolic link.");
  const root = realpathSync(requested);
  if (root === realpathSync(homedir()) || root === path.parse(root).root) throw new Error("Choose a client project directory, not a home or filesystem root. Global configuration is never installed.");
  for (let ancestor = root; ; ancestor = path.dirname(ancestor)) {
    if (statOrMissing(path.join(ancestor, "ops/content-scope.json")) && statOrMissing(path.join(ancestor, "video/REEL-SOP.md"))) throw new Error("Refusing to install the client payment gate into Fused's personal production workspace.");
    if (ancestor === path.dirname(ancestor)) break;
  }

  const planned = [];
  function add(relative, content) {
    const original = readOptional(root, relative);
    planned.push({ relative, ...original, next: content });
  }
  for (const name of ["create-reel-plan.mjs", "brief.example.json", "FUSED-CLIENT-WORKFLOW.md"]) {
    const relative = `.fused-reel/${name}`;
    const original = readOptional(root, relative);
    const source = readFileSync(path.join(kitRoot, name), "utf8");
    if (original.state && original.content !== source) throw new Error(`Existing file differs: ${relative}. Preserve your changes before reinstalling.`);
    add(relative, source);
  }

  const mcp = readOptional(root, ".mcp.json");
  const existing = mcp.state ? JSON.parse(mcp.content) : {};
  if (!existing || Array.isArray(existing) || typeof existing !== "object" || (existing.mcpServers !== undefined && (!existing.mcpServers || Array.isArray(existing.mcpServers) || typeof existing.mcpServers !== "object"))) throw new Error("Existing .mcp.json has an invalid structure.");
  const entry = JSON.parse(readFileSync(path.join(kitRoot, "config/claude.mcp.json"), "utf8")).mcpServers.fused_reel;
  if (Object.hasOwn(existing.mcpServers || {}, "fused_reel") && JSON.stringify(canonical(existing.mcpServers.fused_reel)) !== JSON.stringify(canonical(entry))) throw new Error("Existing .mcp.json has a conflicting fused_reel server.");
  const merged = { ...existing, mcpServers: { ...existing.mcpServers, fused_reel: entry } };
  add(".mcp.json", `${JSON.stringify(merged, null, 2)}\n`);

  const toml = readOptional(root, ".codex/config.toml");
  const fragment = readFileSync(path.join(kitRoot, "config/codex.toml"), "utf8").trimEnd();
  if (toml.content.includes("fused_reel")) {
    if (!toml.content.includes(fragment) || toml.content.replace(fragment, "").includes("fused_reel")) throw new Error("Existing .codex/config.toml has a conflicting fused_reel configuration. Merge it explicitly.");
    add(".codex/config.toml", toml.content);
  } else {
    add(".codex/config.toml", `${toml.content}${toml.content && !toml.content.endsWith("\n") ? "\n" : ""}${toml.content ? "\n" : ""}${fragment}\n`);
  }
  for (const name of ["AGENTS.md", "CLAUDE.md"]) add(name, withPointer(readOptional(root, name).content, name));

  // All known conflicts and symlinks are checked before the first mutation.
  for (const item of planned) {
    safePath(root, item.relative);
    const latest = statOrMissing(item.file);
    if (Boolean(latest) !== Boolean(item.state) || (latest && (latest.ino !== item.state.ino || latest.dev !== item.state.dev || readFileSync(item.file, "utf8") !== item.content))) throw new Error(`File changed during preflight: ${item.relative}. Retry with no other process editing the project.`);
  }
  for (const item of planned) {
    if (item.state && item.content === item.next) continue;
    safePath(root, item.relative);
    mkdirSync(path.dirname(item.file), { recursive: true });
    const flags = constants.O_WRONLY | constants.O_NOFOLLOW | (item.state ? 0 : constants.O_CREAT | constants.O_EXCL);
    const fd = openSync(item.file, flags, 0o644);
    try {
      const current = fstatSync(fd);
      if (item.state && (current.ino !== item.state.ino || current.dev !== item.state.dev)) throw new Error(`File changed during installation: ${item.relative}.`);
      ftruncateSync(fd, 0);
      writeFileSync(fd, item.next, "utf8");
    } finally { closeSync(fd); }
  }
  console.log(`Installed Fused reel integration into ${root}. Supply FUSED_INSTRUCTIONS_TOKEN privately, trust this project in Codex, and reopen your agent.`);
}
try {
  if (process.argv.length !== 3) throw new Error("Usage: node install.mjs <existing-client-project-directory>");
  install(process.argv[2]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
