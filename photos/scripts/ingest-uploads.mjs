import fs from "node:fs/promises";
import path from "node:path";
import {
  CSV_HEADERS,
  ORIGINALS_DIR,
  UPLOADS_DIR,
  copyFileIfMissing,
  ensureCatalog,
  getCaptureDate,
  getImageDimensions,
  inferTags,
  inferTitle,
  isSupportedImage,
  listFiles,
  nextImageId,
  normalizeStoredFilename,
  orientationForSize,
  readCatalog,
  slugify,
  writeCatalog,
} from "./lib.mjs";

async function main() {
  await ensureCatalog();
  const { headers, records } = await readCatalog();
  const files = await listFiles(UPLOADS_DIR);
  const imageFiles = files.filter(isSupportedImage);

  if (imageFiles.length === 0) {
    console.log("No image files found in photos/uploads.");
    return;
  }

  const knownOriginalNames = new Set(records.map((record) => record.filename));
  const knownStoredNames = new Set(records.map((record) => record.asset_filename));
  const imported = [];
  let workingRecords = [...records];

  for (const fileName of imageFiles) {
    if (knownOriginalNames.has(fileName)) {
      continue;
    }

    const uploadPath = path.join(UPLOADS_DIR, fileName);
    const id = nextImageId(workingRecords);
    const assetFilename = normalizeStoredFilename(id, fileName);

    if (knownStoredNames.has(assetFilename)) {
      continue;
    }

    const originalPath = path.join(ORIGINALS_DIR, assetFilename);
    await copyFileIfMissing(uploadPath, originalPath);

    const { width, height } = await getImageDimensions(originalPath);
    const orientation = orientationForSize(width, height);
    const baseName = path.basename(fileName, path.extname(fileName));
    const captureDate = await getCaptureDate(originalPath);
    const title = inferTitle(baseName);
    const slug = `${id}-${slugify(baseName)}`.replace(/-+$/g, "");
    const tags = inferTags({ baseName, orientation, captureDate });

    const record = {
      id,
      filename: fileName,
      asset_filename: assetFilename,
      slug,
      title,
      alt_text: `${title} outdoor photograph`,
      caption: `${title}.`,
      description: "Outdoor photograph imported for review and licensing preparation.",
      location: "",
      state_region: "",
      country: "",
      tags,
      orientation,
      license_status: "commercial-safe",
      license_type: "direct",
      model_release: "no",
      property_release: "no",
      collection: "uncategorized",
      featured: "no",
      published: "no",
      date_captured: captureDate,
      date_published: "",
      notes: "Imported by photos:ingest. Defaulted to commercial-safe per workflow policy. Review metadata before publishing.",
    };

    workingRecords.push(record);
    knownOriginalNames.add(fileName);
    knownStoredNames.add(assetFilename);
    imported.push(record);
  }

  if (imported.length === 0) {
    console.log("No new images were imported. Existing filenames were skipped.");
    return;
  }

  await writeCatalog(headers.length ? headers : CSV_HEADERS, workingRecords);

  const summary = imported.map((record) => `- ${record.id}: ${record.asset_filename} -> ${record.tags}`);
  console.log(`Imported ${imported.length} image(s):\n${summary.join("\n")}`);
  console.log("Review photos/data/images.csv before running prepare or publish steps.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
