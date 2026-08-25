import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.env.BOOK_FACTORY_ROOT
  ? path.resolve(process.env.BOOK_FACTORY_ROOT)
  : path.join(process.cwd(), "book-factory");

const slug = process.argv[2];

if (!slug) {
  console.error("Usage: node book-factory/scripts/assemble-print-master.mjs <slug>");
  process.exit(1);
}

const recordPath = path.join(ROOT, "books", `${slug}.json`);
const record = JSON.parse(await readFile(recordPath, "utf8"));
const titleRoot = path.join(ROOT, "titles", slug);
const manuscriptPath = path.join(titleRoot, "manuscript.md");
const printPackageDir = path.join(titleRoot, "print_package");
const printMasterPath = path.join(printPackageDir, "print_master.md");
const assemblyNotesPath = path.join(printPackageDir, "assembly_notes.md");

const manuscript = await readFile(manuscriptPath, "utf8");
const body = stripWorkingTitle(manuscript);
const contents = buildContents(body);
const printMaster = [
  buildTitlePage(record),
  buildCopyrightPage(record),
  contents,
  body.trim(),
  buildBackMatter(record)
].join("\n\n---\n\n");

await mkdir(printPackageDir, { recursive: true });
await writeFile(printMasterPath, `${printMaster.trim()}\n`, "utf8");
await writeFile(assemblyNotesPath, `${buildAssemblyNotes(record)}\n`, "utf8");

console.log(`Print master written to ${path.relative(process.cwd(), printMasterPath)}`);
console.log(`Assembly notes written to ${path.relative(process.cwd(), assemblyNotesPath)}`);

function stripWorkingTitle(markdown) {
  const lines = markdown.split("\n");

  if (!lines[0]?.startsWith("# ")) {
    return markdown;
  }

  let startIndex = 1;
  while (startIndex < lines.length && lines[startIndex].trim() !== "## Foreword") {
    startIndex += 1;
  }

  return lines.slice(startIndex).join("\n").trim();
}

function buildTitlePage(bookRecord) {
  const title = bookRecord.adaptation.workingTitle;
  const subtitle = bookRecord.adaptation.subtitleOptions[0];
  const sourceTitle = bookRecord.source.title;
  const sourceAuthor = bookRecord.source.author;

  return [
    `# ${title}`,
    "",
    `## ${subtitle}`,
    "",
    "A modern business parable for founders, creators, operators, and practical builders.",
    "",
    `Based on the public-domain classic *${sourceTitle}* by ${sourceAuthor}.`
  ].join("\n");
}

function buildCopyrightPage(bookRecord) {
  const title = bookRecord.adaptation.workingTitle;
  const sourceTitle = bookRecord.source.title;
  const sourceAuthor = bookRecord.source.author;
  const rightsNote = bookRecord.rights.us.evidence;

  return [
    "# Copyright and Adaptation Notice",
    "",
    `${title} is a modern adaptation of *${sourceTitle}* by ${sourceAuthor}.`,
    "",
    "This edition preserves the underlying public-domain lesson while translating the setting, scenes, voice, and examples for a contemporary audience. The original author did not write, endorse, or collaborate on this adaptation.",
    "",
    "All named characters, businesses, and scenes in this adaptation are fictionalized devices created for the modern narrative. They are not depictions of real individuals or real companies.",
    "",
    `Rights note: ${rightsNote}`
  ].join("\n");
}

function buildContents(body) {
  const headings = body
    .split("\n")
    .filter(line => line === "## Foreword" || line.startsWith("## About ") || line.startsWith("# Chapter ") || line.startsWith("# Afterword"))
    .map(line => line.replace(/^#{1,2}\s+/, "").trim());

  return ["# Contents", "", ...headings.map(heading => `- ${heading}`)].join("\n");
}

function buildBackMatter(bookRecord) {
  const title = bookRecord.adaptation.workingTitle;
  const sourceTitle = bookRecord.source.title;
  const lessons = bookRecord.adaptation.coreLessons || [];

  return [
    "# Back Matter",
    "",
    "## How to Use This Book",
    "",
    "Read the story once for the arc. Then return to the lessons and apply them to your own work, money, habits, and decisions. This book was built for modern builders: people who need practical ideas they can test in real life, not slogans they only admire from a distance.",
    "",
    "## Core Lessons",
    "",
    ...lessons.map(lesson => `- ${lesson}`),
    "",
    "## Discussion Questions",
    "",
    ...lessons.map(lesson => `- Where in your life or work do you need to apply this rule: ${lowercaseFirst(lesson)}`),
    "",
    "## Source Note",
    "",
    `${title} is a modern adaptation of *${sourceTitle}*. It preserves the source work's core lesson architecture while changing the scenes, voice, examples, and character world for contemporary readers.`
  ].join("\n");
}

function buildAssemblyNotes(bookRecord) {
  return [
    "# Print Assembly Notes",
    "",
    `- Title: ${bookRecord.adaptation.workingTitle}`,
    `- Subtitle: ${bookRecord.adaptation.subtitleOptions[0]}`,
    `- Source: ${bookRecord.source.title} by ${bookRecord.source.author}`,
    `- Status: ${bookRecord.status}`,
    "- Interior format: Markdown master for print/PDF conversion",
    "- Recommended next pass: export to DOCX/PDF, inspect page breaks, then create KDP trim-specific layout",
    "",
    "## Included Sections",
    "",
    "- Title page",
    "- Copyright and adaptation notice",
    "- Contents",
    "- Manuscript body with chapter sections",
    "- Back matter with reader application and discussion questions"
  ].join("\n");
}

function lowercaseFirst(value) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
