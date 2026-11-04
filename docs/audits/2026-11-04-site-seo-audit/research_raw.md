# Research notes: SEO and AI search practice, as of 2026-11-04

Raw notes gathered before the site audit. Most sources are third-party SEO blogs. Primary Google pages were not reached, so treat the specifics as secondhand.

## Google core updates 2026
- Core updates confirmed by these sources: March 27 to April 8, and May 21 to June 2, 2026. There was also a Discover core update in February and a spam update in September. I found no November 2026 core update.
- Google published no new ranking rules. Its advice is still helpful, people-first content judged by E-E-A-T. Google reportedly updated its helpful content page on 2026-10-05.
- After the May update, deep, focused topic coverage reportedly beat high-volume publishing.
- Do not edit pages while an update is rolling out. Measure one full week after it ends.
- Sources: https://www.dataslayer.ai/blog/google-core-update-december-2025-what-changed-and-how-to-fix-your-rankings , https://seomatic.ai/resources/google-core-update-2026 , https://www.intelegencia.com/blog/seo/google-core-updates-2026-what-changed-with-every-update-this-year-and-how-to-recover-your-rankings , https://marketingagency.com.sg/2026/10/18/google-core-updates-explained/

## Core Web Vitals
- Most sources say the thresholds have not changed: LCP 2.5s, INP 200ms, CLS 0.1, measured at the 75th percentile.
- A minority claim the March 2026 update moved LCP to 2.0s and INP to 150ms. **Unverified, and it conflicts with the majority of sources.** Check web.dev before relying on it.
- Sources: https://www.metadigital.co.nz/core-web-vitals-in-2026-what-they-measure-and-whats-actually-worth-fixing/ , https://eseospace.com/blog/core-web-vitals-in-2026-what-changed-what-still-matters-and-how-to-pass/ , https://seojuice.com/blog/core-web-vitals-2026-audit-changes/

## AI search (ChatGPT, Perplexity, AI Overviews / AI Mode)
- Do not block OAI-SearchBot, PerplexityBot, Bingbot or Googlebot. Blocking GPTBot affects model training, not search visibility.
- ChatGPT search draws on Bing's index, so verify the site in Bing Webmaster Tools and submit the sitemap there.
- Answer the question in the first ~150 words. Use specific facts (prices, timelines, named examples), complete sentences, real FAQ questions, and clear headings.
- ChatGPT still weights backlinks and authority. Perplexity favors fresh content and Reddit discussions.
- Off-site mentions (best-of lists, Reddit, Quora, directories) matter.
- Measure with a fixed prompt set every 1 to 4 weeks and watch AI referrers in analytics.
- AI crawlers generally do **not** execute JavaScript, so content must be present in the server HTML. This is widely reported across the GEO sources and matches what is known about GPTBot, ClaudeBot and PerplexityBot.
- Sources: https://www.frase.io/blog/how-to-get-cited-by-ai-search-engines-the-complete-geo-playbook , https://almcorp.com/blog/generative-engine-optimization-complete-guide-2/ , https://dev.to/313automationspak/geo-checklist-20-ways-to-get-your-business-cited-by-chatgpt-and-perplexity-553e , https://www.averi.ai/blog/beyond-google-how-to-get-your-startup-cited-by-chatgpt-perplexity-and-ai-search , https://deepparmar.in/blogs/get-cited-by-ai-geo-guide , https://claudefa.st/blog/tools/extensions/ai-seo-geo-optimization

## llms.txt
- Google's May 15, 2026 AI optimization guide reportedly says Search does not use llms.txt and site owners can skip it. Mueller compared it to the meta keywords tag.
- Adoption is about 6 to 10% of sites. Requests for the file are rare. Keep the file since it costs nothing, but don't spend effort on it.
- Sources: https://www.getpassionfruit.com/blog/should-i-create-an-llms.txt-file-google-s-2026-guidance-explained , https://guptadeepak.com/llms-txt-meta-keywords-2026/ , https://www.rzlt.io/blog/llms-txt-2026-what-it-is-and-whether-it-works , https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/

## Structured data
- Google reportedly says structured data is "not required" for AI features. One study found 65% of AI Mode citations carry schema. That is correlation only.
- FAQ rich results were deprecated 2026-05-07, and Search Console reporting was removed around June 2026. FAQPage markup is still valid and harmless, so keep it for AI parsing. HowTo rich results have been gone since 2023.
- Still active: Product, Review (with policy limits), Article, Event, BreadcrumbList, LocalBusiness and Organization.
- Sources: https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/ , https://jsonld.com/google-faq-rich-results-deprecated/ , https://www.gogochimp.com/blog/schema-markup-for-ai-seo-2026 , https://ai-trust-audit.trustedshops.com/en/blog/ai-overviews-en-ai-mode-googles-richtlijnen-voor-websites-in-2026

## Google Business Profile changes that affect blog content
- GBP Messaging (chat) was shut down by Google in July 2024. This is my own knowledge, not from today's searches. Verify it if needed.
- GBP Q&A has been retired in favor of Gemini "Ask Maps", reportedly from late 2025 into early 2026. Sources give mixed dates.
- Sources: https://www.seroundtable.com/google-maps-qa-feature-ask-40594.html , https://www.brightlocal.com/learn/google-q-and-a/ , https://www.footbridgemedia.com/marketing-tips/google-shutting-down-gbp-q-a

## Not reachable / limits
- The PageSpeed Insights API returned a daily quota error, so I took lab metrics from local Playwright with throttling instead. I have no CrUX field data.
- The Chrome extension was not connected, so I took screenshots with headless Playwright.
- I did not check the Search Console or GA4 dashboards because I had no API access.
