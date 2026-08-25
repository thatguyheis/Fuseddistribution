import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const STATUSES = [
  "researched",
  "rights-cleared",
  "blueprint-ready",
  "drafting",
  "editor-review",
  "approved-for-packaging",
  "ready-for-kdp"
];

const SCORE_WEIGHTS = {
  timelessness: 0.24,
  modernRelevance: 0.2,
  searchDemand: 0.14,
  businessUsefulness: 0.2,
  adaptationPotential: 0.12,
  rightsViability: 0.1
};

const ROOT = resolveRoot();
const BOOKS_DIR = path.join(ROOT, "books");
const TITLES_DIR = path.join(ROOT, "titles");

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case "discover":
        await discover(parseOptions(args));
        break;
      case "verify-rights":
        await verifyRights(args[0]);
        break;
      case "blueprint":
        await buildBlueprint(args[0]);
        break;
      case "back-cover-sample":
        await buildBackCoverSample(args[0]);
        break;
      case "approve":
        await approve(args[0], args[1]);
        break;
      case "draft":
        await draft(args[0]);
        break;
      case "package":
        await buildPackage(args[0]);
        break;
      case "status":
        await printStatus();
        break;
      case "owner-loop":
        await ownerLoop();
        break;
      case "reset-output":
        await resetOutput();
        break;
      default:
        printHelp();
        process.exitCode = command ? 1 : 0;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

function resolveRoot() {
  if (process.env.BOOK_FACTORY_ROOT) {
    return path.resolve(process.env.BOOK_FACTORY_ROOT);
  }

  return path.join(process.cwd(), "book-factory");
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--limit") {
      options.limit = Number(args[index + 1]);
      index += 1;
    }
  }

  return options;
}

async function listBookFiles() {
  const files = await readdir(BOOKS_DIR);
  return files.filter(file => file.endsWith(".json")).sort();
}

async function loadRecord(slug) {
  if (!slug) {
    throw new Error("A book slug is required.");
  }

  const filePath = path.join(BOOKS_DIR, `${slug}.json`);
  return readJson(filePath);
}

