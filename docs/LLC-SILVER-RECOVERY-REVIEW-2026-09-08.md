# LLC silver tax recovery review

Topic: `silver-in-an-llc-vs-personal-ownership-tax-differences`, queued August 4.
Stage: corporate classification scope reviewed and candidate corrected; publication artifacts and final approval pending. Not published.

The first draft incorrectly equates LLC ownership with inventory, ordinary income and self-employment taxation, claims double taxation for sole proprietorship treatment, suggests an automatic S corporation tax benefit, applies stock-style long-term rates to silver, and claims hobby holdings may escape gains tax. Its deterministic QA pass does not constitute editorial approval. The second draft is substantially better but overstates structure recommendations and legal/organizational benefits.

Sources read September 8:

- [IRS single member LLC guidance](https://www.irs.gov/businesses/small-businesses-self-employed/single-member-limited-liability-companies): federal classification depends on ownership and elections; income-tax disregard differs from employment/excise treatment; qualified community-property spouse cases need separate attention.
- [Publication 3402](https://www.irs.gov/publications/p3402): entity reporting and classification changes. Do not infer transfer or election consequences solely from an LLC name.
- [Topic 409](https://www.irs.gov/taxtopics/tc409): maximum collectibles rate and short-term distinction.
- [Publication 550](https://www.irs.gov/publications/p550): silver bullion as a collectible; investment versus dealer holdings.
- [Publication 544](https://www.irs.gov/publications/p544): capital assets versus metal held for sale by a dealer.
- [Publication 551](https://www.irs.gov/publications/p551): cost and adjusted basis records.

Candidate: `.workflow-state/llc-tax-recovery-candidate-2026-09-08.md`, 1,628 words. Removes automatic tax savings, broad structure recommendations and unsupported liability benefits. Qualifies 28% as a maximum rate on relevant net gains rather than sale proceeds. Preserves both rejected candidates unchanged.

Corporate scope reviewed at 11:37 Pacific. Added Publication 542 and the Schedule D instructions for Form 1120-S as primary sources. The candidate now confines the opening collectibles-rate statement to individuals, separates C corporation tax/distributions, and explains that S corporation reporting preserves collectibles information. Partnership wording now explicitly depends on classification. Removed a universal cost-benefit assertion, qualified state obligations, and replaced bare resource URLs with descriptive links. All three distinct internal links resolve locally. Candidate hash and checks are recorded in `.workflow-state/llc-tax-review-checkpoint-2026-09-08.json`.

Before publication: build metadata with actual publication date and original queue date separate; rebuild artwork and synchronized reel; pass editorial and deterministic checks; scoped deployment and full live proof. Do not treat this candidate as approved input for the renderer.
