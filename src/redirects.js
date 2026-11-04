// Permanent (301) redirects, checked before static assets. Keys have no trailing slash.
// Removed posts are also taken out of public/blog/posts.json.
export const PERMANENT_REDIRECTS = new Map([
  // Retired 2026-11-04: Google Business Profile features Google removed (Messaging, July 2024; Q&A, replaced by Ask Maps).
  ["/blog/google-business-profile-messaging", "/blog/google-business-profile-setup/"],
  ["/blog/google-business-profile-messaging-setup-and-tips", "/blog/google-business-profile-setup/"],
  ["/blog/google-business-profile-q-and-a-how-to-use-it", "/blog/google-business-profile-setup/"],
  // Old standalone page left in a folder with a space in its name.
  ["/Fused%20Technology%20Solutions", "/projects/"],
  // Retired 2026-11-04: weak silver and investing posts (thin, duplicate, or dated predictions).
  // Duplicate of the Hunt Brothers post
  ["/blog/the-hunt-brothers-silver-squeeze-of-1980", "/blog/hunt-brothers-silver-squeeze/"],
  // Duplicate of the silver to gold ratio post
  ["/blog/silver-to-gold-ratio-explained-how-to-use-it", "/blog/silver-to-gold-ratio/"],
  // Duplicate of the silver vs gold comparison
  ["/blog/silver-vs-gold-which-is-better-investment-in-2026", "/blog/silver-vs-gold-performance-comparison-2025-2026/"],
  // Thin: 703 words, no sources
  ["/blog/physical-silver-vs-silver-etf-pros-and-cons", "/blog/paper-silver-vs-physical-silver-the-key-difference/"],
  // Thin: 699 words, no sources, duplicate topic
  ["/blog/dollar-cost-averaging-silver", "/reserve/"],
  // Thin: 883 words, no sources
  ["/blog/silver-premiums-explained-for-beginners", "/blog/silver-investment-for-beginners-complete-guide/"],
  // Thin: 887 words, no sources
  ["/blog/silver-bullion-invoice-checklist-for-your-records", "/blog/how-to-keep-records-of-silver-purchases-for-taxes/"],
  // Price prediction, dates fast, risky investment advice
  ["/blog/silver-price-prediction-2026-what-analysts-expect", "/reserve/"],
  // Market forecast, no sources
  ["/blog/silver-market-outlook-2026-what-analysts-say", "/reserve/"],
  // Speculative, no sources
  ["/blog/silver-short-squeeze-2026-is-it-possible", "/blog/why-comex-price-and-physical-silver-price-diverge/"],
  // Forecast, no sources, overlaps supply shortage post
  ["/blog/silver-supply-deficit-sixth-consecutive-year-2026", "/blog/silver-supply-shortage-what-it-means-for-prices/"],
  // Buy timing advice, no sources
  ["/blog/is-now-a-good-time-to-buy-silver-2026", "/reserve/"],
  // Stock picks, no sources, risky investment advice
  ["/blog/best-silver-mining-stocks-to-watch-in-2026", "/blog/"],
  // Retired 2026-11-04: repeated, unsupported buying and allocation advice.
  ["/blog/dollar-cost-averaging-silver-strategy-explained", "/reserve/"],
  ["/blog/silver-as-a-percentage-of-net-worth-how-much", "/reserve/"],
  // Retired 2026-11-04: unsupported figures, unsafe storage advice, or incorrect premium math.
  ["/blog/silver-numismatic-coins-vs-bullion-coins", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  ["/blog/how-to-store-silver-at-home-safely", "/blog/silver-storage-vault-vs-home-storage/"],
  ["/blog/silver-premiums-explained", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  ["/blog/silver-premium-over-spot-explained", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  // Retired 2026-11-04: unsupported industrial and financial claims, incorrect coin math, or invented service terms.
  ["/blog/silver-industrial-uses-explained-for-investors", "/reserve/"],
  ["/blog/selling-junk-silver-coins-where-and-how", "/blog/how-to-compare-silver-buyback-quotes-fairly/"],
  ["/blog/silver-reserve-plan-what-it-is-and-how-it-works", "/reserve/"],
  ["/blog/best-silver-storage-options-for-investors", "/blog/silver-storage-vault-vs-home-storage/"],
  // Retired 2026-11-04: unsupported inflation protection, stale prices, incorrect IRA handling, and false Panda identification advice.
  ["/blog/how-inflation-erodes-purchasing-power-and-silver-protec", "/reserve/"],
  ["/blog/how-to-buy-silver-coins-at-spot-price", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  ["/blog/silver-ira-how-to-set-one-up-step-by-step", "/blog/"],
  ["/blog/silver-panda-coins-from-china-complete-guide", "/reserve/"],
  // Retired 2026-11-04: broken spreadsheet formulas, incorrect IRA/tax claims, and unsupported silver returns.
  ["/blog/how-to-build-a-silver-inventory-spreadsheet", "/blog/silver-bar-serial-numbers-and-inventory-records/"],
  ["/blog/silver-ira-vs-physical-silver-at-home-which-is-better", "/blog/"],
  ["/blog/how-to-calculate-your-average-cost-per-ounce-silver", "/blog/silver-bar-serial-numbers-and-inventory-records/"],
  ["/blog/silver-vs-cash-which-holds-value-better", "/reserve/"],
  // Retired 2026-11-04: unsupported subscription terms, dealer impersonation, and incorrect tax reporting rules.
  ["/blog/what-is-junk-silver", "/reserve/"],
  ["/blog/provident-metals-review-is-it-legit", "/blog/"],
  ["/blog/irs-rules-for-selling-silver-coins-1099-b-reporting", "/blog/"],
]);
