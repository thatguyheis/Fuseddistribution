import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(serviceRoot, "../..");
const packageScript = path.join(serviceRoot, "scripts/package-client-kit.mjs");
mkdirSync(path.join(repoRoot, ".build"), { recursive: true });
const buildRoot = mkdtempSync(path.join(repoRoot, ".build/client-kit-test-"));
const tempRoot = mkdtempSync(path.join(tmpdir(), "fused-client-kit-test-"));
const kitRoot = path.join(buildRoot, "kit");
const fileNames = ["README.md", "FUSED-CLIENT-WORKFLOW.md", "create-reel-plan.mjs", "brief.example.json", "install.mjs", "config/codex.toml", "config/claude.mcp.json"];

after(() => {
  rmSync(buildRoot, { recursive: true, force: true });
  rmSync(tempRoot, { recursive: true, force: true });
});

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8", cwd: repoRoot });
}
const packaged = run(packageScript, [kitRoot]);
assert.equal(packaged.status, 0, packaged.stderr);

function project(name) {
  const directory = path.join(tempRoot, name);
  mkdirSync(directory, { recursive: true });
  return directory;
}
function write(root, file, content) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}
function snapshot(root, prefix = "") {
  const entries = {};
  for (const name of readdirSync(path.join(root, prefix)).sort()) {
    const relative = path.join(prefix, name);
    const target = path.join(root, relative);
    const state = lstatSync(target);
    if (state.isSymbolicLink()) entries[relative] = { link: readlinkSync(target) };
    else if (state.isDirectory()) {
      entries[`${relative}/`] = "directory";
      Object.assign(entries, snapshot(root, relative));
    } else entries[relative] = readFileSync(target, "utf8");
  }
  return entries;
}
function install(root, kit = kitRoot) { return run(path.join(kit, "install.mjs"), [root]); }
function expectRefusalWithoutChanges(root, expression) {
  const before = snapshot(root);
  const result = install(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, expression);
  assert.deepEqual(snapshot(root), before, "preflight refusal must leave the project unchanged");
}

