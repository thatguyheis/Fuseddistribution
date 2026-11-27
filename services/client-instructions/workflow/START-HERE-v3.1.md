# Coins & Auctions Since 1994 | V3.1 video workflow

V3.1 updates V3. Read `docs/V3.1-ADDENDUM.md` first, then `docs/VIDEO-SOP.md` and `docs/V3-STYLE.md`. If they disagree, V3.1 wins. Keep this release in its own folder under the coin project. Keep using the installed voice workflow for audio. You may use your own intro and outro files.

The checks below are deterministic gates. Do not render until `check` prints `check: PASS`. The renderer refuses to start while there are errors, and there is no override.

## Steps

1. **Environment.** From the coin project run `python "$release/tools/preview.py" check-env`. On Linux, install FFmpeg, FFprobe and DejaVu Sans.
2. **Ideas (Gate 1).** For the lot, prepare two hooks, one topic, and two closing questions or comment calls to action. Use only facts you can source, and check every fact against the auction listing. Show them to the owner for approval.
3. **Script.** Write the approved script into `lots.json`. Then run `python "$release/tools/preview.py" lint <auction-id> <lot>` and fix every ERROR before voicing.
   - Every sentence must move the hook's story forward. Never describe the picture ("this photograph shows", "pictured", "you can see").
   - Never hedge ("described as", "stated"). Say the fact plainly, or leave it out.
   - Do not repeat the hook word for word near the end. Tie back to it in new words.
   - Segment 1 is the hook. The last segment must be a question or a comment call to action that invites replies, for example "Would you rather own the nickel or the gold? Tell us in the comments." The bidding line ("Lot 870 is open for bidding") can come before it, never last.
   - If `lint` lists places, the video needs a map (see step 5).
4. **Voice and timings.** Use the existing voice workflow.
5. **Scene plan.** Make the scene plan against the approved lot, the voice timings and the media paths. `check` enforces these rules:
   - **No white space around photos.** Lot photos and coin photos on a white or flat background are cut out automatically. Show them with `"kind": "cutout"` or `"kind": "lotphoto"`. Never use `"card": true`, and never show a flat background photo as `photo` or `portrait`.
   - **Context photos.** At least 3 scenes, with at least 2 different photos, must use cleared stock photos (Pexels) or credited public domain archival images, on top of every lot photo. Stock photos are never presented as the lot or as period evidence. Archival scenes need a `credit` line.
   - **No empty frames.** Never use `"kind": "dark"`. Put timelines (`ruler`), big numbers (`big`) and callouts over a photo (`"kind": "photo", "layout": "full", "dim": ...`) or over a cutout with a `bg` photo. A mid scene frame that is more than 80% empty background fails.
   - **Map only for places.** If the script names a place, add a `map` scene keyed to that segment, using `data/us-states.json` or `data/world.geo.json` copied into the project. If no place is named, do not use a map.
   - **Red circle.** Circle at least one spoken detail (date, mint mark, designer initial, a word on a document), using `rel` on a cutout or `circles` on a photo. Never circle a covered or blank patch.
   - **Variety (like the Lot 851 example).** At least 5 scene kinds (cutout, photo, map, kinetic, coinroll, coingrid, herocoin, portrait, lotphoto), 5 devices (ghost year, big number, callout, ruler, label, phrases, circle, map, torn paper, flip, pair), 4 camera moves (push, pull, panL, panR, rise, tilt), and 3 transitions including a whip (`defocus`, `whipL`, `whipR`, `whipU`, `zoom`). No three identical shots in a row. Plain lot photo shots can be no more than 45% of the scenes.
   - **Pace.** A new picture every 2 to 5 seconds, every shot moving, every overlay landing on its spoken word.
6. **Check.** Run `python "$release/tools/preview.py" check path/to/scenes.json` and `python "$release/tools/preview.py" assets <auction-id> <lot> path/to/scenes.json`. Fix every ERROR. Read every warning. A warning about a patch inside a lot photo means the original photo has a covered area: keep close ups and circles away from it.
7. **Selection (Gate 2).** Run `python "$release/tools/preview.py" select path/to/scenes.json`. The page starts with the asset check (errors, the map decision with the place words, cutout previews, context photos, circles, variety). The owner approves there. Apply the changes and save the approved scene plan.
8. **Render and QA.** Run `python "$release/tools/preview.py" render path/to/approved-scenes.json`, then `python "$release/tools/preview.py" qa path/to/approved-scenes.json`. Verify picture, spoken numbers, rights, captions, level, the closing and the file size (under 25 MB) before handing off. Uploading and scheduling are separate actions.

`examples/lot-851.json` and its stills show the variety we want. `examples/lot-870-v3.1.json` shows a plan that passes `check`, with cutouts, context photos behind the coins, a timeline over a photo and a red circle. Rendering the examples needs their original media on the workstation.
