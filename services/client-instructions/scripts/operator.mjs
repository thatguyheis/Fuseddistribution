#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrivatePolicySchema } from "../src/policy.js";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(serviceRoot, "../..");
const wrangler = path.join(repoRoot, "node_modules/.bin/wrangler");
const local = process.argv[2] === "--local";
const credentialsRoot = path.join(repoRoot, ".build/client-instructions/credentials");
const credentialsDir = local ? path.join(credentialsRoot, "local") : credentialsRoot;
const namePattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

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
    execFileSync(wrangler, [
      "d1", "execute", "fused-client-instructions", "--config", "wrangler.jsonc",
      local ? "--local" : "--remote", "--file", file, "--json",
    ], { cwd: serviceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    fail("Database write failed. The write may have committed; verify its state before retrying.");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function query(sql) {
  try {
    const output = execFileSync(wrangler, [
      "d1", "execute", "fused-client-instructions", "--config", "wrangler.jsonc",
      local ? "--local" : "--remote", "--command", sql, "--json",
    ], { cwd: serviceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const result = JSON.parse(output);
    return result.flatMap((entry) => entry.results || []);
  } catch {
    fail("Database read failed.");
  }
}

function createClient(clientId, bundleName) {
  identifier(clientId, "client ID");
  identifier(bundleName, "bundle name");
  const policies = query(`SELECT id FROM private_policies WHERE name = ${sqlString(bundleName)} ORDER BY id DESC LIMIT 1;`);
  if (policies.length !== 1) fail(`Private policy ${bundleName} does not exist. Upload it before creating a client.`);
  const credentialPath = path.join(credentialsDir, `${clientId}.token`);
  if (existsSync(credentialPath)) fail(`Credential file already exists for ${clientId}.`);
  mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
  chmodSync(credentialsDir, 0o700);
  const recoveryPath = path.join(credentialsDir,
    `${clientId}.creation-${Date.now()}-${randomBytes(6).toString("hex")}.token`);
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  writeFileSync(recoveryPath, `${token}\n`, { flag: "wx", mode: 0o600 });
  try {
    execute(`INSERT INTO clients (id, token_hash, bundle_name, status_actor, status_reason)
      VALUES (${sqlString(clientId)}, ${sqlString(hash)}, ${sqlString(bundleName)}, 'operator', 'New client; unpaid by default');`);
    const result = query(`SELECT token_hash FROM clients WHERE id = ${sqlString(clientId)};`);
    if (result.length !== 1 || result[0].token_hash !== hash) fail("Client creation could not be verified.");
    // An exclusive link publishes the credential without rename's overwrite race.
    linkSync(recoveryPath, credentialPath);
    unlinkSync(recoveryPath);
  } catch {
    fail(`Client creation was not completed. Recovery credential retained at ${recoveryPath}. Verify the database state before retrying or using the credential.`);
  }
  console.log(`Created unpaid client ${clientId}. Credential saved to ${credentialPath}`);
}

function clientStatus(clientId) {
  identifier(clientId, "client ID");
  const result = query(`SELECT id, paid, access_until, bundle_name,
    EXISTS (SELECT 1 FROM private_policies WHERE name = clients.bundle_name) AS policy_available
    FROM clients WHERE id = ${sqlString(clientId)};`);
  if (result.length !== 1) fail(`Client ${clientId} was not found.`);
  const client = result[0];
  console.log(JSON.stringify({
    id: client.id,
    paid: client.paid === 1,
    access_until: client.access_until,
    bundle_name: client.bundle_name,
    policy_available: client.policy_available === 1,
  }, null, 2));
}

function setPaid(clientId, paidText, actor, reason) {
  identifier(clientId, "client ID");
  identifier(actor, "actor");
  if (paidText !== "true" && paidText !== "false") fail("Paid must be true or false.");
  if (!reason || reason.length > 240 || /[\r\n\0]/.test(reason)) fail("Reason must be one line, 1 to 240 characters.");
  const paid = paidText === "true" ? 1 : 0;
  execute(`UPDATE clients SET paid = ${paid}, status_actor = ${sqlString(actor)},
    status_reason = ${sqlString(reason)}, status_changed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ${sqlString(clientId)};`);
  const result = query(`SELECT id, paid FROM clients WHERE id = ${sqlString(clientId)};`);
  if (result.length !== 1) fail(`Client ${clientId} was not found.`);
  if (result[0].paid !== paid) fail(`Client ${clientId} did not reach the requested state.`);
  console.log(`Client ${clientId}: paid=${paidText}. Paid transitions are audited.`);
}

function rotateToken(clientId) {
  identifier(clientId, "client ID");
  mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
  chmodSync(credentialsDir, 0o700);
  const recoveryPath = path.join(credentialsDir,
    `${clientId}.rotation-${Date.now()}-${randomBytes(6).toString("hex")}.token`);
  const credentialPath = path.join(credentialsDir, `${clientId}.token`);
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  writeFileSync(recoveryPath, `${token}\n`, { flag: "wx", mode: 0o600 });
  try {
    execute(`UPDATE clients SET token_hash = ${sqlString(hash)} WHERE id = ${sqlString(clientId)};`);
    const result = query(`SELECT token_hash FROM clients WHERE id = ${sqlString(clientId)};`);
    if (result.length !== 1 || result[0].token_hash !== hash) fail("Token rotation could not be verified.");
    renameSync(recoveryPath, credentialPath);
  } catch {
    fail(`Token rotation was not completed. Recovery credential retained at ${recoveryPath}. Verify the database state before retrying or using either credential.`);
  }
  console.log(`Rotated token for ${clientId}; the previous token is revoked. New credential saved to ${credentialPath}`);
}

function privateSourcePath(sourcePath) {
  if (!sourcePath) fail("Provide a private source file.");
  let absoluteSource;
  try {
    absoluteSource = realpathSync(path.resolve(sourcePath));
  } catch {
    fail("Private source file does not exist or cannot be resolved.");
  }
  const relative = path.relative(realpathSync(repoRoot), absoluteSource);
  const insideRepo = relative === "" || (!relative.startsWith(`..${path.sep}`) &&
    relative !== ".." && !path.isAbsolute(relative));
  if (insideRepo) {
    const approvedRoot = relative.startsWith(`.build${path.sep}`) ||
      relative.startsWith(`.private${path.sep}client-playbooks${path.sep}`);
    if (!approvedRoot) {
      fail("Private source inside this public repository must be in ignored .build/ or .private/client-playbooks/.");
    }
    try {
      execFileSync("git", ["check-ignore", "--quiet", "--", relative], {
        cwd: repoRoot, stdio: "ignore",
      });
    } catch {
      fail("Private source must be ignored by Git and must not be tracked.");
    }
  }
  return absoluteSource;
}

function readPlaybook(sourcePath) {
  const absoluteSource = privateSourcePath(sourcePath);
  const sourceStat = statSync(absoluteSource);
  if (!sourceStat.isFile() || sourceStat.size === 0 || sourceStat.size > 131072) {
    fail("Playbook must be a regular file containing 1 to 131072 bytes.");
  }
  const bytes = readFileSync(absoluteSource);
  if (bytes.length === 0 || bytes.length > 131072) fail("Playbook must be 1 to 131072 bytes.");
  let body;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("Playbook must be valid UTF-8 Markdown.");
  }
  if (!body.trim() || body.includes("\0")) fail("Playbook must contain nonempty Markdown without NUL bytes.");
  return { body, sha256: createHash("sha256").update(bytes).digest("hex") };
}

function putPlaybook(playbookName, version, sourcePath) {
  identifier(playbookName, "playbook name");
  identifier(version, "playbook version", versionPattern);
  const { body, sha256 } = readPlaybook(sourcePath);
  execute(`INSERT INTO owner_playbooks (name, version, body, sha256, content_type)
    VALUES (${sqlString(playbookName)}, ${sqlString(version)}, ${sqlString(body)},
      ${sqlString(sha256)}, 'text/markdown; charset=utf-8');`);
  console.log(`Archived owner playbook ${playbookName} version ${version}. No client access is provided.`);
}

function verifyPlaybook(playbookName, version, sourcePath) {
  identifier(playbookName, "playbook name");
  identifier(version, "playbook version", versionPattern);
  const { sha256 } = readPlaybook(sourcePath);
  const result = query(`SELECT body, sha256 FROM owner_playbooks
    WHERE name = ${sqlString(playbookName)} AND version = ${sqlString(version)};`);
  if (result.length !== 1) fail("Owner playbook version was not found.");
  const archived = result[0];
  const actualDigest = typeof archived.body === "string" ?
    createHash("sha256").update(archived.body, "utf8").digest("hex") : null;
  if (archived.sha256 !== sha256 || actualDigest !== sha256) fail("Owner playbook verification failed.");
  console.log(`Verified owner playbook ${playbookName} version ${version} against its private source.`);
}

function readPolicy(sourcePath) {
  const absoluteSource = privateSourcePath(sourcePath);
  const sourceStat = statSync(absoluteSource);
  if (!sourceStat.isFile() || sourceStat.size === 0 || sourceStat.size > 131072) {
    fail("Policy must be a regular file containing 1 to 131072 bytes.");
  }
  const bytes = readFileSync(absoluteSource);
  if (bytes.length === 0 || bytes.length > 131072) fail("Policy must be 1 to 131072 bytes.");
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("Policy must be valid UTF-8 JSON.");
  }
  const checked = PrivatePolicySchema.safeParse(parsed);
  if (!checked.success) fail("Private policy does not match the required schema.");
  const body = JSON.stringify(Object.fromEntries(Object.entries(checked.data).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0)));
  const sha256 = createHash("sha256").update(body, "utf8").digest("hex");
  return { body, sha256 };
}

function putPolicy(policyName, version, sourcePath) {
  identifier(policyName, "policy name");
  identifier(version, "policy version", versionPattern);
  const { body, sha256 } = readPolicy(sourcePath);
  execute(`INSERT INTO private_policies (name, version, body, sha256)
    VALUES (${sqlString(policyName)}, ${sqlString(version)}, ${sqlString(body)}, ${sqlString(sha256)});`);
  console.log(`Uploaded private policy ${policyName} version ${version}.`);
}

function verifyPolicy(policyName, version, sourcePath) {
  identifier(policyName, "policy name");
  identifier(version, "policy version", versionPattern);
  const { sha256 } = readPolicy(sourcePath);
  const result = query(`SELECT body, sha256 FROM private_policies
    WHERE name = ${sqlString(policyName)} AND version = ${sqlString(version)};`);
  if (result.length !== 1) fail("Private policy version was not found.");
  const stored = result[0];
  const actualDigest = typeof stored.body === "string" ?
    createHash("sha256").update(stored.body, "utf8").digest("hex") : null;
  if (stored.sha256 !== sha256 || actualDigest !== sha256) fail("Private policy verification failed.");
  console.log(`Verified private policy ${policyName} version ${version} against its private source.`);
}

try {
  const [command, ...args] = process.argv.slice(local ? 3 : 2);
  if (command === "create-client" && args.length === 2) createClient(...args);
  else if (command === "client-status" && args.length === 1) clientStatus(...args);
  else if (command === "set-paid" && args.length === 4) setPaid(...args);
  else if (command === "rotate-token" && args.length === 1) rotateToken(...args);
  else if (command === "put-policy" && args.length === 3) putPolicy(...args);
  else if (command === "verify-policy" && args.length === 3) verifyPolicy(...args);
  else if (command === "put-playbook" && args.length === 3) putPlaybook(...args);
  else if (command === "verify-playbook" && args.length === 3) verifyPlaybook(...args);
  else if (command === "put-bundle") {
    fail("Raw instruction uploads are retired. No data was written. Use put-policy for private server-side policy JSON.");
  } else fail("Usage: operator.mjs [--local] create-client <id> <policy> | client-status <id> | set-paid <id> <true|false> <actor> <reason> | rotate-token <id> | put-policy <name> <version> <private-json-file> | verify-policy <name> <version> <private-json-file> | put-playbook <name> <version> <private-markdown-file> | verify-playbook <name> <version> <private-markdown-file>");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
