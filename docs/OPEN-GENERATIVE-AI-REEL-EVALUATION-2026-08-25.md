# Open Generative AI Reel Evaluation - 2026-08-25

## Decision

Approve the local provider for one new controlled, topic-matched atmospheric
background per reel. Pair it with one different, previously approved image from
the tagged local Fused background library. Do not use generated assets for
products, facts, charts, readable content, people, or complete reel generation.

## Evaluated Components

- Open Generative AI source revision: `c90e908`
- Local engine: `stable-diffusion.cpp` Metal build `44cca3d`
- Model: DreamShaper 8, CreativeML OpenRAIL-M
- Hardware: Apple A18 Pro with 8 GB unified memory
- Production composition remains Remotion at 1080 by 1920

## Results

| Profile | Runtime | Result |
|---|---:|---|
| 256 by 448, 2 steps | 16.68 seconds | Completed, but too underdeveloped to use |
| 512 by 896, 12 steps | More than 300 seconds | Timed out before output |
| 384 by 640, 8 steps | 179.10 seconds | Completed, but failed visual QA |
| 384 by 640, 8 steps, controlled vault background | 166.06 seconds | Passed background-only visual QA |

The eight-step output had a usable dark metallic palette, but it invented
pseudo-lettering and malformed coin-like details even though the prompt
explicitly prohibited text, numbers, logos, and exact branded coin designs.
Blurring and darkening reduced the defects but did not remove them reliably.

The follow-up profile removed raw narration from the prompt, routed the topic
to a controlled scene, prohibited factual foreground objects, and applied a
deterministic crop, blur, darkening, desaturation, and vignette. Its vault and
collector-chest result had clean caption space and no pseudo text or logos. It
is suitable as soft-focus B-roll, but not as a faithful depiction of coins.

## Viability Boundary

The provider is approved only for abstract textures and atmospheric
backgrounds produced by the controlled routing profile. It is not reliable for:

- exact coins, bars, products, logos, or branded objects;
- factual diagrams, charts, numbers, or comparisons;
- unattended generation beyond one hook background per reel;
- generated video on this Mac.

The 11 AM worker enables this constrained production profile. Accepted new
images are deduplicated by SHA-256 and stored with topic, scene, subject tags,
provenance, and usage metadata. A second narrative segment draws from a
different matching library asset, with recent and frequent choices penalized.
Generation and library reuse are fail-soft: a timeout, unavailable runtime,
invalid license record, empty library, or other error immediately returns media
selection to the existing local, Pixabay, and Pexels path.

Git stores the adapter, prompt policy, tests, and provenance. Model weights,
engine binaries, and test renders remain outside Git. Normal local, Pixabay,
and Pexels media selection continues when shadow generation is disabled,
unavailable, slow, or rejected.
