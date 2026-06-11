import fs from "node:fs/promises";
import path from "node:path";
import {
  DERIVED_MARKETPLACE_DIR,
  DERIVED_SOCIAL_DIR,
  DERIVED_WEB_DIR,
  ORIGINALS_DIR,
  REQUIRED_DIRS,
  ensureDirectories,
  readCatalog,
  runSips,
} from "./lib.mjs";

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createJpegVariant(sourcePath, targetPath, maxDimension) {
  await runSips(["-s", "format", "jpeg", "--resampleHeightWidthMax", String(maxDimension), sourcePath, "--out", targetPath]);
}

async function main() {
  await ensureDirectories(REQUIRED_DIRS);
  const { records } = await readCatalog();

  if (records.length === 0) {
    console.log("No catalog records found in photos/data/images.csv.");
    return;
  }

  let prepared = 0;
  let skipped = 0;

  for (const record of records) {
    if (!record.asset_filename) {
      skipped += 1;
      continue;
    }

    const sourcePath = path.join(ORIGINALS_DIR, record.asset_filename);
    if (!(await exists(sourcePath))) {
      skipped += 1;
      continue;
    }

    const outputBaseName = `${record.slug || record.id}.jpg`;
    const webOutput = path.join(DERIVED_WEB_DIR, outputBaseName);
    const socialOutput = path.join(DERIVED_SOCIAL_DIR, outputBaseName);
    const marketplaceOutput = path.join(DERIVED_MARKETPLACE_DIR, outputBaseName);

    await createJpegVariant(sourcePath, webOutput, 2400);
    await createJpegVariant(sourcePath, socialOutput, 1600);
    await createJpegVariant(sourcePath, marketplaceOutput, 3200);
    prepared += 1;
  }

  console.log(`Prepared ${prepared} image(s). Skipped ${skipped} record(s) missing asset files.`);
  console.log("Outputs written to photos/derived/web, photos/derived/social, and photos/derived/marketplace.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
