import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const PHOTO_ROOT = path.resolve("photos");
export const DATA_DIR = path.join(PHOTO_ROOT, "data");
export const UPLOADS_DIR = path.join(PHOTO_ROOT, "uploads");
export const ORIGINALS_DIR = path.join(PHOTO_ROOT, "originals");
export const DERIVED_WEB_DIR = path.join(PHOTO_ROOT, "derived", "web");
export const DERIVED_SOCIAL_DIR = path.join(PHOTO_ROOT, "derived", "social");
export const DERIVED_MARKETPLACE_DIR = path.join(PHOTO_ROOT, "derived", "marketplace");
export const IMAGES_CSV_PATH = path.join(DATA_DIR, "images.csv");
export const IMPORT_DEFAULTS_PATH = path.join(DATA_DIR, "import-defaults.json");
export const PUBLIC_COLLECTIONS_DIR = path.join(PHOTO_ROOT, "collections");
export const PUBLIC_IMAGES_DIR = path.join(PHOTO_ROOT, "images");
export const REQUIRED_DIRS = [
  PHOTO_ROOT,
  DATA_DIR,
  UPLOADS_DIR,
  ORIGINALS_DIR,
  DERIVED_WEB_DIR,
  DERIVED_SOCIAL_DIR,
  DERIVED_MARKETPLACE_DIR,
  PUBLIC_COLLECTIONS_DIR,
  PUBLIC_IMAGES_DIR,
];

export const CSV_HEADERS = [
  "id",
  "filename",
  "asset_filename",
  "slug",
  "title",
  "alt_text",
  "caption",
  "description",
  "location",
  "state_region",
  "country",
  "tags",
  "orientation",
  "license_status",
  "license_type",
  "model_release",
  "property_release",
  "collection",
  "featured",
  "published",
  "date_captured",
  "date_published",
  "notes",
];

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tif", ".tiff"]);

export function isSupportedImage(filename) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export async function ensureFile(filePath, content) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, content, "utf8");
  }
}

export async function ensureCatalog() {
  await ensureDirectories(REQUIRED_DIRS);
  await ensureFile(IMAGES_CSV_PATH, `${CSV_HEADERS.join(",")}\n`);
}

export async function ensureImportDefaults() {
  await ensureDirectories(REQUIRED_DIRS);
  await ensureFile(
    IMPORT_DEFAULTS_PATH,
    `${JSON.stringify(DEFAULT_IMPORT_DEFAULTS, null, 2)}\n`,
  );
}

export async function ensureDirectories(dirPaths) {
  for (const dirPath of dirPaths) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export const DEFAULT_IMPORT_DEFAULTS = {
  global: {
    license_status: "commercial-safe",
    license_type: "free-use",
    model_release: "no",
    property_release: "no",
    country: "United States",
    published: "no",
    featured: "no",
  },
  collectionRules: [
    {
      matchTagsAny: ["sunset", "waterside", "shoreline", "calm water", "sun flare"],
      collection: "waterside-sunsets",
    },
    {
      matchTagsAny: ["spider", "macro", "insect", "arthropod", "evergreens", "woodland", "trees"],
      collection: "nature-details",
    },
    {
      matchTagsAny: ["architecture", "interior", "residential exterior", "garage doors", "patio", "backyard"],
      collection: "residential-architecture-event",
    },
    {
      matchTagsAny: ["twilight", "smoky sky", "suburban road", "parking lot", "utility corridor"],
      collection: "suburban-atmosphere",
    },
  ],
  batchRules: [
    {
      name: "lake-oswego-residential-2015-08-19",
      match: {
        fileDateFrom: "2015-08-19",
        fileDateTo: "2015-08-19",
      },
      apply: {
        location: "Lake Oswego, Oregon",
        state_region: "Oregon",
        country: "United States",
        collection: "residential-architecture-event",
        add_tags: ["lake oswego", "oregon", "pacific northwest"],
      },
    }
  ],
};

export function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function parseCsv(content) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((field) => field !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current !== "" || row.length > 0) {
    row.push(current);
    if (row.some((field) => field !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

export async function readCatalog() {
  await ensureCatalog();
  const raw = await fs.readFile(IMAGES_CSV_PATH, "utf8");
  const rows = parseCsv(raw);

  if (rows.length === 0) {
    return { headers: [...CSV_HEADERS], records: [] };
  }

  const [headers, ...dataRows] = rows;
  const records = dataRows.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    return record;
  });

  return { headers, records };
}

export async function writeCatalog(headers, records) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...records.map((record) => headers.map((header) => csvEscape(record[header] ?? "")).join(",")),
  ];
  await fs.writeFile(IMAGES_CSV_PATH, `${lines.join("\n")}\n`, "utf8");
}

