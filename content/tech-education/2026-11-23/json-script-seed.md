# AI output that an automation can accept

Status: sourced narration seed for tonight's package preparation, not a render-ready script. Preserve the first and last lines verbatim. Complete the normal scheduled duration, segment/asset mapping and all production checks at preparation.

Your AI answer looks right. Will your automation accept it?

I want one contact record, with a name and an email field. A person can read an answer that starts with "Here is your contact." My JSON parser rejects that extra sentence before the object.

These are hand-written teaching samples, not captured AI mistakes. In our actual Python check, the sample wrapped in prose fails to parse.

Removing that sentence is only the first check. Another sample parses correctly but has no email field. A third parses but puts a number where this workflow requires a string.

The fourth sample has both required fields as nonempty strings. It passes this small contract. That does not prove the email address exists, that its owner agreed to messages, or that every value is accurate.

I show two decisions in the flow: can the parser read it, and does it meet the next step's requirements? Keep a failed record out of the sending step and show the reason.

AI can help draft structured information. The next action still needs an explicit input contract and a real check.

Validate one sample before connecting the next step.

## Visuals

- Frame zero: exact full hook plus labeled synthetic record and parser result. No blank intro.
- Actual four-case result table from evidence/json-contract-results.json, labeled hand-authored synthetic fixtures.
- Decision flow: parse, required fields/types, approved next step or hold. Distinct from the result table.
- Small code excerpt and source URL; no fabricated model interface.
- Purposeful restrained transitions and two cleared sound accents in body beats, away from hook and CTA.
