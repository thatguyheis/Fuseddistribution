import { access } from "node:fs/promises";
import path from "node:path";
import { CSV_HEADERS, ORIGINALS_DIR, REQUIRED_DIRS, ensureDirectories, readCatalog } from "./lib.mjs";

function addIfMissing(errors, value, label, record) {
  if (!String(value ?? "").trim()) {
    errors.push(`${record.id || "unknown"} is missing ${label}.`);
  }
}

async function main() {
  await ensureDirectories(REQUIRED_DIRS);
  const { headers, records } = await readCatalog();
  const errors = [];

  const missingHeaders = CSV_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    errors.push(`Catalog is missing required header(s): ${missingHeaders.join(", ")}.`);
  }

  const seenIds = new Set();
  const seenSlugs = new Set();
  const seenAssetFilenames = new Set();

  for (const record of records) {
    addIfMissing(errors, record.id, "id", record);
    addIfMissing(errors, record.filename, "filename", record);
    addIfMissing(errors, record.asset_filename, "asset_filename", record);
    addIfMissing(errors, record.slug, "slug", record);
    addIfMissing(errors, record.title, "title", record);
    addIfMissing(errors, record.alt_text, "alt_text", record);
    addIfMissing(errors, record.caption, "caption", record);
    addIfMissing(errors, record.description, "description", record);
    addIfMissing(errors, record.tags, "tags", record);
    addIfMissing(errors, record.orientation, "orientation", record);
    addIfMissing(errors, record.license_status, "license_status", record);
    addIfMissing(errors, record.license_type, "license_type", record);
    addIfMissing(errors, record.collection, "collection", record);
    addIfMissing(errors, record.featured, "featured", record);
    addIfMissing(errors, record.published, "published", record);

    if (seenIds.has(record.id)) {
      errors.push(`Duplicate id found: ${record.id}.`);
    }
    seenIds.add(record.id);

    if (seenSlugs.has(record.slug)) {
      errors.push(`Duplicate slug found: ${record.slug}.`);
    }
    seenSlugs.add(record.slug);

    if (seenAssetFilenames.has(record.asset_filename)) {
      errors.push(`Duplicate asset filename found: ${record.asset_filename}.`);
    }
    seenAssetFilenames.add(record.asset_filename);

    const sourcePath = path.join(ORIGINALS_DIR, record.asset_filename || "");
    try {
      await access(sourcePath);
    } catch {
      errors.push(`${record.id || "unknown"} is missing source file: ${sourcePath}.`);
    }
  }

  if (errors.length > 0) {
    console.error("Catalog validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Catalog validation passed for ${records.length} record(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
