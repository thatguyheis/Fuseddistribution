const base = '/coin-review/';
const $ = id => document.getElementById(id);
const make = (tag, text, css) => { const el = document.createElement(tag); if (text) el.textContent = text; if (css) el.className = css; return el; };
const invite = location.hash.slice(1);
if (invite) {
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const result = await fetch(base + 'session', { method: 'POST', headers: { 'X-Invite': invite } });
    if (!result.ok) throw Error(await result.text());
    location.replace(location.pathname);
  } catch (e) { document.body.replaceChildren(make('main', e.message, 'entry')); }
} else if ($('groups')) {
  const stages = ['Sourcing','Gate 1','Voice and scenes','Gate 2','Rendering','Quality check','In progress','Blocked'];
  let role, tasks = [], selected, day, busy = false;
  const api = async (path = '', options) => {
    const res = await fetch(base + 'days/' + day + path, options);
    if (!res.ok) throw Error(await res.text() || 'Request failed. Refresh the log.');
    return res.json();
  };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Los_Angeles', year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(new Date());
  const field = part => today.find(p => p.type === part).value;
  $('day').value = [field('year'),field('month'),field('day')].join('-');
  for (const name of stages) $('stage').add(new Option(name,name));
  function draw() {
    $('role').textContent = role === 'reviewer' ? 'Nick · Reviewer' : 'Sam · Production';
    $('groups').replaceChildren();
    for (const [start,end,name] of [[1,5,'Primary auction videos'],[6,8,'Specialized projects']]) {
      const group = make('div', '', 'group');
      const head = make('div', '', 'group-head');
      const received = tasks.filter(t => t.slot >= start && t.slot <= end && ['In review','Approved'].includes(t.status)).length;
      head.append(make('h3',name),make('span',received + ' / ' + (end-start+1) + ' submitted','count'));
      group.append(head);
      for (let slot=start; slot<=end; slot++) {
        const t = tasks.find(t => t.slot === slot) || { slot, status:'Open', version:0 };
        const b = make('button','','item');
        const label = make('span');
        const desc = slot <= 5 ? 'Lot video ' + slot : 'Project ' + (slot-5);
        label.append(make('b', t.title || desc));
        if (t.title) label.append(make('small',[t.lot ? 'Lot ' + t.lot : desc,t.stage].filter(Boolean).join(' · ')));
        const css = {'In review':'pending','Approved':'approved','Changes requested':'changes'}[t.status] || '';
        b.append(label,make('span',t.status,'tag ' + css));
        b.onclick = () => open(t,desc);
        group.append(b);
      }
      $('groups').append(group);
    }
  }
  async function load() {
    if (!$('day').value) return;
    const expected = day = $('day').value;
    $('status').textContent = 'Loading shift…';
    $('groups').replaceChildren();
    try {
      const data = await api();
      if (expected !== day) return;
      role=data.role; tasks=data.tasks; draw();
      $('status').textContent = role === 'reviewer' ? 'Open a submission to view the file and leave a decision.' : 'Select a row to log work or submit a finished file.';
    } catch(e) { if (day === expected) $('status').textContent=e.message; }
  }
  function action(label, name, secondary=false) {
    const btn=make('button',label,secondary?'quiet':'');
    btn.type='submit'; btn.value=name; $('actions').append(btn);
  }
  function open(t,desc) {
    selected=t;
    const canEdit=role==='worker' && !['In review','Approved'].includes(t.status);
    $('taskForm').reset(); $('actions').replaceChildren(); $('existing').replaceChildren(); $('formMsg').textContent='';
    $('slotLabel').textContent=desc + ' · ' + t.status;
    $('taskHeading').textContent=t.title || desc;
    for (const id of ['title','lot','source','notes','stage']) {
      $(id).value=t[id] || (id==='stage' ? (t.slot<=5?'Sourcing':'In progress') : '');
      $(id).disabled=!canEdit;
    }
    $('lotFields').hidden=t.slot>5;
    $('lot').required=$('source').required=t.slot<=5;
    $('previous').hidden=!t.feedback;
    $('previous').textContent=t.feedback ? 'Reviewer feedback · ' + t.feedback : '';
    $('uploadControls').hidden=!canEdit;
    $('reviewControls').hidden=role!=='reviewer' || t.status!=='In review';
    $('file').accept=t.slot<=5 ? '.mp4' : '.mp4,.zip,.png,.jpg,.jpeg';
    $('formats').textContent=t.slot<=5 ? 'MP4 video' : 'MP4 video, ZIP asset kit, JPEG or PNG';
    if (t.media) {
      const src=base+'days/'+day+'/'+t.slot+'/media?v='+encodeURIComponent(t.media);
      if (t.type==='video/mp4') {
        const v=make('video'); v.controls=true; v.preload='metadata'; v.playsInline=true; v.src=src; $('existing').append(v);
      } else if (t.type.startsWith('image/')) {
        const i=make('img'); i.alt=t.title; i.src=src; $('existing').append(i);
      } else { const a=make('a','Download submitted ZIP'); a.href=src; $('existing').append(a); }
    }
    if (canEdit) { action('Save work log','save',true); action('Submit for review','submit'); }
    if (!$('reviewControls').hidden) { action('Request changes','changes',true); action('Approve','approve'); }
    $('editor').showModal();
  }
  $('taskForm').onsubmit=async e=>{
    e.preventDefault(); if (busy) return;
    const intent=e.submitter?.value;
    if (!intent) return;
    const route='/'+selected.slot;
    const send=(path,body)=>api(route+path,{method:'POST',headers:{'Content-Type':'application/json','If-Match':String(selected.version)},body:JSON.stringify(body)});
    busy=true; $('actions').querySelectorAll('button').forEach(b=>b.disabled=true); $('close').disabled=true;
    try {
      if (['changes','approve'].includes(intent)) {
        await send('/decision',{status:intent==='approve'?'Approved':'Changes requested', feedback:$('feedback').value});
      } else {
        const f=$('file').files[0];
        if (intent==='submit' && (!f || f.size<12 || f.size>=25000000)) throw Error('Choose a finished file smaller than 25 MB.');
        selected=await send('',Object.fromEntries(['title','lot','source','notes','stage'].map(k=>[k,$(k).value])));
        if (intent==='submit') {
          const types={mp4:'video/mp4',zip:'application/zip',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'};
          $('formMsg').textContent='Uploading file…';
          await api(route+'/media',{method:'POST',headers:{'Content-Type':types[f.name.split('.').pop().toLowerCase()]||'application/octet-stream','If-Match':String(selected.version)},body:f});
        }
      }
      $('editor').close(); await load();
    } catch(err) { $('formMsg').textContent=err.message; }
    finally { busy=false; $('close').disabled=false; $('actions').querySelectorAll('button').forEach(b=>b.disabled=false); }
  };
  $('editor').addEventListener('cancel',e=>{if (busy) e.preventDefault();});
  $('editor').addEventListener('close',()=> $('existing').replaceChildren());
  $('close').onclick=()=>$('editor').close();
  $('refresh').onclick=load; $('day').onchange=load; await load();
}
