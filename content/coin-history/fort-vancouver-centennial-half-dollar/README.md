# Current revision: approved history narrative

The user approved the 296 word revised transcript on October 14, 2026. The current production uses all three supplied reference images and both retained AI fort plates across 19 shots. See narration-v2-approved.txt, owner-supplied-fort-images/manifest.json, and revision-v2-status.json. Original source attribution for the supplied images is not recorded; no public stock rights are inferred.

Delivery is 720 x 1280 at 30 fps, with an explicit final byte check below 50,000,000 bytes. The finalizer targets 45 MB or less and preserves the pre-mastering encode. The approved closing is retained verbatim rather than adding a question. The previous presentation, metadata, article source and audio are retained in archive-v1/.

The following notes describe the archived first version; production-status.json identifies the final current file and checks.

# Fort Vancouver presentation reel

Local sales presentation. Publication and scheduling are separate from this deliverable.

## Creative treatment

A 17 shot portrait film connects the company name visible on the owner's coin photograph with the fort's history. The edit combines coin details, two generated timber palisade illustrations, two licensed modern stock clips, date graphics, measured captions and a restrained music bed. Titles clear before the next title appears during image dissolves. The hero is the opening frame.

The US Mint and National Park Service sources are recorded in research.json and claim-map.json. The fort plates are visibly identified as illustrations, not exact reconstructions. Stock footage is labeled modern illustrative material. The PCGS MS63 statement describes the photographed holder; certification was not independently checked. No claim is made that the two photos show the same specimen.

## Media and generation

- Owner originals: Coin Raw/IMG_5735.jpeg and IMG_5736.jpeg, catalog entries coin-0031 and coin-0032. Source geometry is preserved with deterministic crops described in crop-plan.json.
- Accepted generated assets: generated/presentation-exterior.png and generated/presentation-courtyard.png. Built-in image generation; source size 941 x 1672. Prompts: generated/presentation-exterior-prompt.txt and generated/presentation-courtyard-prompt.txt. Library registration and hashes: generated/presentation-*-library.json.
- Local generation was tested. The high resolution attempt exceeded available runtime/memory; the smaller successful candidate resembled a modern cabin and was rejected. It is preserved as generated/palisade-exterior.png with the rejection recorded alongside it.
- Licensed modern supporting clips: stock/river.mp4 and stock/woodcraft.mp4. Source pages, creators, license URLs and hashes are in their matching JSON files. They do not depict Fort Vancouver.
- Music: Lukewarm Hazy by Asher Fulero, user supplied YouTube Studio Audio Library download and recorded license. No attribution required under the supplied license.

## Output and checks

See production-status.json for final state and exact master hash. The canonical master is video/out/fort-vancouver-centennial-half-dollar/fort-vancouver-centennial-half-dollar.mp4 from the repository root.

Picture: 1080 x 1920, 30 fps, H.264 CRF16 with slow encoding and PNG intermediate frames. Audio: lossless Chatterbox Nano narration inputs, then two-pass loudness mastering with AAC 320 kbps target at 48 kHz. The original unmastered encode is retained. Whisper small.en uses pinned local weights and observed word timestamps. Proper-name text corrections retain the original timestamps and raw ASR results.

Inspection artifacts are under video/out/fort-vancouver-centennial-half-dollar/review. The first review led to a title-transition timing refinement; that version is retained separately. Final visual approval must match the canonical MP4 hash.

Pipeline checks: 73 video tests and 5 caption tests passed. Application type checking with skipLibCheck passed. Unfiltered type checking has pre-existing WebCodecs/Timer dependency declaration conflicts.

## Local player

Run `python3 content/coin-history/fort-vancouver-centennial-half-dollar/serve-preview.py` from the repository root and open http://127.0.0.1:8790/. The server supports byte ranges for seeking. The page includes the MP4 download and companion draft article.
