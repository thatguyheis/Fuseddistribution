import { z } from "zod";

const text = (minimum, maximum) => z.string().trim().min(minimum).max(maximum);
const sourceUrl = text(1, 500).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Provide an HTTPS source URL without credentials.");

export const ReelBriefSchema = z.object({
  topic: text(3, 200),
  audience: text(3, 200),
  facts: z.array(z.object({
    statement: text(5, 500),
    sourceUrl,
  }).strict()).min(1).max(8),
  callToAction: text(3, 160),
  targetSeconds: z.number().int().min(15).max(90).default(45),
}).strict();

export const DraftSchema = z.object({
  hook: text(1, 200),
  beats: z.array(z.object({
    narration: text(1, 700),
    visual: text(1, 300),
    caption: text(1, 100),
    sourceIndexes: z.array(z.number().int().min(0).max(7)).min(1).max(8),
  }).strict()).min(2).max(5),
  closing: text(1, 200),
}).strict();

export const PrivatePolicySchema = z.object({
  schemaVersion: z.literal(1),
  maxHookWords: z.number().int().min(3).max(20),
  maxCaptionWords: z.number().int().min(3).max(20),
  minBeats: z.number().int().min(2).max(5),
  maxBeats: z.number().int().min(2).max(5),
  minWordsPerSecond: z.number().finite().min(1).max(3),
  maxWordsPerSecond: z.number().finite().min(2).max(4),
  maxClosingWords: z.number().int().min(3).max(30),
}).strict().refine((policy) => policy.minBeats <= policy.maxBeats, {
  message: "The minimum beat count must not exceed the maximum.",
}).refine((policy) => policy.minWordsPerSecond <= policy.maxWordsPerSecond, {
  message: "The minimum speaking rate must not exceed the maximum.",
});

function wordCount(value) {
  return value.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/**
 * Evaluate a candidate locally. Only fixed public messages leave this boundary;
 * policy values and policy validation details must never enter model context.
 */
export function evaluateDraft(draft, brief, policy) {
  const checkedPolicy = PrivatePolicySchema.safeParse(policy);
  if (!checkedPolicy.success) {
    return { passed: false, issues: ["The service policy is unavailable."] };
  }
  const checkedBrief = ReelBriefSchema.safeParse(brief);
  const checkedDraft = DraftSchema.safeParse(draft);
  if (!checkedBrief.success || !checkedDraft.success) {
    return { passed: false, issues: ["The reel brief or draft has an invalid structure."] };
  }

  const rules = checkedPolicy.data;
  const candidate = checkedDraft.data;
  const request = checkedBrief.data;
  const issues = [];
  if (wordCount(candidate.hook) > rules.maxHookWords) {
    issues.push("The opening needs to be shorter.");
  }
  if (candidate.beats.length < rules.minBeats || candidate.beats.length > rules.maxBeats) {
    issues.push("The story structure needs revision.");
  }
  if (candidate.beats.some((beat) => wordCount(beat.caption) > rules.maxCaptionWords)) {
    issues.push("The visible text needs to be shorter.");
  }
  if (candidate.beats.some((beat) => beat.sourceIndexes.some((index) => index >= request.facts.length))) {
    issues.push("A story beat references unavailable evidence.");
  }
  if (wordCount(candidate.closing) > rules.maxClosingWords) {
    issues.push("The closing needs to be shorter.");
  }
  const spokenWords = wordCount(candidate.hook) + wordCount(candidate.closing) +
    candidate.beats.reduce((total, beat) => total + wordCount(beat.narration), 0);
  const speakingRate = spokenWords / request.targetSeconds;
  if (speakingRate < rules.minWordsPerSecond || speakingRate > rules.maxWordsPerSecond) {
    issues.push("The narration needs revision for the requested duration.");
  }
  return { passed: issues.length === 0, issues };
}
