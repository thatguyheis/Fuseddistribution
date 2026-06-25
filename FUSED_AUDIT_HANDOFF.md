# Fused Distribution Audit Handoff

Generated: 2026-06-18

## Start Here

Repository: `thatguyheis/Fuseddistribution`

Local working directory:

```bash
cd "/Users/nick/Documents/New project"
```

The missing directory was restored by cloning the repository. At handoff time, the checkout was on `main`, tracking `origin/main`, with no pre-existing local changes.

Repository rule: never run `git push`. Local commits are allowed, then Claude reviews and pushes.

## User Goal

Audit the Fused Distribution website and code for:

- Bugs and broken user flows
- Security weaknesses and exposed secrets
- Performance and optimization opportunities
- SEO problems
- Production readiness

The user also asked to enable local command execution, explain API key security, fix the missing working directory, and do as much remediation as possible.

## Confirmed Critical Findings

### 1. Exposed MailerLite credential

A live MailerLite bearer token is embedded in browser delivered JavaScript in these files:

- `public/reserve/index.html`
- `public/projects/index.html`
- `public/newsletter/silver/index.html`
- `public/newsletter/tech/index.html`

Do not print, copy, or preserve the credential. Assume it is compromised.

Required response:

1. Revoke and rotate the token in MailerLite immediately.
2. Remove direct browser calls to the MailerLite API.
3. Add a same origin Worker endpoint such as `POST /api/newsletter`.
4. Store the replacement credential as a Cloudflare Worker secret, never in source code.
5. Validate email, name, newsletter type, request size, and origin server side.
6. Add durable abuse protection. An in-memory Worker `Map` is not reliable rate limiting.

### 2. Secrets remain in Git history

- `video/.env.cron` contains a Pexels key in commit history.
- A Metal Price API key was removed in commit `fa669ea`, but remains in history.

Rotate both credentials before considering history cleanup. Rewriting history does not make an already exposed credential safe.

### 3. Secret scanning gap

`.gitleaks.toml` does not currently detect the MailerLite credential pattern. Extend secret scanning and ensure it runs in CI and before commits.

## Other Confirmed Findings

### Security and reliability

- `src/worker.js` defines security headers, but the deployed site previously received a weak production security grade. Verify that the Worker actually owns the production routes.
- `wrangler.jsonc` defines assets and the Worker entry point but no explicit production route was observed.
- The Worker rate limiter uses an isolate local `Map`. Limits reset across isolates and deployments and can be bypassed under distributed traffic.
- Contact handling can send confirmation email to arbitrary submitted addresses. This creates spam and abuse risk without durable rate limiting or a bot control such as Turnstile.
- Input validation is too weak for a public email endpoint.
- Committed Cloudflare challenge script markup appears in `public/index.html` and `public/reserve/index.html`. Ephemeral challenge output should not be source controlled.
- The current Content Security Policy may block direct MailerLite calls and Google Fonts on the Cascade page if the Worker headers become active. Update the implementation and CSP together.

### Bugs

- The form in `public/cascade/index.html` has no working submission handler or destination. It appears interactive but does nothing.

### SEO

- The sitemap omits public pages. Generate or update it from the canonical route inventory.
- Recheck canonical URLs, metadata, robots directives, structured data, broken links, and status codes after functional fixes.

### Testing

- Root tests currently cover the book factory only.
- There are no focused Worker tests for validation, security headers, routing, upstream failures, or abuse controls.

## Recommended Implementation Order

1. Rotate MailerLite, Pexels, and Metal Price credentials outside the repository.
2. Remove the MailerLite token from all current browser code.
3. Implement a Worker newsletter proxy backed by a Cloudflare secret.
4. Add strict server side validation, safe error responses, and durable abuse protection.
5. Repair the Cascade form or remove the nonfunctional form until its destination is defined.
6. Confirm Cloudflare production routing and security headers.
7. Remove committed challenge artifacts and reconcile the CSP with required resources.
8. Expand gitleaks rules and CI secret scanning.
9. Add Worker tests and run the existing test suite.
10. Complete performance, accessibility, link, and SEO verification against production.

## API Key Security Commands

Never put the secret value directly on a command line, in chat, or in a tracked `.env` file.

After reviewing the Cloudflare configuration and selecting the correct production environment, use Wrangler's interactive secret prompt:

```bash
npx wrangler secret put MAILERLITE_API_KEY
```

Use an ignored local development secret file for local Worker development, following the repository and Wrangler conventions. Confirm it is ignored before adding any value:

```bash
git check-ignore -v .dev.vars
```

Before committing remediation work:

```bash
git diff --check
git status --short
npm test
```

Also run the repository's lint, build, Worker tests, and secret scan once their exact scripts are confirmed from `package.json` and project configuration.

## Next Session Prompt

Use this prompt after opening the repository at the path above:

> Continue the Fused Distribution security and website audit using `FUSED_AUDIT_HANDOFF.md`. Start by reading `AGENTS.md`, `package.json`, `wrangler.jsonc`, `src/worker.js`, `.gitignore`, and `.gitleaks.toml`. Do not reveal any credential values and never push. Implement the highest priority current tree remediation, add focused tests, and verify the changes locally.

## Boundaries

- Do not push to GitHub.
- Do not expose credential values in output, patches, logs, or tests.
- Do not rewrite Git history until all affected credentials are rotated and the user explicitly approves the coordinated rewrite.
- Do not deploy or change provider settings without confirming the target account and production environment.