async function loadAllRecords() {
  const files = await listBookFiles();
  const records = await Promise.all(files.map(file => readJson(path.join(BOOKS_DIR, file))));
  return records;
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function saveRecord(record) {
  const filePath = path.join(BOOKS_DIR, `${record.slug}.json`);
  await writeJson(filePath, record);
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

function scoreRecord(record) {
  let total = 0;
  for (const [field, weight] of Object.entries(SCORE_WEIGHTS)) {
    total += (record.scoring[field] || 0) * weight;
  }

  return Number(total.toFixed(2));
}

function rankRecords(records) {
  const ranked = records.map(record => ({
    ...record,
    scoring: {
      ...record.scoring,
      totalScore: scoreRecord(record)
    }
  }));

  ranked.sort((left, right) => right.scoring.totalScore - left.scoring.totalScore || left.source.title.localeCompare(right.source.title));

  return ranked.map((record, index) => ({
    ...record,
    scoring: {
      ...record.scoring,
      rank: index + 1
    }
  }));
}

function artifactPath(record, key) {
  return path.join(process.cwd(), record.artifacts[key]);
}

function relativeArtifactPath(record, key) {
  return record.artifacts[key];
}

function assertRightsCleared(record) {
  if (!record.rights?.us?.confirmedPublicDomain || !record.rights?.sourceAvailability?.verified) {
    throw new Error(
      `${record.source.title} is blocked by the rights gate. Confirm U.S. public-domain status and source availability before drafting.`
    );
  }

  assertRightsEvidenceComplete(record);
}

function assertRightsEvidenceComplete(record) {
  if (record.source.year < 1930) {
    return;
  }

  const hasSourceCitations =
    Array.isArray(record.rights.us.evidenceSources) && record.rights.us.evidenceSources.length > 0;
  const hasVerificationRecord = Boolean(record.rights.us.verificationDate && record.rights.us.evidence);

  if (!hasVerificationRecord || !hasSourceCitations) {
    throw new Error(
      `${record.source.title} is on the 1930+ rights hold. Add verification date, evidence, and source citations before advancement.`
    );
  }
}

function assertReviewPending(record, gate) {
  if (record.review.pending !== gate) {
    throw new Error(`${record.source.title} is not waiting for ${gate} approval.`);
  }
}

async function discover(options) {
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : Number.MAX_SAFE_INTEGER;
  const rankedRecords = rankRecords(await loadAllRecords());

  await Promise.all(
    rankedRecords.map(async record => {
      const nextRecord = {
        ...record,
        status: advanceStatus(record.status, "researched")
      };
      await writeText(artifactPath(nextRecord, "candidateBrief"), buildCandidateBrief(nextRecord));
      await saveRecord(nextRecord);
    })
  );

  const top = rankedRecords.slice(0, limit);
  console.log(`Ranked ${rankedRecords.length} books. Top ${top.length}:`);
  for (const record of top) {
    console.log(`${record.scoring.rank}. ${record.source.title} (${record.scoring.totalScore})`);
  }
}

async function verifyRights(slug) {
  const record = await loadRecord(slug);
  assertRightsCleared(record);

  const nextRecord = {
    ...record,
    status: advanceStatus(record.status, "rights-cleared")
  };

  await saveRecord(nextRecord);
  console.log(`${record.source.title} is rights-cleared.`);
}

async function buildBlueprint(slug) {
  const record = await loadRecord(slug);
  assertRightsCleared(record);

  const nextRecord = {
    ...record,
    status: "editor-review",
    review: {
      ...record.review,
      pending: "blueprint"
    }
  };

  await writeText(artifactPath(nextRecord, "adaptationBlueprint"), buildBlueprintMarkdown(nextRecord));
  await saveRecord(nextRecord);
  console.log(`Blueprint generated for ${record.source.title}. Waiting for editorial approval.`);
}

async function approve(slug, gate) {
  if (!slug || !gate) {
    throw new Error("Usage: approve <slug> <blueprint|back-cover-sample|draft>");
  }

  const record = await loadRecord(slug);
  assertReviewPending(record, gate);
  const now = new Date().toISOString();
  const nextReview = {
    ...record.review,
    pending: null
  };

  if (gate === "blueprint") {
    nextReview.blueprintApprovedAt = now;
  } else if (gate === "back-cover-sample") {
    nextReview.backCoverSampleApprovedAt = now;
  } else if (gate === "draft") {
    nextReview.draftApprovedAt = now;
  } else {
    throw new Error(`Unsupported approval gate: ${gate}`);
  }

  const nextRecord = {
    ...record,
    status:
      gate === "blueprint"
        ? "blueprint-ready"
        : gate === "back-cover-sample"
          ? "drafting"
          : "approved-for-packaging",
    review: nextReview
  };

  await saveRecord(nextRecord);
  console.log(`${record.source.title} approved for ${gate}.`);
}

async function buildBackCoverSample(slug) {
  const record = await loadRecord(slug);
  assertRightsCleared(record);

  if (record.status === "editor-review" && record.review.pending !== "back-cover-sample") {
    throw new Error(
      `${record.source.title} is already waiting for ${record.review.pending} approval. Resolve that gate before refreshing the back-cover sample.`
    );
  }

  const allowedStatuses = new Set(["blueprint-ready", "editor-review", "drafting", "approved-for-packaging", "ready-for-kdp"]);
  if (!allowedStatuses.has(record.status)) {
    throw new Error(`${record.source.title} must have an approved blueprint before back-cover sample generation.`);
  }

  const titleDir = artifactPath(record, "chapterManuscripts");
  await mkdir(titleDir, { recursive: true });
  await writeText(path.join(titleDir, "01_back_cover.md"), buildBackCover(record));

  if (record.status === "blueprint-ready" || record.review.pending === "back-cover-sample") {
    const nextRecord = {
      ...record,
      status: "editor-review",
      review: {
        ...record.review,
        pending: "back-cover-sample"
      }
    };
    await saveRecord(nextRecord);
    console.log(`Back-cover sample generated for ${record.source.title}. Waiting for editorial approval.`);
    return;
  }

  console.log(`Back-cover sample refreshed for ${record.source.title}.`);
}

async function draft(slug) {
  const record = await loadRecord(slug);
  assertRightsCleared(record);

  if (record.status !== "drafting") {
    throw new Error(`${record.source.title} must have an approved back-cover sample before manuscript generation.`);
  }

  const titleDir = artifactPath(record, "chapterManuscripts");
  await mkdir(titleDir, { recursive: true });

  await writeText(path.join(titleDir, "00_title_concepts.md"), buildTitleConcepts(record));
  await writeText(path.join(titleDir, "01_back_cover.md"), buildBackCover(record));
  await writeText(path.join(titleDir, "02_front_matter_author_note.md"), buildAuthorNote(record));

  const chapterPlan = normalizedChapterPlan(record);
  await Promise.all(
    chapterPlan.map(chapter =>
      writeText(
        path.join(titleDir, `chapter_${String(chapter.number).padStart(2, "0")}_${slugify(chapter.title)}.md`),
        buildChapterDraft(record, chapter)
      )
    )
  );

  const nextRecord = {
    ...record,
    status: "editor-review",
    review: {
      ...record.review,
      pending: "draft"
    }
  };

  await saveRecord(nextRecord);
  console.log(`Draft package generated for ${record.source.title}. Waiting for editorial approval.`);
}

async function buildPackage(slug) {
  const record = await loadRecord(slug);
  assertRightsCleared(record);

  if (record.status !== "approved-for-packaging") {
    throw new Error(`${record.source.title} must be approved-for-packaging before KDP assembly.`);
  }

  const nextRecord = {
    ...record,
    status: "ready-for-kdp"
  };
  const outputDir = artifactPath(record, "publishingPackage");
  await mkdir(outputDir, { recursive: true });
  await writeText(path.join(outputDir, "kdp_description.md"), buildKdpDescription(nextRecord));
  await writeText(path.join(outputDir, "keywords.md"), buildKeywords(nextRecord));
  await writeText(path.join(outputDir, "cover_brief.md"), buildCoverBrief(nextRecord));
  await writeText(path.join(outputDir, "metadata.md"), buildMetadata(nextRecord));

  await saveRecord(nextRecord);
  console.log(`Publishing package generated for ${record.source.title}.`);
}

async function printStatus() {
  const records = rankRecords(await loadAllRecords());

  for (const record of records) {
    console.log(
      [
        record.slug,
        record.status,
        `rank=${record.scoring.rank}`,
        `score=${record.scoring.totalScore}`,
        `rights=${record.rights.us.status}`,
        `pending=${record.review.pending || "none"}`
      ].join(" | ")
    );
  }
}

async function ownerLoop() {
  const records = rankRecords(await loadAllRecords());
  const rightsHold = records.filter(record => record.source.year >= 1930 && !record.rights?.us?.confirmedPublicDomain);

  for (const record of rightsHold) {
    console.log(
      `Rights hold: ${record.source.title} (${record.source.year}) remains research-only until 1930+ evidence is verified.`
    );
  }

  for (const record of records) {
    if (record.status === "rights-cleared") {
      await buildBlueprint(record.slug);
      return;
    }

    if (record.status === "blueprint-ready") {
      await buildBackCoverSample(record.slug);
      return;
    }

    if (record.status === "drafting") {
      await draft(record.slug);
      return;
    }

    if (record.status === "editor-review") {
      console.log(`${record.source.title} is waiting for ${record.review.pending || "editorial"} approval.`);
      return;
    }

    if (record.status === "approved-for-packaging") {
      console.log(
        `${record.source.title} is approved for packaging. Confirm source fidelity, AI compliance, differentiation, and brand risk before package assembly.`
      );
      return;
    }
  }

  console.log("No safe Book Factory advancement is available. Review rights holds, approvals, or packaging compliance gates.");
}

async function resetOutput() {
  await rm(TITLES_DIR, { force: true, recursive: true });

  const records = await loadAllRecords();
  for (const record of records) {
    const nextRecord = {
      ...record,
      status: "researched",
      review: {
        pending: null,
        blueprintApprovedAt: null,
        draftApprovedAt: null
      }
    };
    delete nextRecord.scoring.totalScore;
    delete nextRecord.scoring.rank;
    await saveRecord(nextRecord);
  }

  console.log("Book Factory output reset.");
}

function advanceStatus(current, minimum) {
  const currentIndex = STATUSES.indexOf(current);
  const targetIndex = STATUSES.indexOf(minimum);
  return currentIndex > targetIndex ? current : minimum;
}

function buildCandidateBrief(record) {
  const scoreLines = Object.entries(SCORE_WEIGHTS).map(([field]) => {
    return `- ${formatLabel(field)}: ${record.scoring[field]}/10`;
  });

  const nextStep = record.rights.us.confirmedPublicDomain
    ? "Run rights verification, then generate the adaptation blueprint."
    : "Keep this in research only until U.S. public-domain status is documented.";

  return [
    `# Candidate Brief: ${record.source.title}`,
    "",
    `- Source author: ${record.source.author}`,
    `- First published: ${record.source.year}`,
    `- Target audience: ${record.target.audience}`,
    `- Publishing target: ${record.target.publishingTarget}`,
    `- Rank: ${record.scoring.rank}`,
    `- Weighted score: ${record.scoring.totalScore}`,
    "",
    "## Why It Matters",
    "",
    record.source.summary,
    "",
    `This title is positioned for ${record.target.positioning}. The strongest adaptation angle is ${record.adaptation.workingTitle}, which reframes the original promise inside ${record.adaptation.modernWorld}.`,
    "",
    "## Score Breakdown",
    "",
    ...scoreLines,
    "",
    "## Rights Checkpoint",
    "",
    `- U.S. rights status: ${record.rights.us.status}`,
    `- Evidence note: ${record.rights.us.evidence}`,
    `- Source availability: ${record.rights.sourceAvailability.verified ? "verified" : "not verified"}`,
    "",
    "## Recommendation",
    "",
    nextStep,
    ""
  ].join("\n");
}

function buildBlueprintMarkdown(record) {
  const lessonLines = record.adaptation.coreLessons.map((lesson, index) => `${index + 1}. ${lesson}`);
  const toneLines = record.adaptation.toneRules.map(rule => `- ${rule}`);
  const prohibitedLines = record.adaptation.prohibitedChanges.map(rule => `- ${rule}`);
  const chapterLines = normalizedChapterPlan(record).map(chapter => {
    return `| ${chapter.number} | ${chapter.title} | ${chapter.focus} | ${chapter.modernFrame} |`;
  });

  return [
    `# Adaptation Blueprint: ${record.adaptation.workingTitle}`,
    "",
    `- Source work: ${record.source.title} by ${record.source.author} (${record.source.year})`,
    `- Audience: ${record.target.audience}`,
    `- Publishing target: ${record.target.publishingTarget}`,
    `- Positioning: ${record.target.positioning}`,
    "",
    "## Core Promise",
    "",
    `${record.source.corePromise} This adaptation keeps that lesson architecture but relocates it into ${record.adaptation.modernWorld}.`,
    "",
    "## Audience Lens",
    "",
    "Write for ambitious but financially uneven builders: founders, freelancers, creators, operators, salespeople, and technical professionals who earn but have not yet translated income into durable assets.",
    "",
    "## Modern World",
    "",
    record.adaptation.modernWorld,
    "",
    "## Tone Rules",
    "",
    ...toneLines,
    "",
    "## Source-Aligned Cast Map",
    "",
    "Before drafting, create or confirm a cast map that lists each important source character, the adapted character name, and the naming rationale.",
    "",
    "- Keep adapted names visibly connected to the source name's sound, rhythm, or recognizable root wherever practical.",
    "- Use parody through fictional composite behavior, modern roles, status signals, and setting details rather than direct public-figure references.",
    "- Avoid real public-figure names, near-identical names, active brand names, founder names, celebrity names, and trademarked company names.",
    "- Make source-name lineage more prominent than any modern celebrity or founder echo.",
    "",
    "## Core Lesson Map",
    "",
    ...lessonLines,
    "",
    "## Chapter Transformation Plan",
    "",
    "| # | Chapter | Purpose | Modern frame |",
    "| --- | --- | --- | --- |",
    ...chapterLines,
    "",
    "## Prohibited Changes",
    "",
    ...prohibitedLines,
    "",
    "## Editorial Risks",
    "",
    "- Drifting into generic motivation instead of practical behavioral change.",
    "- Overusing startup jargon at the expense of clarity.",
    "- Compressing the original lesson sequence so hard that the parable logic disappears.",
    ""
  ].join("\n");
}

function buildTitleConcepts(record) {
  const titles = record.adaptation.titleConcepts.map((title, index) => `${index + 1}. ${title}`);
  const subtitles = record.adaptation.subtitleOptions.map((title, index) => `${index + 1}. ${title}`);

  return [
    `# Title Concepts: ${record.source.title}`,
    "",
    "## Main Title Candidates",
    "",
    ...titles,
    "",
    "## Subtitle Candidates",
    "",
    ...subtitles,
    ""
  ].join("\n");
}

function buildBackCover(record) {
  const title = record.adaptation.workingTitle;
  const lessonLead = record.adaptation.coreLessons[0];
  const angles = record.adaptation.marketingAngles || defaultMarketingAngles(record);
  const angleLines = angles.slice(0, 4).map(angle => `- ${angle}`);
  const lessonSentence = `From there, the book turns the original lesson sequence into modern scenes built for ${record.target.audience}.`;

  return [
    `# ${title}`,
    "## Back Cover",
    "",
    `${record.source.title} remains useful because the underlying problem has not gone away. ${record.source.summary}`,
    "",
    `*${title}* rebuilds that classic for ${lowercaseFirst(record.adaptation.modernWorld)}. It is written for ${record.target.audience} who want direct, modern, story-driven guidance without generic motivation or antique examples.`,
    "",
    `The lesson begins with one hard line: "${lessonLead}" ${lessonSentence}`,
    "",
    "Inside, readers will find:",
    "",
    ...angleLines,
    "",
    `If you want the original classic's lessons in language built for ${record.target.audience}, this book was written for you.`,
    ""
  ].join("\n");
}

function defaultMarketingAngles(record) {
  return [
    `${record.target.audience} adaptation of a classic`,
    `practical lessons for ${record.target.positioning}`,
    `modern framing inside ${record.adaptation.modernWorld}`
  ];
}

function buildForeword(record) {
  return [
    `# Foreword`,
    "",
    "Money moves faster than ever, but the human mistakes around it are exactly the same.",
    "",
    `People build careers, stack clients, ship product, and still watch their bank accounts stay thinner than their effort should allow. That is the paradox at the center of ${record.adaptation.workingTitle}. The modern economy creates new tools, new risks, and new ways to earn, but it does not repeal the old laws of wealth.`,
    "",
    `${record.source.title} survived because it taught those laws through stories instead of spreadsheets. This adaptation keeps that advantage. The lesson sequence stays intact. The setting changes. Ancient trade routes become startup corridors, gig platforms, brokerage accounts, AI tools, Bitcoin wallets, and expensive cities that tempt people into looking rich long before they become wealthy.`,
    "",
    `The point is not nostalgia. The point is transfer. ${record.target.audience} readers need a version of the material that feels native to the world they actually live in, without losing the original moral force. Wealth is still what you keep. Judgment still matters more than hype. Skill still matters because earning power feeds the entire machine.`,
    "",
    "Read this version as a field manual, not a mood board. Keep the line that works. Test it in real life. Let time do the rest.",
    ""
  ].join("\n");
}

function buildAuthorNote(record) {
  return [
    "# Author Note",
    "",
    `This manuscript is a modern adaptation of ${record.source.title} by ${record.source.author}. It is designed to preserve the original work's underlying lessons while translating the narrative world, examples, and voice for today's builders, operators, freelancers, and creators.`,
    "",
    "This adaptation is not presented as text by the original author, and it should never be packaged in a way that implies endorsement, collaboration, or authorship by the source author. Every public-facing asset should clearly describe the book as a modern adaptation of a classic public-domain work.",
    "",
    `Rights record: ${record.rights.us.evidence}`,
    ""
  ].join("\n");
}

function buildChapterDraft(record, chapter) {
  if (slugify(chapter.title) === "foreword") {
    return buildForeword(record);
  }

  const protagonist = pickProtagonist(chapter.number);
  const lesson = record.adaptation.coreLessons[(chapter.number - 1) % record.adaptation.coreLessons.length];

  return [
    `# Chapter ${chapter.number}: ${chapter.title}`,
    "",
    `${protagonist.intro} ${chapter.focus} In the modern frame, that means ${chapter.modernFrame}.`,
    "",
    `${protagonist.tension} The chapter starts in friction because readers trust lessons more when they can see themselves in the mistake before they hear the rule. That is why the prose should stay close to cash flow, tradeoffs, and social pressure instead of drifting into abstract sermonizing.`,
    "",
    `The governing lesson here is simple: ${lesson} Show the character learning that this is not a slogan. It is a system. The first move is behavioral. The second move is structural. Once the reader sees the rule embodied in a modern life, the rest of the argument becomes easier to accept.`,
    "",
    `${protagonist.expansion} Use concrete details from ${record.adaptation.modernWorld} so the chapter feels lived-in: subscriptions, contracts, equity, rent, payroll, volatile assets, delayed invoices, and the gap between visible success and retained wealth. The goal is not to romanticize hustle. The goal is to reveal the hidden mechanics under it.`,
    "",
    `Close the chapter with a line that lands like a principle worth repeating. The source book worked because the reader could underline the lesson and carry it forward. This version should do the same, but in the language of today's builder economy.`,
    ""
  ].join("\n");
}

function buildKdpDescription(record) {
  return [
    `# KDP Description`,
    "",
    `${record.adaptation.workingTitle} is a modern adaptation of ${record.source.title}, rebuilt for founders, freelancers, creators, and operators who make money but want to keep more of it.`,
    "",
    "This book keeps the timeless lesson architecture of the original while translating the stories into startup life, digital work, modern investing, and the financial pressure of ambitious careers. It is written for readers who are tired of vague motivation and want durable rules they can actually apply.",
    "",
    "Readers will find:",
    "",
    "- Clear wealth lessons framed through modern characters and situations",
    "- Practical guidance on saving, compounding, judgment, and financial discipline",
    "- A story-driven alternative to generic personal-finance content",
    "- A modern-builder lens on a classic source text",
    "",
    "If you have income, ambition, and the suspicion that you should be further ahead by now, this adaptation was written for you.",
    ""
  ].join("\n");
}

function buildKeywords(record) {
  const keywords = record.adaptation.kdpKeywords || defaultKeywords(record);

  return [
    "# KDP Keywords",
    "",
    ...keywords.map(keyword => `- ${keyword}`),
    ""
  ].join("\n");
}

function defaultKeywords(record) {
  return [
    `${record.source.title.toLowerCase()} adaptation`,
    `${record.target.audience} self improvement`,
    `${record.target.positioning}`,
    "classic wisdom modernized",
    "builder mindset book",
    "operator self development",
    "modern personal growth"
  ];
}

function buildCoverBrief(record) {
  return [
    "# Cover Brief",
    "",
    `- Working title: ${record.adaptation.workingTitle}`,
    `- Positioning: ${record.target.positioning}`,
    `- Audience: ${record.target.audience}`,
    "",
    "## Visual Direction",
    "",
    "- Contemporary, premium, and disciplined rather than playful.",
    "- Signal timeless wisdom translated into a modern economic world.",
    "- Favor strong typography, confident hierarchy, and one memorable symbolic element tied to the book's metaphor.",
    "",
    "## Emotional Goal",
    "",
    "Make the book feel like a classic principle manual for ambitious modern readers who value clarity, money, and leverage.",
    "",
    "## Avoid",
    "",
    "- Generic self-help iconography",
    "- Cartoon finance imagery",
    "- Anything that implies the original edition or original author created this cover",
    ""
  ].join("\n");
}

function buildMetadata(record) {
  return [
    "# Metadata",
    "",
    `- Source title: ${record.source.title}`,
    `- Source author: ${record.source.author}`,
    `- Adaptation title: ${record.adaptation.workingTitle}`,
    `- Audience: ${record.target.audience}`,
    `- Status: ${record.status}`,
    `- Rights note: ${record.rights.us.evidence}`,
    `- Blueprint approval: ${record.review.blueprintApprovedAt || "not yet approved"}`,
    `- Draft approval: ${record.review.draftApprovedAt || "not yet approved"}`,
    ""
  ].join("\n");
}

function normalizedChapterPlan(record) {
  if (record.adaptation.chapterPlan?.length) {
    return record.adaptation.chapterPlan;
  }

  return record.adaptation.coreLessons.map((lesson, index) => ({
    number: index + 1,
    title: `Lesson ${index + 1}`,
    focus: lesson,
    modernFrame: record.adaptation.modernWorld
  }));
}

function pickProtagonist(number) {
  const variants = [
    {
      intro: "The opening scene should drop the reader beside a capable builder who is earning enough to feel optimistic and leaking enough to stay anxious.",
      tension: "That tension matters because a modern reader rarely needs more inspiration; they need a mirror.",
      expansion: "The middle of the chapter should sharpen the contrast between visible activity and actual financial progress."
    },
    {
      intro: "Start with a place where wealth is obvious in the environment but scarce in personal balance sheets.",
      tension: "The reader should feel the contradiction between prosperity all around and instability at home.",
      expansion: "Use the setting to prove that great markets do not automatically create wealthy participants."
    },
    {
      intro: "Frame the protagonist as ambitious, competent, and tired of solving everyone else's problems while their own base remains fragile.",
      tension: "The chapter works when the reader recognizes that skill alone is not the same thing as retained wealth.",
      expansion: "Let the turning point come through conversation, not lecture, so the rule lands as earned insight."
    }
  ];

  return variants[(number - 1) % variants.length];
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatLabel(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, letter => letter.toUpperCase());
}

function lowercaseFirst(value) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function printHelp() {
  console.log(`Usage:
  node book-factory/scripts/book-factory.mjs discover [--limit N]
  node book-factory/scripts/book-factory.mjs verify-rights <slug>
  node book-factory/scripts/book-factory.mjs blueprint <slug>
  node book-factory/scripts/book-factory.mjs back-cover-sample <slug>
  node book-factory/scripts/book-factory.mjs approve <slug> <blueprint|back-cover-sample|draft>
  node book-factory/scripts/book-factory.mjs draft <slug>
  node book-factory/scripts/book-factory.mjs package <slug>
  node book-factory/scripts/book-factory.mjs status
  node book-factory/scripts/book-factory.mjs owner-loop
  node book-factory/scripts/book-factory.mjs reset-output`);
}

await main();
