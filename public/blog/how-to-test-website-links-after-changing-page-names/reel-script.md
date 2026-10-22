# Reel Script: how-to-test-website-links-after-changing-page-names
format: long-form
segments: 6
target-duration: 120s

---

## HOOK

**Visual:** New page name. Same journey?
**Duration:** 17s minimum

Narration: After changing a page name, test the links that visitors actually use to reach it. Check the visible label, the address it opens, the destination content, and the next action. Changing a menu label and changing a URL are separate edits, so first establish which one happened before deciding what needs repair.

---

## OVERLAY: LIST NAME CHANGES

**Visual:** List name changes
**Duration:** 16s minimum

Narration: Write the previous page name beside the new one and record the intended address. Ask whether the edit changed only the text visitors see, the page title, the URL, or several of these. A note that says renamed services is too vague for someone else to test reliably.

---

## OVERLAY: TEST ACTUAL DESTINATIONS

**Visual:** Test actual destinations
**Duration:** 32s minimum

Narration: Open each recorded link from its actual position on the site. Read the address bar when loading finishes, then check the heading and main content. A page that opens successfully can still be the wrong destination. Record an unexpected homepage or unrelated service as a failed intent check even if no error appears. Use a simple set of result fields: starting page, link label, expected address, observed address, content match, and next action. Copy the full address instead of describing it from memory. Keep an error screenshot when useful, but include the text of the failure so the record remains searchable.

---

## OVERLAY: CHECK PHONE NAVIGATION

**Visual:** Check phone navigation
**Duration:** 18s minimum

Narration: Repeat the important journeys on a phone. Open and close the menu, select the renamed page, and return to the previous screen. Test a link after scrolling as well as at the top of the page. Watch for a menu overlay that remains open or a preview area that captures touch gestures intended for navigation.

---

## OVERLAY: REVIEW LINK TEXT

**Visual:** Review link text
**Duration:** 14s minimum

Narration: Google's link guidance recommends crawlable anchor links with an href and descriptive link text relevant to the destination. Ask your developer to inspect the underlying link when a control looks like a link but behaves inconsistently. Appearance alone does not verify the markup.

---

## QUESTION

**Visual:** New page name. Same journey?
**Duration:** 19s minimum

Text: Which renamed page link will you test on your phone?
Subtext: COMMENT BELOW
Narration: After repairs, repeat the original failing journeys rather than testing only the new page directly. A direct visit skips the link that may still be wrong. Keep the earlier failure beside the new result so another person can see what was fixed and what evidence supports closing the task. Which renamed page link will you test on your phone?
