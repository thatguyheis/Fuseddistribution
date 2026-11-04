#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(serviceRoot, "../..");
const wrangler = path.join(repoRoot, "node_modules/.bin/wrangler");
const credentialsDir = path.join(repoRoot, ".build/client-instructions/credentials");
const namePattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const local = process.argv[2] === "--local";

function fail(message) {
  throw new Error(message);
}

function identifier(value, label, pattern = namePattern) {
  if (!value || !pattern.test(value)) fail(`Invalid ${label}.`);
  return value;
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function execute(sql) {
  const directory = mkdtempSync(path.join(tmpdir(), "fused-instructions-sql-"));
  const file = path.join(directory, "query.sql");
  try {
    writeFileSync(file, sql, { mode: 0o600 });
    const output = execFileSync(wrangler, [
      "d1", "execute", "fused-client-instructions", "--config", "wrangler.jsonc",
      local ? "--local" : "--remote", "--file", file, "--json",
    ], { cwd: serviceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
    return JSON.parse(output);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function rows(result) {
  return Array.isArray(result) ? result.flatMap((entry) => entry.results || []) : [];
}

function createClient(clientId, bundleName) {
  identifier(clientId, "client ID");
  identifier(bundleName, "bundle name");
  const credentialPath = path.join(credentialsDir, `${clientId}.token`);
  if (existsSync(credentialPath)) fail(`Credential file already exists for ${clientId}.`);
  mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
  chmodSync(credentialsDir, 0o700);
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  execute(`INSERT INTO clients (id, token_hash, bundle_name, status_actor, status_reason)
    VALUES (${sqlString(clientId)}, ${sqlString(hash)}, ${sqlString(bundleName)}, 'operator', 'New client; unpaid by default');`);
  writeFileSync(credentialPath, `${token}\n`, { flag: "wx", mode: 0o600 });
  console.log(`Created unpaid client ${clientId}. Credential saved to ${credentialPath}`);
}

function setPaid(clientId, paidText, actor, reason) {
  identifier(clientId, "client ID");
  identifier(actor, "actor");
  if (paidText !== "true" && paidText !== "false") fail("Paid must be true or false.");
  if (!reason || reason.length > 240 || /[\r\n\0]/.test(reason)) fail("Reason must be one line, 1 to 240 characters.");
  const paid = paidText === "true" ? 1 : 0;
  const result = execute(`UPDATE clients SET paid = ${paid}, status_actor = ${sqlString(actor)},
    status_reason = ${sqlString(reason)}, status_changed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ${sqlString(clientId)} RETURNING id, paid, status_changed_at;`);
  if (rows(result).length !== 1) fail(`Client ${clientId} was not found.`);
  console.log(`Client ${clientId}: paid=${paidText}. Audit trigger recorded the change.`);
}

function putBundle(bundleName, version, sourcePath) {
  identifier(bundleName, "bundle name");
  identifier(version, "bundle version", versionPattern);
  if (!sourcePath) fail("Provide a private Markdown source file.");
  const absoluteSource = path.resolve(sourcePath);
  const relative = path.relative(repoRoot, absoluteSource);
  if (!relative.startsWith("..") && !path.isAbsolute(relative) &&
      !relative.startsWith(`.build${path.sep}`)) {
    fail("Instruction source inside this public repository must be in ignored .build/.");
  }
  const bytes = readFileSync(absoluteSource);
  if (bytes.length === 0 || bytes.length > 131072) fail("Bundle must be 1 to 131072 bytes.");
  const body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (body.includes("\0")) fail("Bundle cannot contain NUL bytes.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  execute(`INSERT INTO instruction_bundles (name, version, body, sha256)
    VALUES (${sqlString(bundleName)}, ${sqlString(version)}, ${sqlString(body)}, ${sqlString(sha256)});`);
  console.log(`Uploaded ${bundleName} version ${version}, SHA256 ${sha256}.`);
}

try {
  const [command, ...args] = process.argv.slice(local ? 3 : 2);
  if (command === "create-client" && args.length === 2) createClient(...args);
  else if (command === "set-paid" && args.length === 4) setPaid(...args);
  else if (command === "put-bundle" && args.length === 3) putBundle(...args);
  else fail("Usage: operator.mjs [--local] create-client <id> <bundle> | set-paid <id> <true|false> <actor> <reason> | put-bundle <name> <version> <private-file>");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
