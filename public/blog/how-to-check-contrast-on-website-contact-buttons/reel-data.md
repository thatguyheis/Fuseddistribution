# Check Contrast on Website Contact Buttons

hook: Check Contrast on Website Contact Buttons

## segments
- type: overlay
 text: LIST BUTTON STATES
 narration: Identify the ordinary button appearance and the states shown during keyboard focus, pointer interaction, and any active selection. Include a disabled state only where the form or application actually uses one, and keep its behavior distinct from an available action. Ask the developer which styles are applied in each state. A single screenshot can miss the point where the wording becomes difficult to distinguish from its background.
- type: overlay
 text: RECORD ACTUAL COLORS
 narration: Have the developer identify the rendered foreground and background colors, including opacity or a layered background that changes the result. Use a contrast measurement tool to record the relevant pair and the measured result. Keep the font size and weight with the observation so the appropriate text requirement can be assessed. Do not substitute a guessed color from a compressed screenshot when the actual style values are available.
- type: overlay
 text: APPLY RELEVANT GUIDANCE
 narration: W3C distinguishes text contrast requirements by text size and includes specific exceptions. Ask the person reviewing accessibility to apply the relevant requirement to the actual button rather than choosing a convenient threshold. Keep text contrast, the visibility of the control boundary, and keyboard focus appearance as separate questions. A pass on one question should not be copied into the other fields without checking their different purposes.
- type: overlay
 text: RETEST THE COMPONENT
 narration: Agree on a change that keeps the contact action recognizable within the brand, then test the deployed component again in each recorded state. Follow the button to its intended destination as part of the check. If it appears on several page templates, include examples with different backgrounds. Record the final measured result and any remaining issue instead of closing the task merely because the color token changed in the design file.

## question
Which page will you check in your next website review?
