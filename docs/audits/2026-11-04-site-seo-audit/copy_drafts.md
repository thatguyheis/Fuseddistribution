# Copy drafts for review (not live)

Status: BUILT 2026-11-04 from Nick's answers (see NICK-TODO.md step 3). The live versions differ from this draft: the headline is now "Websites That Make Their Own Videos." and real quotes are used. Facts come from `public/llms.txt`, `public/pricing/index.html` and the pricing memo (Foundation $99, Standard $499, Expansion from $999). Items marked **[NICK]** need a decision or real data from you before this can ship. I won't invent testimonials or results.

**[NICK] First decision:** your About page never shows your last name. These drafts use "Nick Hughes" because a full name helps Google and AI tools trust the author. If you would rather stay "Nick", tell me and I will change every draft.

Style check: no em dashes, no hyphenated words in prose, none of the banned buzzwords.

---

## 1. Homepage (`/`)

**Why:** the current H1, "One Operator. Many Ventures. Everything Built to Move.", never says what you sell or where. Google and AI answer engines pick up the first 150 words, so those words should answer "who builds small business websites in Vancouver WA".

| Field | Now | Proposed |
|---|---|---|
| `<title>` (78 → 48 chars) | Fused Distribution \| Websites, Photography, Silver, Collectibles and Education | Small Business Websites in Vancouver, WA \| Fused |
| Meta description (392 → 146 chars) | Fused Distribution is an operator-led hub running... | Custom websites for small businesses in Vancouver, WA. See your site fully built before you pay. Plans start at $99 a month with hosting included. |
| Badge (breaks style rules) | OPERATOR-LED. MULTI-VENTURE. ALWAYS EXPANDING. | WEBSITES. SILVER. EDUCATION. ONE OWNER. |
| H1 | One Operator. Many Ventures. Everything Built to Move. | Custom websites for small businesses. Built before you pay. |
| CTA 1 | See Pricing. Starts at $99/mo | See pricing from $99 a month |
| CTA 2 | Explore Divisions | See sites I built |

**Lead paragraph (replaces the current one):**

> I'm Nick Hughes. I build custom websites for small businesses in Vancouver, WA. You see your whole site built and working before you pay anything. Plans start at $99 a month and include hosting, a contact form, and a monthly update. If you want more, the Standard plan writes and posts blog articles and short videos for you in your own voice.
>
> I also run Fused Reserve, a monthly silver subscription, and Fused Education. Same person, same phone number: 503 847 9425.

**[NICK]** Decide whether to say "Vancouver, WA and the Portland area". Your phone number is a 503 number, but I'm not going to claim a service area you haven't confirmed.

**New section under the hero: "Sites I built"**
A row of 4 or 5 screenshot cards from the client demos you already have (Plainsman, Cascade Collision, Boba Tree, World Construction, Anoush Deli), each with one line: business type, city, what the site does. Each card links to `/projects/` rather than to the demo page, since the demos are now noindexed.
**[NICK]** Confirm each of those businesses is OK being named as a client. If any of them is a concept you built without being hired, label it "Concept build".

**Testimonials block:** 3 short quotes, each with a first and last name, the business name and the city. **[NICK]** I need real quotes. Placeholder slots only.

---

## 2. `llms.txt` fixes

| Line | Now | Proposed |
|---|---|---|
| Summary | Fused Distribution is an operator-led hub running multiple ventures under one roof: custom small-business websites... | Fused Distribution is run by Nick Hughes in Vancouver, WA. The main business is Fused Technology Solutions, which builds custom websites for small businesses. It also runs Fused Reserve (silver subscriptions), Fused Photos (free use photography) and Fused Education (books and coaching). |
| About | operators who own the whole stack move faster... Every division under the Fused roof is run hands-on | One person owns every part of the work, from the build to the hosting to the follow up. There are no brokers or middlemen. |
| Bullet | Custom small-business websites | Custom websites for small businesses |
| Reserve bullet | Low-premium bullion | Bullion at a low premium over spot |
| Collectibles | Warhammer 40K / Distribution Catalog section | **[NICK]** Is this still active? If not, delete the section so AI answers stop mentioning it. |

