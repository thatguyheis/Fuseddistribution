# Reel visual enrichment

Effective October 13, 2026. This replaces older requirements to use photos for all body scenes, prefer copied blog art before stock, or force a paper collage into every reel. Keep the existing hook strategy, approved hero first frame, narration, factual charts, captions, duration limits and exact MP4 visual release review.

For coin history, the October 14 standard in `docs/COIN-HISTORY-SOP.md` takes precedence: relevant real images plus labeled AI support, no mandatory fresh-generation or stock-video quota, transcript approval before production, and final delivery below 50 MB.

## Plan and render

1. Match every evidence claim to the exact source image. Coin dates, mint marks and varieties require a reviewed photograph that actually shows them. Tool tutorials require verified matching UI. An illustration or stock image is supporting imagery, never proof of a result or tool feature.
2. Prefer deterministic, source-backed charts, graphs, labeled diagrams, and flowcharts when they explain the topic. Use relevant owned or cleared images/video for context. Stable Diffusion is optional and disabled by default (`GENERATIVE_MEDIA_ENABLED=0`). Enable it only for a documented visual gap that graphics and cleared media cannot fill. Limit an optional generation attempt to four minutes; if it does not finish, use a relevant reviewed library/stock fallback and record the fallback. Never block TTS, encoding, or the rest of the overnight batch on optional image generation.
3. Use stock video only where visible human action materially improves the beat, not to satisfy a fixed footage quota. A factual chart may remain a chart; a process may use a flowchart; never obscure verified data just to add motion. Reviewer chooses appropriate exceptions for evidence-heavy episodes.
4. Let imagery occupy the frame. Hook and overlay scenes use the media feature layout: compact animated headline, light shading and clear captions. Preserve slide, wipe and fade transitions between beats, and restrained photo motion. Use concise headlines and distinct scene assets. Do not repeat a hero behind every paragraph.
5. Inspect visual pacing across the whole MP4. For long scenes, use footage with visible action or prepare additional reviewed cutaways before release. A long static card with a tiny zoom alone does not meet the quality standard. Avoid gratuitous transitions, unrelated footage or decorative charts.
6. Inspect first frame, every body scene, transitions and final frame. Reject unreadable captions, unsupported claims, mismatched imagery, generation artifacts or repeated filler. A successful render alone is not approval. Existing exact-output review and publishing gates remain required.

## Owned images and mixed plans

Existing complete reviewed `preferred-media.json` plans retain their exact layouts. For new mixed episodes set `mode` to `mixed` and include only the reviewed evidence scene indices. Each listed scene still requires the approved layout file and hash. The other indices receive normal generated/stock enrichment. Never silently replace evidence photos with generated coins or stock examples. Optional `cutaways` contain additional article-local image paths and SHA256 hashes, reviewed in the same plan. They cut between unchanged evidence layouts within the scene. Every cutaway is validated before staging; the default legacy single-image behavior remains intact. Mixed plans can also add `supportingCutaways` entries with a segment `index` and reviewed `shots` (path plus SHA256). Supporting scenes show their selected generated image or video for six seconds, then cut to the approved evidence layouts. This keeps decorative scenes brief without changing narration timing or regenerating media.

## Storage and reuse

- `video/local/generated-backgrounds/`: generated image catalog, final JPGs and raw source PNGs, with scene, topic, tags, prompt, seed, model and license metadata.
- `video/local/stock-media/`: downloaded assets with source URL, provider ID, creator, license URL, content hash, query, topic and review state.
- `video/out/<slug>/media-manifest.json`: exact per-scene provenance. `render-meta.json` lists media feature scenes.
- `content/reel-media/README.md`: discovery guide for future blog and reel production.

New library assets start pending visual review. Normal successful release promotes only assets whose hashes match the staged images/video. An owner may also approve supporting assets after inspecting a separate visual preview and recording its exact hash and reviewed frames, as in `content/reel-media/enrichment-pilot.json`; this does not approve that preview for publication. Reuse requires matching topic and scene/tags for generated images, or matching topic and query for stock. Verify hashes before copying. Do not redistribute stock files as a public standalone stock library. Review the provider license and any applicable subject restrictions for each use.

## Efficiency and failure handling

Use existing local production jobs; add no AI monitoring tasks. Skip local query refinement when all queries are already explicit. Cached assets prevent repeated generation and downloads. Keep only one optional generation attempt per planned slot; do not extend retries indefinitely. On generation or stock failure, record the fallback in the media manifest and inspect the resulting scenes. Repair poor imagery before scheduling. Missing keys or a timeout must not be described as successful enrichment.

Sources: [Pexels license](https://www.pexels.com/license/) and [Pixabay license summary](https://pixabay.com/service/license-summary/). These permit many commercial content uses subject to their restrictions; they are not unlimited rights to all depicted subjects.
