# Chatterbox voice comparison, September 30, 2026

Three same-text samples use the same voice reference, CPU device, two threads, 140-character chunk limit and random seed per chunk. Standard uses exaggeration0.4/CFG0.5; Nano uses its production settings0/0. Fresh isolated audio caches were used. Production configuration was not changed.

| Model | Completed samples | Wall time including startup | Audio length | ASR word error | Full-scale samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| standard | 3/3 | 354.7s | 28.8s | 0.0% | 1 |
| nano | 3/3 | 125.0s | 25.0s | 0.0% | 0 |

Timings reflect the current Mac with other workloads and substantial swap use. They are not an isolated hardware benchmark. One standard sample touched the PCM full-scale threshold; that alone does not establish audible distortion. ASR errors can be recognition mistakes; they do not directly measure voice quality. This small single-seed test cannot establish long-form reliability or a perceptual winner.

## Listening comparison

The listening copies are adjusted by a constant gain toward -23 LUFS with peak headroom. No denoising, pitch change, tempo change or dynamic compression was applied. Judge naturalness, likeness to the reference voice, pronunciation, emphasis, pauses and artifacts. A=standard; B=Nano.

### Website

Before you publish a website update, test the journey your customer will take. Does the booking button open the right page, and does the confirmation arrive?

A: Standard Chatterbox

![A](/Users/nick/projects/fuseddistribution/.workflow-state/tts-quality-2026-09-30/website-A.wav)

B: Chatterbox Nano

![B](/Users/nick/projects/fuseddistribution/.workflow-state/tts-quality-2026-09-30/website-B.wav)


### Silver

Keep original silver coin packaging with its purchase records. A careful inventory helps you match each item to its receipt without touching the coin.

A: Standard Chatterbox

![A](/Users/nick/projects/fuseddistribution/.workflow-state/tts-quality-2026-09-30/silver-A.wav)

B: Chatterbox Nano

![B](/Users/nick/projects/fuseddistribution/.workflow-state/tts-quality-2026-09-30/silver-B.wav)


### Question

A generated review reply is not a published reply. Read it, check the details, and approve it before posting. What would you change?

A: Standard Chatterbox

![A](/Users/nick/projects/fuseddistribution/.workflow-state/tts-quality-2026-09-30/question-A.wav)

B: Chatterbox Nano

![B](/Users/nick/projects/fuseddistribution/.workflow-state/tts-quality-2026-09-30/question-B.wav)

## Decision

Historical decision as of September 30: keep Nano until a complete Standard reel is reviewed. Superseded October 15 after Nick reviewed the complete Silver Dollar Roll Hoards reel and requested the more natural Standard voice despite longer local generation. The production pin and settings now live in `video/tts-runtime.json`; the original comparison remains historical evidence and is not the current production selection.

Official model reference: [Resemble AI Chatterbox](https://github.com/resemble-ai/chatterbox). Vendor model size and speed claims are not evidence that either sample sounds better.
