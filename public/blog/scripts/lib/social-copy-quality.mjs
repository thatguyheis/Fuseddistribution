const META_INSTRUCTION_PATTERNS = [
  /\bhere (?:are|is)\b.{0,80}\bcaptions?\b/i,
  /\bkeeping to your specifications\b/i,
  /\b(?:the|your) (?:prompt|instructions?) (?:asks?|requested?)\b/i,
  /\bas an ai(?: language model)?\b/i,
  /\bi (?:cannot|can't) (?:provide|create|comply)\b/i,
  /\bbelow (?:are|is) (?:the|your) requested\b/i,
];

function stringLeaves(value, path = 'social-copy') {
  if (typeof value === 'string') return [{ path, value }];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => stringLeaves(child, `${path}.${key}`));
}

export function socialCopyQualityIssues(copy) {
  const issues = [];
  for (const leaf of stringLeaves(copy)) {
    const pattern = META_INSTRUCTION_PATTERNS.find((candidate) => candidate.test(leaf.value));
    if (pattern) issues.push({ path: leaf.path, reason: 'meta_instruction_leak' });
  }
  return issues;
}

export function assertSocialCopyQuality(copy, slug = 'unknown') {
  const issues = socialCopyQualityIssues(copy);
  if (!issues.length) return;
  const fields = issues.map((issue) => issue.path).join(', ');
  throw new Error(`${slug}: social copy contains model meta-instructions in ${fields}`);
}
