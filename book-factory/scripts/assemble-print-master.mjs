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
    .filter(line => line.startsWith("## "))
    .map(line => line.replace(/^##\s+/, "").trim());

  return ["# Contents", "", ...headings.map(heading => `- ${heading}`)].join("\n");
}

function buildBackMatter(bookRecord) {
  const title = bookRecord.adaptation.workingTitle;
  const sourceTitle = bookRecord.source.title;

  return [
    "# Back Matter",
    "",
    "## How to Use This Book",
    "",
    "Read the story once for the arc. Then return to Chapter 7 and write your own map: repeated pain, proximity, trust, and willingness. The value of the book is not in agreeing with the lesson. It is in using the lesson to inspect the ground you already stand on.",
    "",
    "## Discussion Questions",
    "",
    "- What familiar market or customer group have you been dismissing because it feels ordinary?",
    "- Where do people near you repeatedly complain about delay, confusion, poor service, or lack of trust?",
    "- What problem do you understand faster than an outsider because you have lived near it for years?",
    "- Which opportunity would you respect more if it had a more impressive name?",
    "- What practical offer could you test within thirty days without reinventing your life?",
    "",
    "## Source Note",
    "",
    `${title} is inspired by the enduring lesson of *${sourceTitle}*: people often search far away for opportunity while overlooking value already close at hand. This adaptation relocates that lesson into modern business life while keeping the core idea intact.`
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
    "- Foreword",
    "- Author note",
    "- Chapters 1-7",
    "- Back matter with reader application and discussion questions"
  ].join("\n");
}
