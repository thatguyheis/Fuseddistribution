# Reel Script: github-secrets-workflow-code-access
format: fused-tech-short-v1

## Segment 1
Narration: Your API key is stored in GitHub Secrets. Which code can use it?

## Segment 2
Narration: I separate secret storage from workflow access. A credential can still reach code that a job runs.

## Segment 3
Narration: Our real secret scan workflow declares a read only repository token. Its two actions are pinned to full commit hashes.

## Segment 4
Narration: That is a configuration review, not a live attack test. Pinning also does not prove a dependency is safe.

## Segment 5
Narration: In this labeled example, a step receives a secret. That step, and code it launches, can use the value.

## Segment 6
Narration: I review triggers, permissions, third party actions, and which jobs receive credentials before allowing a deployment.

## Segment 7
Narration: I keep untrusted pull request code away from privileged deployment credentials. Useful automation still needs a clear access boundary.

## Segment 8
Narration: I also avoid printing secrets. Automatic masking is not guaranteed to catch every transformed value.

## Segment 9
Narration: GitHub Secrets stores the value. My workflow design determines how code receives it.

## Segment 10
Narration: Review what your deployment workflow is allowed to access.

