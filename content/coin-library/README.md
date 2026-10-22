# Fused coin media library

Raw originals remain unchanged in `/Users/nick/projects/fuseddistribution/Coin Raw`.

- `catalog.json`: stable IDs, searchable subjects, original paths, hashes, identification confidence, usage and privacy requirements.
- `reusable-assets.json`: reviewed, source-linked compositions for future Fused content. Each entry records the editable artwork, source coin IDs, hash, role, rights scope and reuse limits.
- `index.html`: local visual catalog with linked previews of originals and reusable compositions. Open it from the project checkout so its relative image paths resolve. Rebuild it from the manifests with `node content/coin-library/build-index.mjs`.
- Coin history workups: `../coin-history/`.
- New episode input requirements and the reusable queue preparer: `../../docs/COIN-HISTORY-PACKAGE-INPUT.md`.
- Usage reconciler: `node scripts/audit-coin-library-usage.mjs --write`. It adds only published coin-evidence uses whose catalog source path and SHA256 still match.

New coin photos stay in the raw folder, unchanged. Add a catalog record with a new stable `coin-####` ID, source hash, exact visible identity evidence, and a pending review status. Review the full original against an authoritative design/source with `node scripts/review-coin-library-asset.mjs --asset-id=coin-#### --coin-identity="..." --identity-source=https://... --visible-markers="..."`. This records the local Gemma visual comparison and marks the image usable only when the match passes. Package intake and the pre-render Gemma vision check then independently compare every selected coin-evidence crop with the episode identity. Uncertain crops remain unavailable to the queue.

Owner correction: the first story incorrectly described coin-0006 as showing an O mint mark. That attribution is withdrawn. Do not reuse it as New Orleans evidence or infer a mint from coin-0007's obverse/holder. Reverify both identities before new specimen-specific claims. Nick requested that the existing article and reel remain unchanged. Treat the photographs as separate specimens unless pairing is independently confirmed. The handheld clip is an 1886 obverse, not the 1900 coin and not evidence of an O mint mark.

Prefer original media over stock when it shows the subject accurately. Preserve raw files, patina, relief, rim and lettering. Use reversible viewport crop coordinates in scene/artwork files, retain a full-view reference, and record which detail the crop proves. Never synthesize a date, mint mark, scratch, toning or grade. Catalog assertions require source research before they become historical claims. Uncertain dates and varieties stay unknown. Photographs of third-party labels do not establish independent authentication.

Reusable editorial art may combine approved coin crops with researched date cards and diagrams. Keep editable photo-embedded SVGs in the coin-history workup, not on the public site. The JPEG exports in `reusable-assets.json` are approved for future Fused blog and reel use only when their fact labels and source limitations stay with them. They are not stand-alone or public stock images.

The Walking Liberty and Silver Eagle episode adds 18 reviewed, reusable JPEG scene plates under `../coin-history/walking-liberty-half-dollar-silver-eagle/reusable-library/walking-liberty/`. Its editable SVGs, source links, transcript, crop plan, rights scope, and archive records stay with that workup. Reuse each plate with its label and source limitation; the collection compares two separate obverse photographs and does not include an owner photograph of either coin's reverse.

Use factual filenames for exported assets and link every export to its raw asset ID. Do not publish full sales notes, addresses, unrelated screens or slab serials accidentally. The screenshot asset coin-0039 is reference-only until provenance and UI cropping are reviewed. No public stock-photo redistribution is authorized by this content reuse request.
