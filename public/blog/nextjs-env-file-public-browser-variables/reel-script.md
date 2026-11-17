# Reel Script: nextjs-env-file-public-browser-variables
format: fused-tech-short-v1

## Segment 1
Narration: Your API key is hidden in .env. Why can visitors still see it?

## Segment 2
Narration: I built a Next.js example with dummy values. No real credentials or customer data were used.

## Segment 3
Narration: One variable used the public prefix. The other stayed server only. I inspected the built browser JavaScript.

## Segment 4
Narration: The public marker appeared in a browser file. The server marker did not appear in the browser files I checked.

## Segment 5
Narration: In Next.js, the public prefix asks the build to include that value in code sent to visitors.

## Segment 6
Narration: A private credential behind that public name would not stay secret. Visitors receive the browser code.

## Segment 7
Narration: I keep private credentials on the server and send the browser only what the feature needs.

## Segment 8
Narration: That does not replace authorization checks. Moving a key does not automatically secure a server endpoint.

## Segment 9
Narration: So the filename is not the boundary. What matters is where the value ends up.

## Segment 10
Narration: Check which variables your website sends to visitors.

