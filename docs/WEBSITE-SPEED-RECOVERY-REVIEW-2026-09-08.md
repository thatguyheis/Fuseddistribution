# Website speed recovery review

Queued topic: `how-to-speed-up-your-small-business-website`, August 4.
Status: source and overlap review completed; replacement and publication pending. No public artifacts changed.

Read the preserved timeout candidate in full. It repeats generic sections and makes unsupported claims of 7% conversion loss per second, a 40% hosting difference observed by Fused, 50% abandonment, $400 monthly losses and a contradictory claim that loading under three seconds reduces conversions by 20%. Its Statista attribution has no supporting research file. Do not resume this prose as approved input or merely remove the named attribution to pass lint. Preserve the timeout candidate.

## Existing coverage

Read the complete Markdown for `website-speed-and-local-business-ranking` (August 7), `website-speed-for-local-business-why-it-matters` (August 3), and `mobile-website-speed-why-it-matters-for-local-business` (June 25). Inspected substantial sections of the May 31 HTML-only `website-speed-local-business`; complete review of that page remains required before selecting it for correction.

The August 7 page substantially covers the missing topic's tests, images, caching, hosting and third-party scripts, but contains unsupported ranking and traffic percentages, a false score classification and indiscriminate lazy-loading advice. The August 3 article repeats unsourced conversion and abandonment statistics. The June 25 page repeats generic acquisition advice rather than a practical speed workflow, and incorrectly implies speed is a prerequisite for Maps visibility. None can currently close the missing topic as approved equivalent coverage.

Prefer a fully corrected existing article if its final scope covers the missing practical guide. Candidate: August 7 `website-speed-and-local-business-ranking`. Preserve original date and add actual correction date. Decide after full replacement review; do not register canonical equivalence until hash-bound live proof. Record other affected live articles as separate editorial work, never silently count them fixed.

## Primary sources checked September 8

- [Google PageSpeed Insights documentation](https://developers.google.com/speed/docs/insights/v5/about): distinguish controlled Lighthouse diagnostics from trailing 28-day field data, and page data from origin fallback. Missing field data is not a failing measurement. Lab scores below 50 are poor, 50 through 89 need improvement, and 90 or above are good. Do not label every score below 80 poor.
- [Google LCP optimization guidance](https://web.dev/articles/optimize-lcp): identify the actual LCP element and its delays; do not lazy-load the LCP image. Early discovery and priority matter as well as transferred bytes.
- [Google page experience guidance](https://developers.google.com/search/docs/appearance/page-experience): Core Web Vitals are used in ranking, but good scores do not guarantee top placement. Do not turn this into a fixed ranking weight, a universal traffic effect or a Maps eligibility rule.
- [MDN HTTP caching guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching): distinguish browser and shared caches; personalized responses need appropriate controls. A cookie alone does not make a response private. Do not recommend caching every page or treating a generic hosting toggle as a complete policy.

## Replacement requirements

Lead with an actionable baseline and prioritize actual diagnostics. Separate rendering, interaction and layout movement. Label any example as hypothetical; omit unsourced business uplift. Explain image dimensions and quality checks, prioritize the actual LCP image, inspect unused scripts without breaking booking/contact flows, and evaluate caching and origin latency from evidence before recommending purchases. Recheck the same pages and conditions after each scoped change. Keep a dated change log and verify business functions alongside performance.

Next action after LLC recovery and production availability: choose the canonical correction, preserve all original artifacts, write the full replacement and synchronized companions, complete QA/artwork review, deploy only the approved slug and verify live content/catalog/sitemap before resolving the missing queue entry.


12:43 Pacific: prepared a complete 1,589 word replacement candidate at `.workflow-state/website-speed-correction-candidate-2026-09-08.md`, with hash and local internal-link checks in `.workflow-state/website-speed-review-checkpoint-2026-09-08.json`. It replaces unsupported business statistics with an evidence-based diagnostic workflow, distinguishes lab/field data, protects the LCP image from lazy loading, and scopes caching correctly. Proposed correction target remains the August 7 ranking article, preserving its original date. Final artifact/editorial checks and deployment remain pending; no equivalence approved.
