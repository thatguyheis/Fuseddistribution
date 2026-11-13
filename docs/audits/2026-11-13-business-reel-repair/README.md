# Overnight package failure and visual repair

The Nov 13 runner attempted all three approved topics. Two scripts ended with an imperative inside a required QUESTION segment. All three presentation plans omitted numeric shot weights. These deterministic defects passed the former handoff gate because it checked source hashes, scene counts and assets without running the full renderer validators. No final MP4s were produced by that overnight run.

Preparation also recorded local QA as passed even though the minimal article HTML lacked the normal schema, article body container, internal links and custom graphic. Actual local QA exposed these defects during repair.

## Changes

- Handoff approval now runs the renderer's repaired-script validation, including its final spoken question rule.
- `validatePresentation` is shared by read-only preflight and staging. Missing or invalid weights, labels, scene counts, safe zones and hashes fail before consuming a render attempt.
- New business approvals run real local blog QA into a separate state report. The normal deterministic HTML builder replaces minimal hand-written pages.
- A failed package with a newly approved source fingerprint can retry once within the same daily/window/lease/circuit limits. Unchanged failures cannot loop automatically.
- Business visual quality v2 requires multiple explanatory graphics in different forms and reserved scenes. Numeric charts retain source/unit/period checks; percentage pies must total 100. Example arithmetic is labeled and explained, never called audience evidence.
- Removed the default decorative target-circle artwork. The repaired packages use three meaningful visual beats apiece, including an example pie or bar comparison, flow and final review table.
- Both existing Luna automations retain their model, reasoning and schedules. Their prompts now require these checks and repaired handoffs, and omit obsolete incident instructions.

## Verification

122 video tests and 18 queue tests passed before the supervised recovery run. Regression coverage includes invalid closing questions at handoff, missing shot weights in read-only validation, changed versus unchanged recovery fingerprints, numeric pie validation and absence of the circle fallback. All three real packages passed deterministic blog QA, approved-sources and the dated handoff. Source contact sheets were inspected before serial production.

Encoded output and release results are recorded separately per topic in `video/out/<slug>/` and the production ledger. A source pass is not a completed render or publication claim.

## Encoded review follow-up

The first supervised export passed automated structural checks, but encoded inspection found a header divider crossing a three-line hook and one adjacent repeated caption word. The export was explicitly marked blocked. The source generator now omits that divider, caption QA sends unexpected adjacent repeats to independent small.en recognition, and release checks the final caption text again. It never silently deletes words to hide possible repeated speech. Recognition comparison also normalizes curly versus straight apostrophes to avoid rejecting an otherwise identical closing question. Follow-up video tests: 125 passed. Replacement encode and actual final verification remain required.
