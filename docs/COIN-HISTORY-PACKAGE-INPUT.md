# Preparing a coin history package

The recurring production queue accepts a manifest only after the episode workup exists and passes validation. The manifest supplies the editorial package structure; it does not replace research or image review.

Run:

```bash
node scripts/prepare-coin-history-batch.mjs --manifest=content/coin-history/incoming/episode.json
```

Store the manifest at `content/coin-history/incoming/<slug>.json`. The JSON object has an `items` array. Each item contains:

- `slug`, `title`, `coinIdentity`, `hook`, and `description`.
- `reelLabels`, with one label for each body paragraph after the hook.
- `graphicRows`, at least three pairs of short label and sourced detail.
- `sections`, each shaped as `[heading, readerQuestion, purpose, primaryClaimIds, supportingClaimIds]`. Claim IDs must exist in the episode claim map.
- `images`, with one record per coin photo. Each record has `type` (`owner` or `commons`), `source`, `label`, exact `coinIdentity`, `reviewedReference`, and `segmentIndexes` identifying the reel beats where it is shown. Owner images also need `assetId` and a crop in source pixel coordinates. The catalog source and SHA256 must match, and its identity/crop status must already be approved. The image cannot be left as unused package art; every added image must be mapped into a beat about the coin.

`workup` supplies the `research`, `claimMap`, exact `transcript`, required passing `audit` fields, and `approvalEvidence`. The builder writes `research.json`, `claim-map.json`, `narration-v1-approved.txt`, `script-approval.json`, `overview.md`, and `reel-labels.json` from those inputs. Every used source record must have `primarySourceVerified: true` and a concise `primarySourceBasis`. The claim map must link every claim to one of those HTTPS source URLs. Research cannot have open questions or missing evidence. The approved transcript hash is generated from the exact transcript; new reel narration must be 280 to 330 words, map to the hook and labels, and end with a question of ten words or fewer.

The package builder creates the workup files, crops and hashes every supplied coin image, asks the local `gemma3:4b` vision model to compare each crop with the declared coin identity, and writes the queue entry only if all matches pass. The production worker repeats the comparison against each exact crop immediately before rendering. Either check blocks the episode if an identity is uncertain, mismatched, or an image hash changed. Add supporting historical images only when their source, rights, and specific claim relationship are recorded in the package media plan.

New owner photos belong in `Coin Raw/` and must be cataloged first. Keep them in a pending review status until the visible design/date/inscription and crop are checked. Review a catalog image against its primary identity reference with:

```bash
node scripts/review-coin-library-asset.mjs --asset-id=coin-0048 --coin-identity="1892 Columbian half dollar" --identity-source=https://www.usmint.gov/ --visible-markers="Columbus portrait and 1892 date"
```

This preserves the original hash, runs a local Gemma vision comparison, records the visible evidence, and marks the asset usable only if the match passes. Package intake checks the catalog identity and crop again, then the worker repeats the comparison against the exact crop before rendering. Usage history is reconciled from published image source manifests with:

```bash
node scripts/audit-coin-library-usage.mjs --write
```

The worker writes queue health and recent measured stage timing to `.workflow-state/coin-history-drafts/queue-health.json` and `throughput.json`. Keep at least three prepared, unprocessed episodes in the queue each morning; use the seven day metrics to assess actual capacity rather than assuming the target is met.
