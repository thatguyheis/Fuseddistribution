# Reel quality and automation audit

Reviewer: GPT-6.1 Sol. Scope: production SOP, installed assets, two recent AI reels, overnight business run and Luna schedules.

## Verified findings and repairs

| Finding | Evidence | Repair |
|---|---|---|
| Uploaded effects were never mixed | 18 approved files exist in sound-effects-rights.json and private-audio; BlogReel had no SFX component | Rights/hash checked staging, quiet timed cues and an enrichment layer now feed render props and version 3 release checks |
| Presentation route suppressed transition variety | BlogReel selected fade whenever presentation props existed | Both routes now use existing semantic slide/wipe/fade choices; overlap timing stays unchanged |
| Instructions requested graphics without proof the final composition used them | Storyboard metadata can describe a route bypassed by PresentationScene | A hashed enrichment plan supplies a visible explanatory flow/table/bar overlay independently of either media route |
| Caption coverage passed an extra ending | Remotion captions segment 6 contains “Oh, my God.” outside the approved CTA; previous release passed | New render/release ending-text check rejects extra words. Existing published file needs a corrected overnight render; no historical social send is claimed repaired |
| Business presentation depended on an unrelated coin folder | stagePresentation unconditionally realpathed content/coin-history/<slug> | Only include the coin path when it exists; no sentinel directory required |
| The 02:00 run failed before either pair | Nov 4 report: writer interrupted after no-output polls, exit 141, no verified.md; second topic unstarted | Business Luna runbook writes directly with GPT, preserving drafts and advancing independent second-topic stages. Report proves interruption, not an inference-engine hang |
| Recovery scheduling and prompts grew contradictory | Daily 23:05 job plus exhausted 02:00 COUNT=1 job; duplicated dates, voice settings and source rules | One recurring 02:00 Luna owner with compact runbook and ledger priorities; old one-off retired from future work |
| Existing files were wrongly suspected oversized | Remotion 5,863,813 bytes; Chatterbox 6,109,485 bytes; hosted byte counts matched | Keep exact-file size/URL evidence; do not transcode an already compliant asset merely because another service reports a different file |

Selected-sound inspection also found that the first 0.4 seconds of the registered cartoon thunk are nearly silent (mean -80.8 dB). The renderer now decodes and measures the selected trim before synthesis, rejects silent/inaudible excerpts and bounds gain using measured mean and peak. The demonstration uses 1.88s into that source instead. Coin intake selects the audible 6s coin-handling excerpt.

## Limits and follow-up

The registered sounds are real user-supplied assets; several are contextual ambience or weapons/traffic and should not appear in unrelated software education. Asset presence establishes neither relevance nor quality. Selected excerpts require listening and final mix review. No external transition pack was identified in the inspected project directories; installed Remotion transition implementations already existed but were bypassed in presentation mode.

The repository contains pre-existing untracked Whisper draft/status files and a voice-reference MP3; this audit does not stage or delete them. The full TypeScript check reports dependency declaration conflicts in DOM WebCodecs and Remotion Timer types. Application checking with skipLibCheck isolates these external errors; dependency upgrades are separate work.

No claim of improved retention is supported yet. Compare matched platform/duration cohorts after meaningful watch-time and engagement samples. This change establishes a measurable quality floor, not a view guarantee.

## Validation

Seventeen targeted tests passed for source approvals, asset staging, silent excerpt rejection, ending hallucinations, missing coin-folder regression, storyboards and transition timing/names. Application TypeScript checking passes with dependency library checking excluded; full checking still reports the external declaration conflicts described above. A 6.42-second encoded preview with the new graphic and audible-source cue was rendered; its graphic was visually inspected. This is a bounded composition demonstration, not a release approval for either complete reel. Full listening and final-file QA remain required in production.

The recurring Luna owner is active at 02:00 Pacific, with its next run Nov 5; the exhausted one-time job is paused. The saved recurring prompt decreased from 459 to 114 words. This measures prompt text only, not total inference usage. Unfinished BG-D010/BG-D011 and the Whisper/Buffer pair remain explicitly queued; the Remotion caption correction remains an outstanding quality repair.
