import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export function assertVisualReview(root,slug) {
 const dir=join(root,'video/out',slug);
 const review=JSON.parse(readFileSync(join(dir,'visual-review.json'),'utf8'));
 const hash=createHash('sha256').update(readFileSync(join(dir,slug+'.mp4'))).digest('hex');
 const baseValid=review.slug===slug && review.pass===true && review.videoSha256===hash && Number.isFinite(Date.parse(review.reviewedAt)) && Array.isArray(review.frames) && review.frames.length>=3;
 const automatedV1=review.policy==='encoded-contact-sheet-visual-qa-v1'
  && review.model==='gemma3:4b'
  && typeof review.contactSheetSha256==='string'
  && /^[a-f0-9]{64}$/.test(review.contactSheetSha256)
  && Array.isArray(review.issues) && review.issues.length===0
  && review.frames.length===6
  && review.frames.every(frame=>frame.pass===true&&frame.contactSheetSha256===review.contactSheetSha256&&Number.isFinite(frame.sampleSeconds))
  && (()=>{try{return createHash('sha256').update(readFileSync(join(dir,'visual-review-contact-sheet.jpg'))).digest('hex')===review.contactSheetSha256;}catch{return false;}})();
 const automatedV2=review.policy==='encoded-full-resolution-frame-visual-qa-v2'
  && review.model==='gemma3:4b'
  && typeof review.contactSheetSha256==='string'
  && /^[a-f0-9]{64}$/.test(review.contactSheetSha256)
  && Array.isArray(review.issues) && review.issues.length===0
  && review.frames.length===6
  && review.frames.every(frame=>frame.pass===true&&Array.isArray(frame.issues)&&frame.issues.length===0&&Number.isFinite(frame.sampleSeconds))
  && (()=>{try{return createHash('sha256').update(readFileSync(join(dir,'visual-review-contact-sheet.jpg'))).digest('hex')===review.contactSheetSha256;}catch{return false;}})();
 const automated=review.reviewer==='automated-local-vision-v1' && (automatedV1||automatedV2);
 if(!baseValid || (review.reviewer==='automated-local-vision-v1'&&!automated)) throw Error(slug+': current encoded visual review is missing, blocked or stale');
 return review;
}
