import {
  applyBatchRule,
  applyGlobalDefaults,
  appendTags,
  buildAltText,
  buildCaption,
  buildDescription,
  inferCollectionFromRules,
  locationTags,
  matchesBatchRule,
  normalizeDateOnly,
  readCatalog,
  readImportDefaults,
  writeCatalog,
} from "./lib.mjs";

function updateRecord(record, defaults) {
  applyGlobalDefaults(record, defaults.global);

  record.date_captured = normalizeDateOnly(record.date_captured);

  for (const rule of defaults.batchRules ?? []) {
    if (matchesBatchRule(record, rule)) {
      applyBatchRule(record, rule);
    }
  }

  if (!record.collection || record.collection === "uncategorized") {
    const inferredCollection = inferCollectionFromRules(record.tags, defaults.collectionRules);
    if (inferredCollection) {
      record.collection = inferredCollection;
    }
  }

  if (record.location && record.state_region && record.country) {
    const regionTags = [
      ...locationTags(record.location),
      record.state_region.toLowerCase(),
      record.country.toLowerCase(),
    ];
    record.tags = appendTags(record.tags, regionTags);
  }

  record.alt_text = buildAltText(record);
  record.caption = buildCaption(record);
  record.description = buildDescription(record);

  if (!record.notes) {
    record.notes = "Enriched by photos:enrich.";
  }

  return record;
}

async function main() {
  const defaults = await readImportDefaults();
  const { headers, records } = await readCatalog();

  if (records.length === 0) {
    console.log("No catalog records found in photos/data/images.csv.");
    return;
  }

  const updatedRecords = records.map((record) => updateRecord({ ...record }, defaults));
  await writeCatalog(headers, updatedRecords);

  console.log(`Enriched ${updatedRecords.length} catalog record(s).`);
  console.log("Applied global defaults, batch rules, collection inference, and regenerated copy fields.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
