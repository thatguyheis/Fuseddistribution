# Source Fidelity Review Prompt

Use this review before a manuscript moves from `editor-review` to `approved-for-packaging`.

## Inputs

- Source title, author, publication year, and source-edition link
- Source chapter list or lesson map
- Adaptation blueprint
- Current manuscript
- Publishing package draft

## Review Questions

1. Does the adaptation preserve the source's core promise?
2. Does it preserve the source lesson order unless a deviation is explicitly approved?
3. Does each modern chapter map to a source chapter, source parable, or source principle?
4. Does the adaptation add enough original narrative, commentary, framing, or practical application to be differentiated?
5. Does the manuscript avoid copying source phrasing except for short, attributed references?
6. Does the book avoid implying that the original author wrote, endorsed, or collaborated on the adaptation?
7. Does the book avoid real-person, celebrity, brand, trademark, and living-person likeness risks?
8. Does the adaptation preserve character-name lineage through a documented source-aligned cast map?
9. Are parody elements expressed through fictional composite behavior, setting, and status signals rather than direct public-figure references?
10. Does the product description accurately describe what the manuscript actually contains?

## Output

Create a short review report with:

- `source_focus_score`: 1-5
- `differentiation_score`: 1-5
- `marketplace_risk_score`: 1-5, where 5 is highest risk
- `required_fixes`
- `recommended_fixes`
- `publishability_decision`: `block`, `revise`, or `pass`
