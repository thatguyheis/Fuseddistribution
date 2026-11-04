# Nick's to-do list for the site audit fixes (2026-11-04)

Do these in order. Steps 1 and 2 take about 10 minutes. Step 3 is reading and answering questions.

---

## Step 1. Push and deploy (2 minutes)

Claude's permission settings blocked it from pushing, so you run these two commands. In the Claude Code prompt, type each line exactly. The `!` at the start means "run this in my terminal".

```
! cd /Users/nick/projects/fuseddistribution && git push origin main
! cd /Users/nick/projects/fuseddistribution && node scripts/deploy-approved-blog.mjs
```

The first command sends 3 commits to GitHub. The second puts the changes on the live site.

Then tell Claude "deployed". It will check the live pages with a cache-buster.

If you'd rather let Claude do this itself next time, add a permission rule for `git push` and the deploy script. Ask Claude to set it up with /update-config.

---

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

## Step 3. Files to review and the answers I need

Open these in any editor. VS Code works, or open the folder in Finder: `docs/audits/2026-11-04-site-seo-audit/`

### A. `copy_drafts.md`: most important

This is new wording for the homepage, `llms.txt`, and two new pages (`/web-design/` and `/local-seo/`). Nothing goes live until you answer these:

| # | Question | Example answer |
|---|---|---|
| 1 | Can your last name (Hughes) appear on the site? | "yes" or "keep it Nick" |
| 2 | Should the site say you serve Portland too, or only Vancouver, WA? | "Vancouver and Portland" |
| 3 | Plainsman, Cascade Collision, Boba Tree, World Construction, Anoush Deli: were they paying clients, or concepts you built on your own? | "Plainsman client, rest concepts" |
| 4 | 3 real client quotes: name, business, city, one or two sentences | paste them |
| 5 | How long does a first build usually take? | "7 to 10 days" |
| 6 | Does the client own their site? What happens if they cancel? | your policy |
| 7 | Is the collectibles / Warhammer catalog still a real thing? | "no, remove it" |
| 8 | Do you like the new homepage headline: "Custom websites for small businesses. Built before you pay."? | "yes" or your edits |

Reply with the number and your answer. Claude will build the pages, show you, then publish.

### B. `ACTION-PLAN.md`: the full list

It shows what's done and what's left. You only need to decide the items below.

### C. `FULL-AUDIT-REPORT.md`: background reading

It explains the score (62/100) and why each fix matters. You don't need to act on anything in it.

---

## Step 4. Decisions only you can make

Reply with the number and your choice.

1. **`/admin/` is open to the public.** Anyone can load it. Lock it so only you can see it? (Recommended: yes. Claude can add a password check, or you can use Cloudflare Access.)
2. **Google Analytics only counts visitors who click "Accept".** Switch to Google's Consent Mode, which counts visits without cookies until someone accepts? This gives better numbers and stays privacy friendly. (Recommended: yes.)
3. **One brand name or two?** Pages say "Fused Distribution" in some places and "Fused Technology Solutions" in others. Pick: (a) Fused Technology Solutions for the website business, Fused Distribution as the parent company name, or (b) Fused for everything.
4. **303 silver and investing posts** sit under the web design brand. Options: (a) leave them, (b) move them under Fused Reserve branding, (c) fact check them and remove the weak ones. Some still have made-up citations from before July.
5. **The 3 retired Google Business post folders** still exist on disk. They redirect now, so visitors never see them. Delete the folders? (Optional cleanup.)
6. **Codex handoff:** shortening blog titles (351 are too long) and changing the author from "Nick" to your full name both touch the blog template, which Codex owns. OK to write Codex a handoff note?

---

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
