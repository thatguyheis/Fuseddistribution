# Worktree Hygiene SOP

## Outcome

Every production task ends in one of three explicit states:

1. durable work is validated and committed;
2. reproducible or machine-local output is covered by `.gitignore`;
3. incomplete work is reported with its protocol tag and remains intentionally dirty.

An unexplained dirty worktree is never a normal handoff state.

## Protocol Tags

`npm run workspace:audit` classifies every changed path under its governing
protocol:

| Tag | Governing scope |
|---|---|
| `blog` | `public/blog/` and the Blog SOP |
| `reel` | `video/`, reel outputs, and the Reel SOP |
| `ada` | registered ADA generations and evolution evidence |
| `operations` | profit controls, production scripts, and tests |
| `books` | book factory source and publication packages |
| `site` | public site files outside the blog |
| `docs` | SOPs, plans, and operating documentation |
| `career` | resume deliverables and their build tooling |

Tags describe ownership. They do not weaken a governing SOP. A mixed blog,
reel, and ADA change must pass all three protocol gates.

## Automated Controls

- `pre-commit` blocks machine-local media caches, rendered MP4 files, runtime
  logs, environment files, Python caches, files over 25 MiB, and commits larger
  than 250 files.
- `pre-commit` runs Gitleaks against the exact staged snapshot.
- `post-commit` writes `.workflow-state/worktree-hygiene.json` and reports any
  work left behind.
- `pre-push` requires a completely clean worktree. Repository authorization
  rules still determine who may push.
- The reel background library remains under `video/local/` and is always local.
- Blog artifacts, reel manifests, and ADA generation records remain durable
  only when their governing release and evidence gates pass.

Install the versioned hooks once per clone:

```bash
npm run workspace:hooks:install
```

Audit at any time:

```bash
npm run workspace:audit
npm run workspace:audit:staged
```

## End-of-Task Protocol

1. Run the tests required by every reported protocol tag.
2. Run `npm run workspace:audit`.
3. Move reproducible output behind a narrow ignore rule. Never broadly ignore
   durable source or release evidence.
4. Stage one reviewable protocol unit, normally fewer than 250 files.
5. Commit it and inspect the post-commit report.
6. Do not begin an unrelated task while unexplained changes remain.

The large-commit limit can be overridden only for an explicitly approved
historical reconciliation by setting `WORKTREE_HYGIENE_MAX_STAGED_FILES` for
that one commit. It must not become a persistent environment setting.
