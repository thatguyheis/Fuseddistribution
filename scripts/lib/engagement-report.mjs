export const PLATFORMS = ['youtube','instagram','twitter','facebook'];
export function commentRate(comments,views) {return Number.isFinite(comments)&&comments>=0&&Number.isFinite(views)&&views>0?Number((comments/views*100).toFixed(3)):null;}
export function normalizeMetric(row) {
  const value=key=>Number.isFinite(row[key])?row[key]:null;
  return {postId:row.postId,platform:row.platform,slug:row.slug||null,sentAt:row.sentAt,observedAt:row.metricsUpdatedAt||null,views:value('views'),comments:value('comments'),shares:value('shares'),saves:value('saves'),follows:Number.isFinite(row.follows)?row.follows:row.rawMetrics?.find(m=>m.type==='follows')?.value??null,commentRate:commentRate(value('comments'),value('views'))};
}
export function communityDigest(input, now=Date.now()) {
  const fresh=Number.isFinite(Date.parse(input?.capturedAt))&&now-Date.parse(input.capturedAt)>=0&&now-Date.parse(input.capturedAt)<=24*3600_000;
  const missing=PLATFORMS.filter(platform=>!fresh||input?.coverage?.[platform]?.complete!==true);
  const unique=new Map();
  for(const row of input?.comments||[]) {
    if(!PLATFORMS.includes(row.platform)||!row.id||!row.postId||typeof row.text!=='string'||row.parentCommentId)continue;
    const published=Date.parse(row.postPublishedAt);if(!Number.isFinite(published)||published<now-7*86400_000||published>now)continue;
    if(!/^https:\/\//.test(row.url||''))continue;
    unique.set(`${row.platform}:${row.id}`,row);
  }
  const records=[...unique.values()].map(row=>({...row,rank:row.suspectedSpam?2:row.text.includes('?')?0:1,replied:!!row.replyEvidence?.id&&Number.isFinite(Date.parse(row.replyEvidence.at))}));
  const flagged=records.filter(row=>row.flaggedAt&&!row.suspectedSpam);
  const flaggedWeek=flagged.filter(row=>Date.parse(row.flaggedAt)>=now-7*86400_000&&Date.parse(row.flaggedAt)<=now);
  const pending=records.filter(row=>!row.replied&&!row.suspectedSpam).sort((a,b)=>a.rank-b.rank||String(a.createdAt).localeCompare(String(b.createdAt)));
  return {capturedAt:input?.capturedAt||null,fresh,missingPlatforms:missing,pending,spam:records.filter(r=>r.suspectedSpam),topFive:pending.slice(0,5),flagged:flaggedWeek.length,replied:flaggedWeek.filter(r=>r.replied).length,replyRate:missing.length||!flaggedWeek.length?null:100*flaggedWeek.filter(r=>r.replied).length/flaggedWeek.length};
}
export function opinionMix(entries, now=Date.now()) {
 const rows=entries.filter(row=>Date.parse(row.date)>=now-28*86400_000&&Date.parse(row.date)<=now);
 const opinions=rows.filter(row=>row.kind==='opinion').length;
 return {total:rows.length,opinions,unknown:rows.filter(row=>!['opinion','educate'].includes(row.kind)).length,ratio:rows.length?opinions/rows.length:null,target:.25,additionalOpinionsNeeded:Math.max(0,Math.ceil((rows.length-4*opinions)/3))};
}
