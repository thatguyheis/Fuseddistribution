import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = "/Users/nick/Documents/New project";
const scriptPath = path.join(repoRoot, "book-factory/scripts/book-factory.mjs");

async function makeFixture() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "book-factory-"));
  await cp(path.join(repoRoot, "book-factory"), path.join(tempRoot, "book-factory"), {
    recursive: true
  });
  return tempRoot;
}

async function run(root, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: root,
      env: {
        ...process.env,
        BOOK_FACTORY_ROOT: path.join(root, "book-factory")
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("close", code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `Process failed with code ${code}`));
    });
  });
}

test("discover ranks titles and writes candidate briefs", async () => {
  const root = await makeFixture();
  await run(root, ["discover"]);

  const richestRecord = JSON.parse(
    await readFile(path.join(root, "book-factory/books/richest-man-in-babylon.json"), "utf8")
  );
  const candidateBrief = await readFile(
    path.join(root, "book-factory/titles/richest-man-in-babylon/candidate_brief.md"),
    "utf8"
  );

  assert.equal(richestRecord.scoring.rank, 1);
  assert.match(candidateBrief, /Weighted score/);
  assert.match(candidateBrief, /Rights Checkpoint/);
});

test("rights gate blocks unresolved titles", async () => {
  const root = await makeFixture();

  await assert.rejects(
    () => run(root, ["verify-rights", "think-and-grow-rich"]),
    /blocked by the rights gate/
  );
});

test("blueprint generation requires rights clearance and writes lesson map", async () => {
  const root = await makeFixture();
  await run(root, ["verify-rights", "richest-man-in-babylon"]);
  await run(root, ["blueprint", "richest-man-in-babylon"]);

  const blueprint = await readFile(
    path.join(root, "book-factory/titles/richest-man-in-babylon/adaptation_blueprint.md"),
    "utf8"
  );
  const record = JSON.parse(
    await readFile(path.join(root, "book-factory/books/richest-man-in-babylon.json"), "utf8")
  );

  assert.equal(record.review.pending, "blueprint");
  assert.match(blueprint, /## Core Lesson Map/);
  assert.match(blueprint, /## Chapter Transformation Plan/);
});

test("draft generation creates manuscript assets after blueprint approval", async () => {
  const root = await makeFixture();
  await run(root, ["verify-rights", "richest-man-in-babylon"]);
  await run(root, ["blueprint", "richest-man-in-babylon"]);
  await run(root, ["approve", "richest-man-in-babylon", "blueprint"]);
  await run(root, ["draft", "richest-man-in-babylon"]);

  const manuscriptDir = path.join(root, "book-factory/titles/richest-man-in-babylon/chapter_manuscripts");
  const backCover = await readFile(path.join(manuscriptDir, "01_back_cover.md"), "utf8");
  const chapter = await readFile(
    path.join(manuscriptDir, "chapter_04_the-richest-man-in-the-valley.md"),
    "utf8"
  );
  const record = JSON.parse(
    await readFile(path.join(root, "book-factory/books/richest-man-in-babylon.json"), "utf8")
  );

  assert.equal(record.review.pending, "draft");
  assert.match(backCover, /Back Cover/);
  assert.match(chapter, /The governing lesson here is simple/);
});

test("packaging requires draft approval and writes KDP assets", async () => {
  const root = await makeFixture();
  await run(root, ["verify-rights", "richest-man-in-babylon"]);
  await run(root, ["blueprint", "richest-man-in-babylon"]);
  await run(root, ["approve", "richest-man-in-babylon", "blueprint"]);
  await run(root, ["draft", "richest-man-in-babylon"]);
  await run(root, ["approve", "richest-man-in-babylon", "draft"]);
  await run(root, ["package", "richest-man-in-babylon"]);

  const metadata = await readFile(
    path.join(root, "book-factory/titles/richest-man-in-babylon/publishing_package/metadata.md"),
    "utf8"
  );
  const record = JSON.parse(
    await readFile(path.join(root, "book-factory/books/richest-man-in-babylon.json"), "utf8")
  );

  assert.equal(record.status, "ready-for-kdp");
  assert.match(metadata, /ready-for-kdp/);
});
