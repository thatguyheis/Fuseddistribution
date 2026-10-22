import { existsSync, readFileSync } from 'node:fs';

const PLACEHOLDER_PATTERN = /\[[^\]]+\]|\b(?:TODO|TBD)\b/i;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContentPlan(plan, expectedSlug = '') {
  const errors = [];
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return ['content plan must be a JSON object'];
  }
  if (plan.version !== 1) errors.push('version must be 1');
  if (!cleanString(plan.slug)) errors.push('slug is required');
  if (expectedSlug && plan.slug !== expectedSlug) errors.push(`slug must equal ${expectedSlug}`);
  if (!cleanString(plan.title)) errors.push('title is required');
  if (!['silver', 'tech'].includes(plan.brand)) errors.push('brand must be silver or tech');
  if (!cleanString(plan.readerPromise)) errors.push('readerPromise is required');

  const coinHistory = plan.editorialProfile === 'coin-history';
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  if (coinHistory ? sections.length < 4 || sections.length > 8 : sections.length < 8 || sections.length > 12) {
    errors.push(coinHistory ? 'coin-history sections must contain 4-8 items' : 'sections must contain 8-12 items');
  }
  const ids = new Set();
  const headings = new Set();
  let totalTargetWords = 0;
  for (const [index, section] of sections.entries()) {
    const prefix = `sections[${index}]`;
    const id = cleanString(section?.id);
    const heading = cleanString(section?.heading);
    if (!/^s\d{2}$/.test(id)) errors.push(`${prefix}.id must match sNN`);
    if (ids.has(id)) errors.push(`${prefix}.id must be unique`);
    ids.add(id);
    if (!heading) errors.push(`${prefix}.heading is required`);
    if (headings.has(heading.toLowerCase())) errors.push(`${prefix}.heading must be unique`);
    headings.add(heading.toLowerCase());
    if (!cleanString(section?.readerQuestion)) errors.push(`${prefix}.readerQuestion is required`);
    if (!cleanString(section?.purpose)) errors.push(`${prefix}.purpose is required`);
    if (!Array.isArray(section?.keyPoints) || section.keyPoints.length < 2 || section.keyPoints.length > 4) {
      errors.push(`${prefix}.keyPoints must contain 2-4 items`);
    }
    if (section?.evidenceClaims !== undefined
      && (!Array.isArray(section.evidenceClaims) || section.evidenceClaims.length > (coinHistory ? 3 : 2))) {
      errors.push(`${prefix}.evidenceClaims must contain 0-${coinHistory ? 3 : 2} exact research claims`);
    }
    const targetWords = Number(section?.targetWords);
    const minimumSectionWords = coinHistory ? 100 : 130;
    if (!Number.isInteger(targetWords) || targetWords < minimumSectionWords || targetWords > 190) {
      errors.push(`${prefix}.targetWords must be an integer from ${minimumSectionWords}-190`);
    } else {
      totalTargetWords += targetWords;
    }
    for (const value of [heading, section?.readerQuestion, section?.purpose, ...(section?.keyPoints || []), ...(section?.evidenceClaims || [])]) {
      if (PLACEHOLDER_PATTERN.test(cleanString(value))) errors.push(`${prefix} contains placeholder text`);
      if (/[—–]/.test(cleanString(value))) errors.push(`${prefix} contains disallowed dash punctuation`);
    }
  }
  if (totalTargetWords < (coinHistory ? 500 : 1040)) {
    errors.push(`section targetWords must total at least ${coinHistory ? 500 : 1040}`);
  }

  const reel = plan.reel;
  if (!reel || typeof reel !== 'object' || Array.isArray(reel)) {
    errors.push('reel is required');
  } else {
    if (!cleanString(reel.topic)) errors.push('reel.topic is required');
    if (!cleanString(reel.promise)) errors.push('reel.promise is required');
    const reelIds = Array.isArray(reel.sectionIds) ? reel.sectionIds : [];
    if (reelIds.length < 4 || reelIds.length > 6) errors.push('reel.sectionIds must contain 4-6 section IDs');
    if (new Set(reelIds).size !== reelIds.length) errors.push('reel.sectionIds must be unique');
    for (const id of reelIds) if (!ids.has(id)) errors.push(`reel.sectionIds contains unknown ID ${id}`);
    const reelWords = sections
      .filter((section) => reelIds.includes(section.id))
      .reduce((sum, section) => sum + (Number(section.targetWords) || 0), 0);
    if (reelWords < 540) errors.push('reel section cluster must target at least 540 words');

    // Legacy plans may omit shortTopics. New plans should declare three
    // independently useful short subjects without replacing the long form.
    if (reel.shortTopics !== undefined) {
      const shortTopics = Array.isArray(reel.shortTopics) ? reel.shortTopics : [];
      if (shortTopics.length !== 3) errors.push('reel.shortTopics must contain exactly 3 items');
      const shortIds = new Set();
      for (const [index, short] of shortTopics.entries()) {
        const prefix = `reel.shortTopics[${index}]`;
        const id = cleanString(short?.id);
        const topic = cleanString(short?.topic);
        const promise = cleanString(short?.promise);
        const idsForShort = Array.isArray(short?.sectionIds) ? short.sectionIds : [];
        if (!/^short-\d{2}$/.test(id)) errors.push(`${prefix}.id must match short-NN`);
        if (shortIds.has(id)) errors.push(`${prefix}.id must be unique`);
        shortIds.add(id);
        if (!topic) errors.push(`${prefix}.topic is required`);
        if (!promise) errors.push(`${prefix}.promise is required`);
        if (idsForShort.length < 1 || idsForShort.length > 3) errors.push(`${prefix}.sectionIds must contain 1-3 section IDs`);
        if (new Set(idsForShort).size !== idsForShort.length) errors.push(`${prefix}.sectionIds must be unique`);
        for (const sectionId of idsForShort) if (!ids.has(sectionId)) errors.push(`${prefix}.sectionIds contains unknown ID ${sectionId}`);
        for (const value of [topic, promise, ...idsForShort]) {
          if (PLACEHOLDER_PATTERN.test(cleanString(value))) errors.push(`${prefix} contains placeholder text`);
          if (/[—–]/.test(cleanString(value))) errors.push(`${prefix} contains disallowed dash punctuation`);
        }
      }
    }
  }

  return [...new Set(errors)];
}

export function readContentPlan(path, expectedSlug = '') {
  if (!existsSync(path)) throw new Error(`content plan not found: ${path}`);
  const plan = JSON.parse(readFileSync(path, 'utf8'));
  const errors = validateContentPlan(plan, expectedSlug);
  if (errors.length) throw new Error(`invalid content plan:\n- ${errors.join('\n- ')}`);
  return plan;
}
