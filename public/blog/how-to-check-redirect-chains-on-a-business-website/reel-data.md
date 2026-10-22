# Redirect chain audit

## hook
Trace old website URLs to the page visitors need.

## segments
- type: overlay
 text: LIST IMPORTANT OLD LINKS
 narration: Start with the important links in your menu, contact page, booking flow, and service pages. Add old addresses from a sitemap or Search Console if you have access. Make a table with the old URL, the page it should reach, and your test result. Include the full address and keep private customer details out of the list.
- type: overlay
 text: TRACE THE FINAL DESTINATION
 narration: Open an old address in a private browser window and record where it ends. For individual URLs, Google's URL Inspection tool can help test the address. If your administrator can see request details, ask them to list each redirect destination. A path from old page to middle page to final page has an avoidable hop if the old page can go straight to the final one.
- type: overlay
 text: SPOT LOOPS AND ERRORS
 narration: Watch for an address that repeats or never finishes loading. That suggests a loop. A not-found response is different from a redirect that reaches a useful replacement. Write down the exact result, and do not send unrelated old links to the homepage. Choose a destination that genuinely covers the original page.
- type: overlay
 text: REQUEST A DIRECT FIX
 narration: Give your web administrator the old-to-final map. Ask them to remove avoidable hops, correct loops, and test the final destination. For permanent moves, Google recommends a server-side permanent redirect when technically possible. The right response depends on the change, so have your administrator confirm it before editing rules.

## question
Which important old URL will you check first?
