import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
export const CTA_SLOTS = ['reserve', 'newsletter', 'engagement'];
export function nextSlot(previous) {return CTA_SLOTS[(CTA_SLOTS.indexOf(previous) + 1) % 3];}
export function inferSlot(row) {
  if (CTA_SLOTS.includes(row?.cta_slot)) return row.cta_slot;
  const text = row?.text || '';
  if (/fuseddistribution\.com\/newsletter\//i.test(text)) return 'newsletter';
  if (/fuseddistribution\.com\/(?:reserve\/|#contact)/i.test(text)) return 'reserve';
  return null;
}
export function confirmedCtaHistory(root) {
  return ['youtube','x','instagram'].flatMap(platform => {
    try {return JSON.parse(readFileSync(join(root,`.buffer-${platform}-scheduled.json`))).scheduled || [];}
    catch(e) {if(e.code === 'ENOENT') return [];throw e;}
  }).filter(row => ['scheduled','sending','sent'].includes(row.status) && Number.isFinite(Date.parse(row.dueAt || row.sentAt)));
}
export function ctaCaption({title, question, brand, slot, maxLength=2200}) {
  if (!CTA_SLOTS.includes(slot)) throw new Error('Invalid cta_slot');
  if (!question?.trim().endsWith('?') || /https?:\/\//i.test(question)) throw new Error('CTA requires an editorial question without a URL');
  const pitch = slot === 'reserve' ? (brand === 'silver' ? 'Explore Fused Reserve: https://fuseddistribution.com/reserve/' : 'Discuss your business website: https://fuseddistribution.com/#contact') : slot === 'newsletter' ? `Get the ${brand === 'silver' ? 'silver' : 'tech'} newsletter: https://fuseddistribution.com/newsletter/${brand === 'silver' ? 'silver' : 'tech'}/` : '';
  const tail = [question.trim(),pitch].filter(Boolean).join('\n\n');
  if (tail.length > maxLength) throw new Error('CTA question is too long for this channel');
  const heading = String(title || '').trim();
  return heading.length + tail.length + 2 <= maxLength ? `${heading}\n\n${tail}` : tail;
}
export function assertCtaOrder(job, rows) {
  if (!CTA_SLOTS.includes(job.cta_slot)) throw new Error(`${job.slug}: missing cta_slot; replan with CTA rotation`);
  const at = Date.parse(job.dueAt);
  if (!Number.isFinite(at)) throw new Error('CTA rotation requires a valid schedule');
  const timeline = rows.filter(r => r.channelId === job.channelId && Number.isFinite(Date.parse(r.dueAt || r.sentAt))).sort((a,b)=>Date.parse(a.dueAt||a.sentAt)-Date.parse(b.dueAt||b.sentAt));
  const before = timeline.filter(r=>Date.parse(r.dueAt||r.sentAt)<at).at(-1);
  const after = timeline.find(r=>Date.parse(r.dueAt||r.sentAt)>at);
  if (before && inferSlot(before) && job.cta_slot !== nextSlot(inferSlot(before))) throw new Error(`${job.slug}: CTA cycle conflicts with preceding post; replan`);
  if (after && inferSlot(after) && inferSlot(after) !== nextSlot(job.cta_slot)) throw new Error(`${job.slug}: CTA cycle conflicts with following post; replan`);
  const caption = job.createPostPayload?.text || '';
  if (job.cta_slot === 'engagement' && /https?:\/\//i.test(caption)) throw new Error('Engagement-only caption cannot contain links');
  if (job.cta_slot === 'reserve' && !(job.cta_brand === 'tech' ? caption.includes('https://fuseddistribution.com/#contact') : caption.includes('https://fuseddistribution.com/reserve/'))) throw new Error('Reserve CTA destination missing');
  if (job.cta_slot === 'newsletter' && !/https:\/\/fuseddistribution\.com\/newsletter\/(silver|tech)\//.test(caption)) throw new Error('Newsletter CTA destination missing');
}
export function rotateQueue(queue, root, history=confirmedCtaHistory(root)) {
  const rows = [...history];
  for (const job of [...queue.selected].sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt))) {
    const previous = rows.filter(r=>r.channelId===job.channelId && Date.parse(r.dueAt||r.sentAt)<Date.parse(job.dueAt)).sort((a,b)=>Date.parse(a.dueAt||a.sentAt)-Date.parse(b.dueAt||b.sentAt)).at(-1);
    const copy = JSON.parse(readFileSync(join(root,'public/blog',job.slug,'social-copy.json')));
    let question = copy.discussion_question;
    try {
      const override = JSON.parse(readFileSync(join(root,'ops/engagement/cta-question-overrides.json')))[job.slug];
      if (override) {
        const hash=createHash('sha256').update(readFileSync(join(root,'public/blog',job.slug,'social-copy.json'))).digest('hex');
        if (override.reviewedBy !== 'Codex' || override.socialCopySha256 !== hash) throw new Error('Caption override requires renewed editorial review');
        question=override.question;
      }
    } catch(error) {if(error.code !== 'ENOENT') throw error;}
    const meta = JSON.parse(readFileSync(join(root,'public/blog',job.slug,'meta.json')));
    job.cta_brand = meta.brand === 'silver' ? 'silver' : 'tech';
    job.cta_slot = nextSlot(inferSlot(previous));
    const text = ctaCaption({title:meta.title,question,brand:meta.brand,slot:job.cta_slot,maxLength:job.channelId==='6a3e73fb5ab6d2f10674b516'?280:2200});
    job.createPostPayload.text=text;job.text=text;job.description=text;job.textLength=text.length;
    assertCtaOrder(job,rows);rows.push(job);
  }
  return queue;
}
