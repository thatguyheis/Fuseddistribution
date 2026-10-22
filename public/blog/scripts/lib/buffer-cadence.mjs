const zone = 'America/Los_Angeles';
export const localDay = value => new Intl.DateTimeFormat('en-CA', {timeZone: zone}).format(new Date(value));
function slot(day, minute) {
  const [y,m,d] = day.split('-').map(Number);
  const desired = Date.UTC(y,m-1,d,13,minute);
  let timestamp = desired;
  for(let i=0;i<3;i++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(timestamp)).map(x=>[x.type,x.value]));
    timestamp += desired-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
  }
  return new Date(timestamp).toISOString();
}
export function assertFreeSlot(posts, job) {
  const related=posts.filter(p=>p.channelId===job.channelId && ['scheduled','sending','sent'].includes(p.status));
  const day=localDay(job.dueAt);
  if(related.some(p=>Date.parse(p.dueAt)===Date.parse(job.dueAt))) throw Error('Occupied Buffer channel/time');
  if(related.filter(p=>localDay(p.sentAt || p.dueAt)===day).length>=3) throw Error('Daily Buffer cadence already filled');
}
export function nextFreeSlots(posts, channelId, count, now=new Date()) {
  const assigned=[...posts], result=[];
  const today=localDay(now), noon=Date.parse(today+'T12:00:00Z');
  for(let d=0;d<60 && result.length<count;d++) {
    const day=new Date(noon+d*86400000).toISOString().slice(0,10);
    for(const minute of [0,20,40]) {
      const dueAt=slot(day,minute);
      if(Date.parse(dueAt)<now.getTime()+15*60000) continue;
      try {assertFreeSlot(assigned,{channelId,dueAt});} catch {continue;}
      assigned.push({channelId,dueAt,status:'scheduled'});result.push(dueAt);
      if(result.length===count) break;
    }
  }
  if(result.length!==count) throw Error('No available cadence slots within 60 days');
  return result;
}
export function repairCadence(posts, now=new Date()) {
  const kept=[], overflow=[];
  for(const p of [...posts].sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt)||a.id.localeCompare(b.id))) {
    if(p.status!=='scheduled' || Date.parse(p.dueAt)<now.getTime()+15*60000) {kept.push(p);continue;}
    try {assertFreeSlot(kept,p);kept.push(p);} catch {overflow.push(p);}
  }
  return overflow.map(p=>{
    const dueAt=nextFreeSlots(kept,p.channelId,1,now)[0];
    kept.push({...p,dueAt});return {id:p.id,channelId:p.channelId,from:p.dueAt,dueAt};
  });
}