export async function readImportDefaults() {
  await ensureImportDefaults();
  const raw = await fs.readFile(IMPORT_DEFAULTS_PATH, "utf8");
  return JSON.parse(raw);
}

export function nextImageId(existingRecords) {
  let max = 0;
  for (const record of existingRecords) {
    const match = /^img-(\d+)$/.exec(record.id ?? "");
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `img-${String(max + 1).padStart(4, "0")}`;
}

export async function getImageDimensions(filePath) {
  try {
    const { stdout } = await execFileAsync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
      encoding: "utf8",
    });
    const widthMatch = stdout.match(/pixelWidth:\s+(\d+)/);
    const heightMatch = stdout.match(/pixelHeight:\s+(\d+)/);
    if (!widthMatch || !heightMatch) {
      return { width: null, height: null };
    }
    return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
  } catch {
    return { width: null, height: null };
  }
}

export function orientationForSize(width, height) {
  if (!width || !height) {
    return "unknown";
  }
  if (width === height) {
    return "square";
  }
  return width > height ? "landscape" : "portrait";
}

export async function getCaptureDate(filePath) {
  const mdlsFields = [
    "kMDItemContentCreationDate",
    "kMDItemFSCreationDate",
  ];

  for (const field of mdlsFields) {
    try {
      const { stdout } = await execFileAsync("mdls", ["-raw", "-name", field, filePath], {
        encoding: "utf8",
      });
      const trimmed = stdout.trim();
      if (trimmed && trimmed !== "(null)") {
        return trimmed;
      }
    } catch {
      continue;
    }
  }

  try {
    const stats = await fs.stat(filePath);
    return stats.mtime.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function seasonForDate(dateValue) {
  const match = String(dateValue).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return "";
  }
  const month = Number(match[2]);
  if ([12, 1, 2].includes(month)) {
    return "winter";
  }
  if ([3, 4, 5].includes(month)) {
    return "spring";
  }
  if ([6, 7, 8].includes(month)) {
    return "summer";
  }
  return "autumn";
}

export function inferTags({ baseName, orientation, captureDate }) {
  const tokens = slugify(baseName)
    .split("-")
    .filter((token) => token.length > 2 && !/^\d+$/.test(token));

  const tagSet = new Set(["outdoor"]);

  if (orientation && orientation !== "unknown") {
    tagSet.add(orientation);
  }

  const season = seasonForDate(captureDate);
  if (season) {
    tagSet.add(season);
  }

  const keywordMap = {
    mountain: "mountain",
    mountains: "mountain",
    lake: "lake",
    lakes: "lake",
    river: "river",
    trail: "trail",
    forest: "forest",
    trees: "trees",
    tree: "trees",
    waterfall: "waterfall",
    snow: "snow",
    beach: "beach",
    coast: "coast",
    sunset: "sunset",
    sunrise: "sunrise",
    desert: "desert",
    canyon: "canyon",
    cliff: "cliff",
    road: "road",
    bridge: "bridge",
    ocean: "ocean",
    sea: "ocean",
    cloud: "clouds",
    clouds: "clouds",
  };

  for (const token of tokens) {
    if (keywordMap[token]) {
      tagSet.add(keywordMap[token]);
    }
  }

  return [...tagSet].join(", ");
}

export function inferTitle(baseName) {
  const clean = slugify(baseName).replace(/-/g, " ").trim();
  if (!clean) {
    return "Untitled Outdoor Photo";
  }
  return titleCase(clean);
}

export function splitTags(tagsValue) {
  return String(tagsValue ?? "")
    .split(",")
    .map((tag) => tag.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
}

export function joinTags(tags) {
  const seen = new Set();
  const normalized = [];

  for (const rawTag of tags) {
    const tag = String(rawTag ?? "").trim().replace(/^"+|"+$/g, "");
    if (!tag) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(tag);
  }

  return normalized.sort((a, b) => a.localeCompare(b)).join(", ");
}

export function appendTags(existingTags, newTags) {
  return joinTags([...splitTags(existingTags), ...newTags]);
}

export function normalizeDateOnly(dateValue) {
  const match = String(dateValue ?? "").match(/(\d{4})[-:](\d{2})[-:](\d{2})/);
  if (!match) {
    return "";
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function dateInRange(dateValue, fromValue, toValue) {
  const dateOnly = normalizeDateOnly(dateValue);
  if (!dateOnly) {
    return false;
  }
  if (fromValue && dateOnly < fromValue) {
    return false;
  }
  if (toValue && dateOnly > toValue) {
    return false;
  }
  return true;
}

export function inferCollectionFromRules(tagsValue, collectionRules) {
  const tags = splitTags(tagsValue).map((tag) => tag.toLowerCase());
  for (const rule of collectionRules ?? []) {
    const matches = (rule.matchTagsAny ?? []).some((ruleTag) => tags.includes(String(ruleTag).toLowerCase()));
    if (matches) {
      return rule.collection;
    }
  }
  return "";
}

export function buildAltText({ title, tags, orientation, location }) {
  const locationTokens = String(location ?? "")
    .split(/[\s,]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const primaryTags = splitTags(tags)
    .filter((tag) => !locationTokens.includes(tag.toLowerCase()))
    .slice(0, 3)
    .join(", ");
  const locationPart = location ? ` in ${location}` : "";
  if (primaryTags) {
    return `${title}, ${primaryTags}${locationPart}`;
  }
  return `${title}${locationPart}`;
}

export function buildCaption({ title, location }) {
  return location ? `${title} in ${location}.` : `${title}.`;
}

export function buildDescription({ title, location, collection, orientation }) {
  const locationPart = location ? ` in ${location}` : "";
  const collectionPart = collection && collection !== "uncategorized" ? ` for the ${collection} collection` : "";
  const orientationPart = orientation && orientation !== "unknown" ? ` ${orientation}` : "";
  return `${title} is a${orientationPart} photograph${locationPart}${collectionPart}.`;
}

export function applyGlobalDefaults(record, globalDefaults = {}) {
  for (const [key, value] of Object.entries(globalDefaults)) {
    if (!String(record[key] ?? "").trim()) {
      record[key] = value;
    }
  }
  return record;
}

export function locationTags(location) {
  return String(location ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function matchesBatchRule(record, rule) {
  const match = rule.match ?? {};
  if (match.filenameIncludes) {
    const matchesFilename = [].concat(match.filenameIncludes).some((pattern) =>
      String(record.filename ?? "").toLowerCase().includes(String(pattern).toLowerCase()),
    );
    if (!matchesFilename) {
      return false;
    }
  }
  if (match.fileDateFrom || match.fileDateTo) {
    if (!dateInRange(record.date_captured, match.fileDateFrom, match.fileDateTo)) {
      return false;
    }
  }
  return true;
}

export function applyBatchRule(record, rule) {
  const apply = rule.apply ?? {};
  for (const [key, value] of Object.entries(apply)) {
    if (key === "add_tags") {
      record.tags = appendTags(record.tags, value);
      continue;
    }
    if (key === "notes_append") {
      record.notes = [record.notes, value].filter(Boolean).join(" ");
      continue;
    }
    record[key] = value;
  }
  return record;
}

export async function copyFileIfMissing(sourcePath, targetPath) {
  try {
    await fs.access(targetPath);
    return false;
  } catch {
    await fs.copyFile(sourcePath, targetPath);
    return true;
  }
}

export async function listFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

export function normalizeStoredFilename(id, originalFilename) {
  const extension = path.extname(originalFilename).toLowerCase();
  const baseName = path.basename(originalFilename, extension);
  return `${id}-${slugify(baseName)}${extension}`;
}

export async function runSips(args) {
  await execFileAsync("sips", args, { encoding: "utf8" });
}
