# Reel Script: deleting-a-leaked-api-key-does-not-revoke-it
format: fused-tech-short-v1

## Segment 1
Narration: You deleted the leaked API key. Why can it still work?

## Segment 2
Narration: Removing a key from a document changes that document. It does not automatically invalidate the credential at its provider.

## Segment 3
Narration: This is a local teaching simulation with a dummy token. No real account or production credential is involved.

## Segment 4
Narration: The simulated request succeeds before removal. It still succeeds after the document copy is cleared, because the registry still accepts it.

## Segment 5
Narration: When the simulation revokes the token in that registry, the same request is denied. Removal and revocation are different actions.

## Segment 6
Narration: For an actual exposure, follow the provider instructions to revoke or rotate the credential. GitHub recommends doing that first.

## Segment 7
Narration: Update authorized services that need a replacement, then check that they work and the exposed credential no longer grants access.

## Segment 8
Narration: Review the affected logs and copies without pasting the secret into another chat or screenshot.

## Segment 9
Narration: This demonstration explains the boundary. It does not prove a real incident is resolved or test your provider.

## Segment 10
Narration: Check which exposed credentials still need revoking.

