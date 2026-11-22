# Reel Script: ai-answer-json-validation-before-automation
format: fused-tech-short-v1

## Segment 1
Narration: Your AI answer looks right. Will your automation accept it?

## Segment 2
Narration: My next step needs a contact name and email. A readable answer still has to meet that input contract.

## Segment 3
Narration: These four samples are handwritten teaching data, not captured mistakes from an AI model.

## Segment 4
Narration: The first puts a sentence before the data. Python rejects it as invalid JSON, before checking the fields.

## Segment 5
Narration: The second is valid JSON but has no email field. Parsing successfully does not make the record complete.

## Segment 6
Narration: The third puts a number in the email field. Our small contract requires text that is not blank instead.

## Segment 7
Narration: The fourth supplies both fields as strings. It passes these checks, so the workflow can consider the next step.

## Segment 8
Narration: That does not prove the email address exists, the information is accurate, or the person agreed to messages.

## Segment 9
Narration: Check the format, then the required fields and types. Hold failed records and show a useful reason.

## Segment 10
Narration: Validate one sample before connecting the next step.

