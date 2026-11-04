#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(serviceRoot, "../..");
const sourceRoot = path.join(serviceRoot, "client");
const files = new Map([
  ["README.md", "CLIENT-README.md"],
  ["FUSED-CLIENT-WORKFLOW.md", "AGENTS.example.md"],
  ["create-reel-plan.mjs", "create-reel-plan.mjs"],
  ["brief.example.json", "brief.example.json"],
  ["install.mjs", "install.mjs"],
  ["config/codex.toml", "config/codex.toml"],
  ["config/claude.mcp.json", "config/claude.mcp.json"],
]);

function fail(message) { throw new Error(message); }
function statOrMissing(file) {
  try { return lstatSync(file); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function packageKit(destination) {
  const target = path.resolve(destination);
  const relative = path.relative(repoRoot, target);
  if (!relative.startsWith(`.build${path.sep}`) && !relative.startsWith(`outputs${path.sep}`)) fail("Kit output must be a new directory under this repository's ignored .build/ or outputs/.");
  let current = repoRoot;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    const state = statOrMissing(current);
    if (state && (state.isSymbolicLink() || !state.isDirectory())) fail("Kit output path contains a symbolic link or non-directory.");
  }
  if (statOrMissing(target) || statOrMissing(`${target}.zip`)) fail("Kit output directory or ZIP already exists. Choose a new output path.");
  execFileSync("git", ["check-ignore", "--quiet", "--", relative], { cwd: repoRoot, stdio: "ignore" });
  const payloads = [];
  const manifest = { formatVersion: 1, files: {} };
  for (const [name, source] of files) {
    const file = path.join(sourceRoot, source);
    if (lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile() || !realpathSync(file).startsWith(`${realpathSync(sourceRoot)}${path.sep}`)) fail(`Unsafe kit source: ${source}`);
    const bytes = readFileSync(file);
    payloads.push([name, bytes]);
    manifest.files[name] = createHash("sha256").update(bytes).digest("hex");
  }
  mkdirSync(target, { recursive: true });
  for (const [name, bytes] of payloads) {
    const file = path.join(target, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes, { flag: "wx", mode: 0o644 });
  }
  writeFileSync(path.join(target, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o644 });
  execFileSync("/usr/bin/zip", ["-q", `${target}.zip`, ...files.keys(), "manifest.json"], { cwd: target, stdio: "pipe" });
  console.log(`Created client kit: ${target}\nZIP: ${target}.zip\nContains no credential, owner tool, or private policy.`);
}
try {
  if (process.argv.length !== 3) fail("Usage: node package-client-kit.mjs <new-output-directory-under-.build-or-outputs>");
  packageKit(process.argv[2]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
