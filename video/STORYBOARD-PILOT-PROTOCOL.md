# Storyboard pilot protocol

This is a testing route only. It does not replace `REEL-SOP.md`.

## Visual quality gate

Every pilot reel must use at least four visual roles, including:

- one paper collage or tactile analogy beat;
- three data or process boards when the narration contains measurable claims;
- one standard production card for continuity with the existing reel system;
- one closing question or action beat.

Generic photo cards may not appear consecutively.

## Chart clarity gate

Do not render a chart unless the storyboard provides all of the following:

- a title that states what is being compared;
- a subtitle that explains why the comparison matters;
- an axis or unit label, such as `USD PER TROY OUNCE`;
- a visible `xAxisLabel` naming the horizontal dimension and a visible `yAxisLabel` naming the vertical measure for every line or bar graph;
- category labels that identify every bar, slice, or plotted point;
- values paired to those labels;
- a source note and date or historical period in the source metadata;
- a plain language `READ THIS` takeaway;
- no more than eight labels in a portrait frame.

Pie and donut visuals do not use Cartesian axes. They must display the measured
quantity as a visible measure label and include a legend that pairs every slice
with its value. A chart with a missing, generic, or ambiguous axis/measure label
fails review even when its values are accurate.

## Local generated asset reuse

The local generated background library at
`video/local/generated-backgrounds/` is a governed asset pool, not an anonymous
cache. Before generating a new background, search for an approved asset with the
same topic, scene, and compatible tags. Reuse the best matching asset first,
then generate only the missing or intentionally varied visual roles.

Every reusable asset must have a catalog entry with a stable content-hash ID,
topic, scene ID, descriptive tags, source slug and segment, prompt hash, model
and license, treatment, approval status, creation time, last-use time, and use
count. A reused asset must carry its `libraryAssetId`, tags, SHA-256, source
slug, and `fused-generated-background-library` source into the reel media
manifest. Never reuse an asset across topics or use an asset whose file hash,
license, or approval status cannot be verified.

Each run should record three decisions per planned generated slot: `reused`
with the asset ID, `generated` with the new asset ID and provenance, or
`fallback` with the reason. Prefer one new hook or focal asset plus reused
narrative backgrounds, exclude the last four recently used assets when an
equivalent alternative exists, and allow a new generation when no approved
match exists or when the storyboard calls for a deliberate contrast. Human
review still approves visual fit; reuse reduces generation work but does not
skip visual QA.

If the narration does not provide enough trustworthy data, use a process diagram or paper analogy instead of inventing a chart.

## Stock photo pairing rule

Stock photography should establish setting, human context, or emotional contrast. It should not be used as the only visual for a numerical claim. When a claim is measurable, pair the photo with a chart, diagram, or large numeric treatment that states the unit and comparison.

## Review checklist

Before a pilot render is approved, inspect each segment at full size and ask:

1. Can a viewer name the subject of the visual without hearing the narration twice?
2. Can the viewer identify the unit and comparison within two seconds?
3. Does the visual add evidence, context, or a memorable analogy?
4. Is the takeaway visible without competing with the caption layer?
5. Does the sequence alternate visual texture while preserving one narrative arc?

The planner and test suite enforce the structural parts of this protocol. Human review is still required for legibility, factual interpretation, and creative quality.