test("package has only the client allowlist and valid hashes, with no credentials", () => {
  const manifest = JSON.parse(readFileSync(path.join(kitRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.formatVersion, 1);
  assert.deepEqual(Object.keys(manifest.files).sort(), [...fileNames].sort());
  const zip = spawnSync("/usr/bin/unzip", ["-Z1", `${kitRoot}.zip`], { encoding: "utf8" });
  assert.equal(zip.status, 0, zip.stderr);
  assert.deepEqual(zip.stdout.trim().split("\n").sort(), [...fileNames, "manifest.json"].sort());
  for (const file of fileNames) {
    const bytes = readFileSync(path.join(kitRoot, file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.files[file]);
  }
  const claude = JSON.parse(readFileSync(path.join(kitRoot, "config/claude.mcp.json"), "utf8"));
  assert.equal(claude.mcpServers.fused_reel.headers.Authorization, "Bearer ${FUSED_INSTRUCTIONS_TOKEN}");
  assert.match(readFileSync(path.join(kitRoot, "config/codex.toml"), "utf8"), /bearer_token_env_var = "FUSED_INSTRUCTIONS_TOKEN"/);
  assert.equal(fileNames.some(file => /\.token|private|policy|operator|owner/.test(file)), false);
});

test("installation preserves unrelated configuration and agent documents, and repeats without changes", () => {
  const root = project("existing-project");
  const otherServer = { command: "node", args: ["local-tool.mjs"] };
  write(root, ".mcp.json", JSON.stringify({ keepThis: true, mcpServers: { existing: otherServer } }));
  const originalToml = 'model = "gpt-5"\n\n[mcp_servers.existing]\ncommand = "node"\n';
  write(root, ".codex/config.toml", originalToml);
  write(root, "AGENTS.md", "# Customer conventions\nKeep the existing build process.\n");
  write(root, "CLAUDE.md", "# Existing project instructions");
  const result = install(root);
  assert.equal(result.status, 0, result.stderr);
  const mcp = JSON.parse(readFileSync(path.join(root, ".mcp.json"), "utf8"));
  assert.equal(mcp.keepThis, true);
  assert.deepEqual(mcp.mcpServers.existing, otherServer);
  assert.ok(mcp.mcpServers.fused_reel);
  assert.ok(readFileSync(path.join(root, ".codex/config.toml"), "utf8").startsWith(originalToml));
  assert.ok(readFileSync(path.join(root, "AGENTS.md"), "utf8").startsWith("# Customer conventions\nKeep the existing build process.\n"));
  assert.ok(readFileSync(path.join(root, "CLAUDE.md"), "utf8").startsWith("# Existing project instructions\n"));
  for (const file of ["create-reel-plan.mjs", "brief.example.json", "FUSED-CLIENT-WORKFLOW.md"]) {
    assert.equal(readFileSync(path.join(root, ".fused-reel", file), "utf8"), readFileSync(path.join(kitRoot, file), "utf8"));
  }
  const before = snapshot(root);
  const again = install(root);
  assert.equal(again.status, 0, again.stderr);
  assert.deepEqual(snapshot(root), before);
});

test("conflicting MCP, TOML, workflow markers, and local integration files refuse before changes", () => {
  const cases = [
    ["mcp-conflict", ".mcp.json", JSON.stringify({ mcpServers: { fused_reel: { url: "https://example.com" } } }), /conflicting fused_reel server/],
    ["toml-conflict", ".codex/config.toml", '[mcp_servers.fused_reel]\nurl = "https://example.com"\n', /conflicting fused_reel configuration/],
    ["pointer-conflict", "CLAUDE.md", "Customer content\n<!-- BEGIN FUSED CLIENT WORKFLOW -->\nchanged\n<!-- END FUSED CLIENT WORKFLOW -->\n", /Conflicting Fused workflow pointer/],
    ["integration-conflict", ".fused-reel/brief.example.json", '{"topic":"Customer draft"}\n', /Existing file differs/],
    ["invalid-json", ".mcp.json", "{broken", /JSON|Unexpected|Expected/],
  ];
  for (const [name, file, content, expression] of cases) {
    const root = project(name);
    write(root, file, content);
    expectRefusalWithoutChanges(root, expression);
  }
});

test("personal production workspace and its descendants reject client installation", () => {
  const root = project("personal-workspace");
  write(root, "ops/content-scope.json", "{}\n");
  write(root, "video/REEL-SOP.md", "Owner workflow\n");
  const nested = path.join(root, "nested/client");
  mkdirSync(nested, { recursive: true });
  expectRefusalWithoutChanges(root, /personal production workspace/);
  expectRefusalWithoutChanges(nested, /personal production workspace/);
});

test("config and integration symlinks are refused without writing outside the project", () => {
  for (const relative of [".codex", ".mcp.json", "AGENTS.md", ".fused-reel"]) {
    const root = project(`symlink-${relative.replaceAll(".", "")}`);
    const outside = project(`outside-${relative.replaceAll(".", "")}`);
    write(outside, "sentinel", "Do not modify\n");
    const isDirectory = [".codex", ".fused-reel"].includes(relative);
    symlinkSync(isDirectory ? outside : path.join(outside, "sentinel"), path.join(root, relative));
    const beforeOutside = snapshot(outside);
    expectRefusalWithoutChanges(root, /symbolic link/);
    assert.deepEqual(snapshot(outside), beforeOutside);
  }
  const dangling = project("dangling-config");
  const missing = path.join(tempRoot, "must-not-be-created.json");
  symlinkSync(missing, path.join(dangling, ".mcp.json"));
  expectRefusalWithoutChanges(dangling, /symbolic link/);
  assert.equal(existsSync(missing), false);
});

test("tampering with a packaged file fails integrity verification before installation", () => {
  const changedKit = path.join(tempRoot, "changed-kit");
  cpSync(kitRoot, changedKit, { recursive: true });
  write(changedKit, "create-reel-plan.mjs", "throw new Error('changed');\n");
  const root = project("tampered-destination");
  const before = snapshot(root);
  const result = install(root, changedKit);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /integrity check failed/);
  assert.deepEqual(snapshot(root), before);
});

test("packager rejects unsafe output locations, symlinks, and overwrites", () => {
  const outside = path.join(tempRoot, "outside-kit");
  let result = run(packageScript, [outside]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /under this repository/);
  assert.equal(existsSync(outside), false);

  const linked = path.join(buildRoot, "linked");
  symlinkSync(tempRoot, linked);
  result = run(packageScript, [path.join(linked, "new-kit")]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symbolic link/);
  assert.equal(existsSync(path.join(tempRoot, "new-kit")), false);

  const linkedZip = path.join(buildRoot, "linked-zip-kit");
  const missingZip = path.join(tempRoot, "must-not-be-created.zip");
  symlinkSync(missingZip, `${linkedZip}.zip`);
  result = run(packageScript, [linkedZip]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists/);
  assert.equal(existsSync(linkedZip), false);
  assert.equal(existsSync(missingZip), false);

  const before = snapshot(kitRoot);
  result = run(packageScript, [kitRoot]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists/);
  assert.deepEqual(snapshot(kitRoot), before);
});