---

## 3. New page draft: `/web-design/`

Two blog posts already link here (the link now points to `/projects/` until this page exists).

- **Title (56):** Web Design for Small Businesses in Vancouver, WA | Fused
- **Meta (151):** Custom small business websites built before you pay. Hosting, updates and support included from $99 a month. Based in Vancouver, WA. See real examples.
- **H1:** Small business web design in Vancouver, WA

**Opening (answer first, about 90 words):**
> I build custom websites for small businesses. Not templates. You tell me what you do, I build the full site, and you see it working before you pay anything. If you like it, you pick a plan. Foundation is $99 a month and covers the site, hosting on Cloudflare, SSL, a contact form, and one content update each month. There is no long contract on monthly plans. Most first builds take **[NICK: real turnaround, e.g. 7 to 10 days]**.

**Sections**
1. **How it works.** Four steps: a call, the build, you review it, it goes live. Link to `/process/`.
2. **What you get on each plan.** A short 3 column table (Foundation, Standard, Expansion) with the same facts as `/pricing/`. Link there for full details.
3. **Sites I built.** The same screenshot strip as the homepage.
4. **Who this is for.** Restaurants, contractors, auto shops, retail, service businesses. Use the industries of real clients only.
5. **FAQ** (FAQPage schema). Do I own my site? What if I already have a site? How long does it take? Do you do Google Business Profile? (Yes, on Expansion.) What happens if I cancel? **[NICK]** Answer the ownership and cancellation questions. I don't know your policy.
6. **CTA.** "Get your site built first. Call 503 847 9425 or use the form."

**Schema:** `Service` (serviceType "Web design", provider `#organization`, areaServed Vancouver WA), BreadcrumbList, FAQPage.

---

## 4. New page draft: `/local-seo/`

- **Title (47):** Local SEO for Small Businesses in Vancouver, WA
- **Meta (148):** Show up when people nearby search for what you do. Local SEO is part of the Standard and Expansion plans, with Google Business Profile on Expansion.
- **H1:** Local SEO in Vancouver, WA

**Opening (answer first):**
> Local SEO means showing up when someone near you searches for what you sell. It comes down to three things: a site Google can read, a Google Business Profile that matches it, and a steady stream of useful pages and reviews. Local SEO is included on the Standard plan ($499 a month). Google Business Profile setup and management is on Expansion (from $999 a month).

**Sections**
1. **What is included.** Page titles and descriptions, local business schema, matching name, address and phone everywhere, sitemap and Search Console setup, Bing Webmaster setup, 8 fact checked blog posts a month on Standard, and review requests. Every item here comes from the current plans. Nothing new is promised.
2. **What I don't promise.** No guaranteed rankings, because nobody can honestly promise that. This builds trust and matches Google's own guidance on SEO vendors.
3. **AI search.** One short paragraph: the same work helps ChatGPT, Perplexity and Google AI answers find and quote you.
4. **Related guides.** Link to the existing posts: local SEO beginner guide, NAP consistency, Google Business Profile setup, getting Google reviews.
5. **FAQ.** How long until I see results? Do I need a blog? What is NAP? Is Google Business Profile included?
6. **CTA.**

**Schema:** `Service` (serviceType "Local SEO"), BreadcrumbList, FAQPage.

---

## 5. Author page (supports both pages)

`/about/nick-hughes/`: photo, 3 short paragraphs on who you are and what you've built, client list, and contact details. Then change BlogPosting `author.name` from "Nick" to "Nick Hughes" and point `author.url` at this page. That change touches the blog template, which Codex owns, so it needs your go-ahead plus a Codex handoff.
