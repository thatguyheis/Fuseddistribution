# Local Writer Model Comparison — 2026-07-07

Same pipeline write-article prompt (topic: "Automated Email Sequences For Local Business", tech brand voice, full requirements block), run through three installed ollama models. Judged against the pipeline's own hard requirements.

## Results

| Criterion | gemma3:4b-it-qat (current) | granite4.1:3b | qwen3:4b |
|---|---|---|---|
| Generation time | 129s | 49s | 152s |
| Word count (target 1200-1800) | 1107 (near) | 526 (FAIL) | 811 (fail) |
| Markdown H2 structure | 8 H2s, correct | 5 H2s, correct | 0 — plain-text headings (FAIL) |
| Em/en dashes | 0 em, 14 en (sanitizer handles) | 2 em | 0 |
| AI buzzwords | 0 | 0 | 0 |
| Invented stats | 0 this run (history: fabricates attributions, see polish commit 9e044abf) | 0 | 2 ("cut follow-up time by 70 percent") |
| Other violations | — | Leaked "Reel/Social Source Material" meta sections; fake YouTube URL; recommends dead "Sendinblue" brand | Fabricated Gmail "automation tab" feature; staccato repetitive prose |
| Verdict | Keep as writer | Reject as writer (length), candidate for leaf tasks | Reject |

## QA-gate brain comparison

Ran qa-gate.sh on the same post with each model as judge:

| Model | Wall time | Verdict |
|---|---|---|
| gemma3:4b-it-qat | 148s | score 92, pass |
| granite4.1:3b | 161s | score 92, pass |

Same verdict, no speed win (prompt eval dominates, both ~40 tok/s on this machine). No reason to switch the gate brain.

## Recommendation

1. Keep gemma3:4b-it-qat as writer and QA brain. Neither alternative is a drop-in improvement.
2. Granite's failure is length, not quality — its 526 words were the cleanest style-compliant prose of the three. If Nick wants to retry granite later: add an explicit "write at least 1300 words; short output is a failure" line to the prompt and re-test. Not done now to avoid destabilizing the running pipeline.
3. The real quality ceiling is the model class (3-4B). The recurring fabricated-stat problem (see 9e044abf) is a gemma behavior the QA gate cannot reliably catch; the research.json sourced-stats block plus a factcheck pass is the durable fix, not a model swap.

Raw drafts kept in session scratchpad (not repo): draft-granite4-1-3b.md, draft-gemma3-4b-it-qat.md, draft-qwen3-4b.md.

Sources used for replacement stats in 9e044abf polish:
- https://www.getresponse.com/resources/reports/email-marketing-benchmarks (welcome emails highest open rate)
- https://www.klaviyo.com/blog/abandoned-cart-benchmarks (abandoned cart ~50% open, 3-8% conversion)
