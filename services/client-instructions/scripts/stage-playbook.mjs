#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceFiles = [
  ["source-of-truth", "docs/SOURCE-OF-TRUTH.md", "previously_public_reference"],
  ["reel-sop", "video/REEL-SOP.md", "previously_public_reference"],
  ["reel-enrichment", "docs/REEL-ENRICHMENT-SOP.md", "previously_public_reference"],
  ["reel-opening", "docs/REEL-OPENING-SOP.md", "previously_public_reference"],
  ["reel-captions", "docs/WHISPER-CAPTIONS-SOP.md", "previously_public_reference"],
  ["reel-audio", "docs/AUDIO-SOURCE-SOP.md", "previously_public_reference"],
  ["client-reel-reference", ".build/client-instructions/private/reel-core-v1.md", "private_client_neutral_reference"],
  ["reel-core", ".build/client-instructions/private/reel-policy-v1.json", "executable_private_policy"],
];
const vaultReadme = `# Owner playbook vault

This directory is private and excluded from Git. Do not include it in a client kit.

The manifest records exact source hashes and prior publication. Copies of previously public sources remain public in Git history. Personal generation continues to use the original repository files.

Markdown files are owner reference archives, not executable rules. The JSON policy is the current compiled subset used by the client service. Uploaded reference text is never read by the Worker or model. Source of Truth controls precedence over older archived SOP text.

Upload and verify each Markdown entry using owner CLI put-playbook / verify-playbook. Verify reel-core policy against its existing remote version with verify-policy. Record confirmations in a private transfer-report.json.
`;

function statOrMissing(file) {
  try { return lstatSync(file); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function safeFile(relative) {
  let current = repoRoot;
  const parts = relative.split(path.sep);
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const state = statOrMissing(current);
    if (!state) continue;
    if (state.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${relative}`);
    if (index < parts.length - 1 && !state.isDirectory()) throw new Error(`Expected directory in ${relative}.`);
    if (index === parts.length - 1 && !state.isFile()) throw new Error(`Expected regular file: ${relative}`);
  }
  return current;
}

function stage(version) {
  if (!version || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(version)) {
    throw new Error("Usage: stage-playbook.mjs <new-version>");
  }
  const relativeDestination = path.join(".private/client-playbooks", version);
  const manifestPath = safeFile(path.join(relativeDestination, "manifest.json"));
  execFileSync("git", ["check-ignore", "--quiet", "--", path.relative(repoRoot, manifestPath)], {
    cwd: repoRoot, stdio: "ignore",
  });

  // The initial migration copies only this allowlist, never the whole repository.
  const entries = sourceFiles.map(([name, source, classification]) => ({
    name, source, classification, bytes: readFileSync(safeFile(source)),
  }));
  const manifest = {
    version,
    createdAt: statOrMissing(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")).createdAt : new Date().toISOString(),
    personalOriginalsPreserved: true,
    entries: entries.map(entry => ({
      name: entry.name, source: entry.source,
      filename: `${entry.name}${path.extname(entry.source)}`,
      classification: entry.classification,
      sha256: createHash("sha256").update(entry.bytes).digest("hex"),
      bytes: entry.bytes.length,
      cloudflareTable: entry.classification === "executable_private_policy" ? "private_policies" : "owner_playbooks",
    })),
  };
  const payloads = entries.map((entry, index) => [manifest.entries[index].filename, entry.bytes]);
  payloads.push(["manifest.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)]);
  payloads.push(["README.md", Buffer.from(vaultReadme)]);
  const planned = payloads.map(([name, bytes]) => {
    const file = safeFile(path.join(relativeDestination, name));
    const exists = Boolean(statOrMissing(file));
    if (exists && !readFileSync(file).equals(bytes)) throw new Error("Existing version content differs. Choose a new version.");
    return { file, bytes, exists };
  });
  for (const relative of [".private", ".private/client-playbooks", relativeDestination]) {
    const directory = path.join(repoRoot, relative);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
  }
  for (const { file, bytes, exists } of planned) {
    if (!exists) writeFileSync(file, bytes, { flag: "wx", mode: 0o600 });
    chmodSync(file, 0o600);
  }
  console.log(`Staged ${entries.length} owner files at ${path.join(repoRoot, relativeDestination)}. Originals preserved; nothing uploaded yet.`);
}

try {
  if (process.argv.length !== 3) throw new Error("Usage: stage-playbook.mjs <new-version>");
  stage(process.argv[2]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
