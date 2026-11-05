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
  ["/blog/silver-vs-gold-which-is-better-investment-in-2026", "/reserve/"],
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
  ["/blog/silver-short-squeeze-2026-is-it-possible", "/blog/"],
  // Forecast, no sources, overlaps supply shortage post
  ["/blog/silver-supply-deficit-sixth-consecutive-year-2026", "/reserve/"],
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
  // Retired 2026-11-04: unsupported silver returns, false coin and sales claims, and invented refinery shortages.
  ["/blog/building-a-silver-reserve-on-a-monthly-budget", "/reserve/"],
  ["/blog/perth-mint-silver-kangaroo-buying-guide", "/reserve/"],
  ["/blog/silver-supply-shortage-what-it-means-for-prices", "/reserve/"],
  // Retired 2026-11-04: stale price forecasts, incorrect tax and 401(k) claims, unsupported dealer advice, or duplicate tarnish guidance.
  ["/blog/silver-vs-gold-performance-comparison-2025-2026", "/reserve/"],
  ["/blog/silver-coins-gift-tax-rules-what-you-need-to-know", "/blog/"],
  ["/blog/why-comex-price-and-physical-silver-price-diverge", "/blog/"],
  ["/blog/silver-reserve-vs-401k-which-makes-more-sense", "/blog/"],
  ["/blog/does-tarnished-silver-lose-value", "/blog/"],
  ["/blog/state-sales-tax-on-silver-coins-which-states-charge-it", "/blog/"],
  ["/blog/should-you-buy-silver-in-dips-or-dollar-cost-average", "/reserve/"],
  ["/blog/silver-irs-reporting-requirements-what-you-need-to-know", "/blog/"],
  ["/blog/gainesville-coins-review-2026", "/blog/"],
  // Retired 2026-11-04: unsupported tax reporting and unsafe coin cleaning instructions.
  ["/blog/how-to-keep-records-of-silver-purchases-for-taxes", "/blog/silver-bar-serial-numbers-and-inventory-records/"],
  ["/blog/best-ways-to-clean-silver-coins-without-damage", "/blog/"],
  // Retired 2026-11-04: stale coin price tables and unsupported silver premium ranges duplicate sourced comparison guidance.
  ["/blog/peace-silver-dollar-value-and-history", "/blog/"],
  ["/blog/how-to-compare-silver-premiums-across-dealers", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  // Retired 2026-11-04: unsupported 100-ounce bar cost and investment claims link to retired purchase advice.
  ["/blog/100-oz-silver-bars-pros-and-cons", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  // Retired 2026-11-04: unsupported inventory, home purity testing, product, and dealer fee claims.
  ["/blog/how-to-organize-and-inventory-your-silver-collection", "/blog/silver-bar-serial-numbers-and-inventory-records/"],
  ["/blog/how-to-verify-silver-purity-at-home", "/reserve/"],
  ["/blog/american-silver-eagle-complete-buying-guide", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  ["/blog/how-to-avoid-silver-dealer-scams", "/blog/"],
  // Retired 2026-11-04: unsafe cleaning, coating, and storage advice with unsupported value claims.
  ["/blog/silver-tarnish-why-it-happens-and-how-to-prevent-it", "/blog/silver-storage-vault-vs-home-storage/"],
  // Retired 2026-11-04: unsafe home tests, stale market claims, duplicate history, and unsupported dealer or investment guidance.
  ["/blog/buying-silver-from-a-local-coin-shop-vs-online", "/blog/best-online-silver-dealers-in-2026/"],
  ["/blog/ice-test-for-silver-explained", "/blog/"],
  ["/blog/electric-vehicle-silver-demand-explained", "/blog/"],
  ["/blog/silver-in-solar-panels-how-much-is-used", "/blog/"],
  ["/blog/engelhard-silver-bars-history-and-collector-value", "/blog/"],
  ["/blog/paper-silver-vs-physical-silver-the-key-difference", "/reserve/"],
  ["/blog/silver-monetary-history-complete-guide", "/blog/silver-and-the-bretton-woods-collapse-explained/"],
  ["/blog/silver-royalty-companies-explained-wheaton-precious-met", "/blog/"],
  ["/blog/silver-counterfeit-detection-guide", "/blog/"],
  ["/blog/self-directed-ira-approved-silver-coins-and-bars-list", "/blog/"],
  ["/blog/how-to-start-buying-silver-with-100-dollars", "/reserve/"],
  // Retired 2026-11-04: duplicate estate guidance, incorrect exchange descriptions, unsupported money history, or unsafe authenticity tests.
  ["/blog/how-to-divide-silver-in-an-estate-fairly", "/blog/what-to-do-when-you-inherit-silver-coins-and-bars/"],
  ["/blog/what-is-comex-silver-and-how-does-it-affect-spot-price", "/blog/how-silver-futures-work-explained-for-stackers/"],
  ["/blog/silver-as-money-throughout-history", "/blog/silver-and-the-bretton-woods-collapse-explained/"],
  ["/blog/how-to-spot-fake-silver-coins-and-bars", "/blog/"],
  ["/blog/troy-ounce-vs-regular-ounce-silver-explained", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  // Retired 2026-11-04: unsupported portfolio, retirement, price forecast, and home insurance claims.
  ["/blog/silver-mining-stocks-vs-physical-silver", "/reserve/"],
  ["/blog/solar-panel-silver-demand-impact-on-price", "/blog/"],
  ["/blog/silver-price-all-time-high-when-will-it-happen-again", "/blog/"],
  ["/blog/rolling-over-401k-into-silver-ira-what-to-know", "/blog/"],
  ["/blog/how-to-build-a-silver-stacking-portfolio-from-scratch", "/reserve/"],
  ["/blog/first-majestic-silver-vs-physical-silver-investment", "/blog/"],
  ["/blog/insuring-physical-silver-at-home", "/blog/silver-storage-vault-vs-home-storage/"],
  // Retired 2026-11-04: duplicate private-sale, price tracking, storage, ETF tax, allocation, and estate valuation guidance.
  ["/blog/selling-silver-to-a-dealer-vs-private-sale", "/blog/how-to-compare-silver-buyback-quotes-fairly/"],
  ["/blog/how-to-track-silver-price-daily", "/blog/silver-spot-price-explained-what-it-means/"],
  ["/blog/home-safe-vs-safety-deposit-box-for-silver", "/blog/silver-storage-vault-vs-home-storage/"],
  ["/blog/silver-etf-vs-physical-silver-tax-differences", "/blog/"],
  ["/blog/how-much-silver-should-you-own-in-your-portfolio", "/reserve/"],
  ["/blog/silver-alongside-stocks-and-bonds-diversification-guide", "/reserve/"],
  ["/blog/how-to-value-inherited-silver-for-estate-purposes", "/blog/what-to-do-when-you-inherit-silver-coins-and-bars/"],
  // Retired 2026-11-04: unsupported dealer ranking, sales promises, fixed allocation, IRA, and home-testing advice.
  ["/blog/apmex-review-2026-premiums-selection-and-service", "/blog/best-online-silver-dealers-in-2026/"],
  ["/blog/how-to-get-the-most-money-when-selling-silver", "/blog/how-to-compare-silver-buyback-quotes-fairly/"],
  ["/blog/silver-portfolio-allocation-beginner-vs-advanced", "/reserve/"],
  ["/blog/can-you-put-physical-silver-in-an-ira", "/blog/"],
  ["/blog/magnet-test-for-silver-does-it-work", "/blog/"],
  // Retired 2026-11-04: stale price histories, inventory price predictions, unsupported hedging statistics, and duplicate supply reporting.
  ["/blog/silver-price-history-and-long-term-trends", "/blog/silver-and-the-bretton-woods-collapse-explained/"],
  ["/blog/comex-silver-inventory-what-declining-stockpiles-mean-f", "/blog/how-silver-futures-work-explained-for-stackers/"],
  ["/blog/is-silver-a-good-hedge-against-inflation", "/reserve/"],
  ["/blog/silver-price-all-time-highs-what-drove-them", "/blog/"],
  ["/blog/silver-recycling-and-scrap-recovery-market", "/blog/how-silver-mine-production-affects-spot-price/"],
  ["/blog/why-silver-has-industrial-demand-driving-price", "/blog/how-silver-mine-production-affects-spot-price/"],
  ["/blog/largest-silver-producing-countries-in-the-world", "/blog/how-silver-mine-production-affects-spot-price/"],
  ["/blog/silver-in-ancient-civilizations-as-currency", "/blog/silver-and-the-bretton-woods-collapse-explained/"],
  // Retired 2026-11-04: unsupported tax, IRA, money, and portfolio claims or duplicate product comparisons.
  ["/blog/silver-coin-holders-and-cases-guide", "/blog/silver-storage-vault-vs-home-storage/"],
  ["/blog/pcgs-ngc-certified-silver-coins-guide", "/blog/graded-silver-coins-worth-paying-premium-or-not/"],
  ["/blog/what-moves-silver-price-up-and-down", "/reserve/"],
  ["/blog/johnson-matthee-silver-bars-guide", "/blog/"],
  ["/blog/silver-rounds-vs-silver-coins-differences", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  ["/blog/silver-in-an-llc-vs-personal-ownership-tax-differences", "/blog/"],
  ["/blog/how-to-use-silver-to-protect-against-currency-devaluati", "/reserve/"],
  ["/blog/best-silver-ira-custodians-compared-2026", "/blog/"],
  ["/blog/silver-ira-what-it-is-and-how-to-open-one", "/blog/"],
  ["/blog/silver-bars-vs-silver-coins-which-is-better", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"],
  ["/blog/silver-as-emergency-money-why-it-works", "/reserve/"],
  ["/blog/do-you-have-to-report-silver-coin-purchases-to-irs", "/blog/"],
  ["/blog/silver-investment-for-beginners-complete-guide", "/reserve/"],
  ["/blog/how-to-set-silver-spot-price-alerts-for-free", "/blog/silver-spot-price-explained-what-it-means/"],
  ["/blog/self-directed-ira-for-silver-step-by-step", "/blog/"],
  ["/blog/morgan-silver-dollars-as-investment", "/reserve/"],

  // Retired 2026-11-04: duplicate silver-round advice and unsupported junk-silver investment claims.
  ["/blog/silver-rounds-complete-buyer-guide", "/blog/1-oz-silver-coins-vs-10-oz-silver-bars-which-to-buy/"], // Duplicate buyer guide with unsupported premium, authenticity-test, and dealer claims.
  ["/blog/what-is-90-percent-silver-junk-silver-worth-buying", "/blog/inherited-junk-silver-what-to-do-with-it/"], // Incorrect purity claims and unsupported investment and return advice.
  ["/blog/junk-silver-coins-guide-pre-1965-us-silver", "/blog/inherited-junk-silver-what-to-do-with-it/"], // Duplicate junk-silver guide built around stale market forecasts and unsupported investment claims.
]);
