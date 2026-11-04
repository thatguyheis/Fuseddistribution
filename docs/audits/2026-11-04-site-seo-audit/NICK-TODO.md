# Nick's to-do list for the site audit fixes (2026-11-04)

Do these in order. Steps 1 and 2 take about 10 minutes. Step 3 is reading and answering questions.

---

## Step 1. Push and deploy (2 minutes)

Claude's permission settings blocked it from pushing, so you run these two commands. In the Claude Code prompt, type each line exactly. The `!` at the start means "run this in my terminal".

```
! cd /Users/nick/projects/fuseddistribution && git push origin main
! cd /Users/nick/projects/fuseddistribution && npx wrangler deploy
```

After the deploy, set the admin password (step 4.1) and tell Codex about the handoff (see the chat).

The first command sends all the new commits to GitHub. The second puts the changes on the live site.

Then tell Claude "deployed". It will check the live pages with a cache-buster.

If you'd rather let Claude do this itself next time, add a permission rule for `git push` and the deploy script. Ask Claude to set it up with /update-config.

---

**Use `npx wrangler deploy`, not `scripts/deploy-approved-blog.mjs`.** The live site matches the repo, and that is how full site changes ship (the 11/02 pricing update went out this way). The blog script deploys a separate snapshot in `.workflow-state/deployment-baseline` that still has the **old $299/$300 pricing** on the FAQ pages and the old llms.txt. Running that script would roll live pricing back. Codex needs to refresh that snapshot (see decision 7 below).

## Step 2. Turn on www (5 minutes, do this AFTER step 1)

**What's wrong:** if someone types `www.fuseddistribution.com`, they get an error. Cloudflare has no address on file for the "www" part. The site code now knows how to send www visitors to the normal address. Cloudflare just needs to be told www belongs to the site.

**What to do:**

1. Go to **https://dash.cloudflare.com** and log in.
2. In the left menu, click **Compute (Workers)**, then **Workers & Pages**. In some accounts it's just called **Workers & Pages**.
3. In the list, click the one named **fuseddistribution**.
4. Click the **Settings** tab near the top.
5. Find the box called **Domains & Routes**. Click **+ Add**, then choose **Custom domain**.
6. Type exactly: `www.fuseddistribution.com`
7. Click **Add domain**.
8. Wait 5 to 15 minutes. Cloudflare creates the address record and the security certificate (the padlock) by itself. You don't need to touch the DNS page.
9. Test it. Open **https://www.fuseddistribution.com** in your browser. The address bar should switch to **https://fuseddistribution.com** with no www. That means it worked.

**If you see an error that a DNS record already exists for www:** go to the left menu, open **fuseddistribution.com**, then **DNS**, then **Records**. Look for a row with Name `www`. Write down what it says, then send a screenshot to Claude before deleting anything. When I checked today there was no such record, so this is unlikely.

**Why do step 1 first:** if www goes live before the new code, www would show a second copy of the whole site instead of redirecting. Google doesn't like duplicate copies.

---

## Step 3. Review the new pages (answered 2026-11-04, now built)

Your 8 answers are in. The pages are built and committed, but not live until you deploy (step 1). Look at the screenshots in `preview/`:

- `desktop_home.png` and `mobile_home.png`: new headline (now "Websites, Video and AI for Small Business."), Vancouver, Portland and remote, 24 to 48 hour first draft
- `desktop_home_reviews.png`: your 3 client quotes
- `desktop_web-design.png`, `mobile_web-design.png`: new page `/web-design/`
- `desktop_local-seo.png`, `mobile_local-seo.png`: new page `/local-seo/`

Also changed: Warhammer removed everywhere (now "coins, collectibles and rare antiquities"), demo sites relabeled "Concept Build", ownership answer in both FAQs, 24 to 48 hour first draft on Process and FAQ pages, full name on About and in Google's business data, `llms.txt` rewritten.

**Answered 2026-11-04:** Ken's quote stays as written. All 3 clients approved being named. The /local-seo/ list is accurate. Headline changed to "Websites, Video and AI for Small Business."

## Step 4. Decisions (answered 2026-11-04)

1. Lock /admin/: **done in code.** After the deploy, `/admin/` shows "Not found" until you set a password. To set one:
   1. Go to dash.cloudflare.com, then **Workers & Pages**, then **fuseddistribution**.
   2. Click **Settings**, then **Variables and Secrets**, then **+ Add**.
   3. Set Type to **Secret**, Name to `ADMIN_PASSWORD`, and Value to a password you make up. Save it in your password manager.
   4. Click **Deploy** (or **Save**).
   5. Open `https://fuseddistribution.com/admin/`. Your browser asks for a username and password. Type any username (e.g. `nick`) and your password.
2. Google Analytics Consent Mode: **done in code.** The banner text and the privacy page were updated to match.
3. Brand name: Claude's recommendation is below. Reply yes or no.
4. Weak silver posts: **13 removed** (thin, duplicate, or dated price predictions), each redirected to the closest good post. The other 172 silver posts move under Fused Reserve branding through the Codex handoff. 134 of them have no sources; Codex either adds sources or retires them (`silver_tier2_no_sources.md`).
5. The 3 retired Google Business folders are **deleted** (still recoverable from git history).
6 and 7. Codex handoff written: `docs/HANDOFF-CODEX-2026-11-04-site-audit.md`.

## What Claude already did (no action needed)

- Share image and site icons on every page
- Fonts fixed on Pricing, Projects and Coin History Talk
- 19 broken links fixed across 21 posts
- The 3 dead Google Business posts now redirect to the setup guide
- 5 client demo pages hidden from Google, and The Plainsman's fake star rating removed
- New mobile menu with a menu button, and the same menu on every page
- The blog page lists all 401 articles in plain HTML, so ChatGPT, Claude and Perplexity can find them
- Business details (ProfessionalService) added to the homepage for Google
- Sitemap rebuilt: 489 addresses, the right ones
- Everything is tested (31 checks pass) and ready to deploy
