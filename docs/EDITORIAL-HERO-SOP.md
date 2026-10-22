# Editorial hero quality standard

Effective October 1, 2026. Protocol: FD-HERO-GRAPHIC-V2. Required for every new article and newly designed replacement hero. This supersedes the September 11 connected-card recipe, FD-HERO-DIAGRAM-V1.

## Required visual

Every hero must contain a meaningful, topic-specific illustration, explanatory diagram or evidence-backed chart, paired with a concise, truthful hook and relevant key words. A title on a background, decorative shapes, or three/four boxes containing words is not finished artwork. Renaming the boxes or adding generic icons does not meet this standard.

The visual must communicate part of the article without relying on its headline. Use a recognizable subject or a real explanatory relationship: an invoice paired with a silver coin, an annotated interface, a route map, a component cutaway, a decision path with meaningful branches, or a sourced comparison chart. Cards may support the composition but must not be its only content. Match the graphic to the article rather than forcing each topic into one layout.

Owner-selected references:

- `public/blog/silver-bullion-invoice-checklist-for-your-records/hero.jpg`: invoice and coin illustration with a short records-related hook. Reuse the principle of a clear subject, not the same illustration for unrelated topics.
- `public/blog/apple-maps-business-listing-how-to-claim-it/hero.jpg`: reference for including a graphic/chart in the composition, not authorization to reuse its figures or scale. The local image mixes counts and percentages; do not reproduce that comparison. Verify data independently for each new chart.

These references establish editorial preference, not measured engagement improvement. Preserve historical artwork unless a repair is separately requested.

## Creation workflow

1. Read the source-checked article and select one useful takeaway. Write a visual brief naming the subject, what the picture explains, visual type, three to seven word hook where practical, and one to three relevant key words. Avoid keyword stuffing, full article titles as the entire design, and unsupported promises.
2. Choose an illustration or conceptual diagram when the article has no suitable numerical evidence. Use a chart only when numbers genuinely explain the topic. Never invent data just to fill the hero.
3. Create a distinctive composition with one dominant focal subject and visual hierarchy. Use Fused Distribution branding, dark navy and cyan #58d6ff where appropriate, strong contrast, readable type and generous spacing. Vary composition across recent covers instead of repeating a grid. Keep supporting labels short.
4. Prefer locally authored, editable SVG for diagrams and charts; keep source and exported JPEG together. Use the existing rasterization path and article asset dimensions. A generated template from `public/blog/scripts/build-svg.mjs` is a draft only, even if it exports successfully. The publishing owner must replace or enrich inadequate output before approval. Do not overwrite reviewed custom art by rerunning the generic builder afterward.
5. For charts, record source URLs, dates, values, units and calculations in the review evidence. Compare like units on a consistent, labeled scale. Preserve negative signs, denominators and necessary context. Do not plot counts and percentages as comparable bars or omit values solely to make a stronger claim. Label conceptual illustrations as such where confusion is likely. If data cannot be verified, use a nonnumeric graphic.
6. Inspect the actual final JPEG at full size and at approximately 360 pixels wide. Inspect its real 360 by 640 portrait reel placement as required by `docs/REEL-OPENING-SOP.md`. Revise cramped text, clipping, weak contrast or a graphic too small to understand. Adapt square artwork independently rather than stretching the landscape hero.
7. Record the visual review below and bind editorial approval to the final artifact hashes. Any later artwork edit invalidates that review and requires renewed approval and affected reel/hosted derivative checks.

## Required editorial review evidence

Store this in the article's existing artwork QA or editorial review record; use FD-HERO-GRAPHIC-V2. This is an owner review requirement, not a claim that the current renderer can automatically judge design quality.

- Visual brief: subject, explanatory purpose, visual type, hook and key words.
- Specificity: what the image communicates beyond its words, and why it fits this article.
- Evidence: chart sources, units, values and scale checks, or `not applicable: nonnumeric graphic`.
- Actual export and preview paths; final hero SHA-256; reviewer and review timestamp.
- Pass/fail for topic specificity, useful graphic, truthful hook, phone readability, no clipping, contrast, and variety relative to recent covers.
- Overall verdict and any repairs. Missing evidence or a failed item means revise before editorial approval, publication or scheduling. An automated file-existence or hash check cannot override a failed visual review.

Reject title-only art, generic text-card grids, decorative pseudo-charts, unrelated illustrations, invented statistics, and unreadable phone previews. The publishing owner is responsible for completing the graphic; a missing suitable chart is not permission to publish a basic fallback.

## Cost and scope

Reuse drawing primitives, fonts and export tools, but design the subject and composition for the actual topic. Do not add model calls or regenerate approved assets merely for novelty. Record this as owner preference; performance promotion still requires the existing comparable-sample evidence. Apply prospectively without a bulk historical rerender.
