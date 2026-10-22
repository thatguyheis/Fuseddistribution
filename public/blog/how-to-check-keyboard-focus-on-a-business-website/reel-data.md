# Check Keyboard Focus on a Business Website

hook: Check Keyboard Focus on a Business Website

## segments
- type: overlay
 text: START AT ENTRY
 narration: Open the page in a fresh browser tab and begin navigating with the keyboard. Watch the visible indication as focus moves between links, buttons, and form controls. If the browser or operating system requires a keyboard navigation setting, record that setting with your test. Do not assume an element is inaccessible until you have confirmed the setup and repeated the same movement carefully.
- type: overlay
 text: RECORD LOST FOCUS
 narration: When you lose track of the selected control, stop and write down the last element you could identify. Record the keys used immediately before the problem and whether scrolling changed the visible area. A report that says the menu is broken gives a developer little to reproduce. A short sequence, starting at a named link, is much more useful than a long list of guesses.
- type: overlay
 text: TEST CONTACT FLOW
 narration: Follow the route through the menu to a service page and its contact action. Check whether you can identify the selected control after opening a menu or dialog. If the interaction gets stuck, record the exact state rather than using the mouse to silently continue the test. Keep form testing separate from sending a real enquiry, and agree on any submission test with the site owner first.
- type: overlay
 text: REPORT THE STEPS
 narration: For each issue, save the starting URL, the movement sequence, the expected control, and what was visible instead. Include a screenshot where it helps show the missing or obscured indicator. Ask the developer to check both the focus styling and the interaction that moved focus. Do not solve the report by removing outlines simply because they differ from the visual design used with a mouse.

## question
Which page will you check in your next website review?
