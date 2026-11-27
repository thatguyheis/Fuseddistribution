import {filePicker,photoHeaders} from '/coin-review/file-picker.js';
const base = '/coin-review/';
const $ = id => document.getElementById(id);
const make = (tag, text, css) => { const el = document.createElement(tag); if (text) el.textContent = text; if (css) el.className = css; return el; };
window.addEventListener('hashchange', () => {
  if (/^#[A-Za-z0-9_-]{43}$/.test(location.hash)) location.reload();
});
const invite = location.hash.slice(1);
if (invite) {
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const result = await fetch(base + 'session', { method: 'POST', headers: { 'X-Invite': invite } });
    if (!result.ok) throw Error(await result.text());
    location.replace(location.pathname);
  } catch (e) { document.body.replaceChildren(make('main', e.message, 'entry')); }
} else if ($('groups')) {
  enableWorkflowUpdates();
  const finalStage='Final draft ready for approval and push';
  const draftStage='Draft unfinished';
  const stageFor=t=>[draftStage,finalStage].includes(t.stage) ? t.stage : (['Approved','In review'].includes(t.status) ? finalStage : draftStage);
  let role, tasks = [], selected, day, busy = false;
  const api = async (path = '', options) => {
    const res = await fetch(base + 'days/' + day + path, options);
    if (!res.ok) throw Error(await res.text() || 'Request failed. Refresh the log.');
    return res.json();
  };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Los_Angeles', year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(new Date());
  const field = part => today.find(p => p.type === part).value;
  $('day').value = [field('year'),field('month'),field('day')].join('-');

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
        if (t.title) label.append(make('small',[t.lot ? 'Lot ' + t.lot : desc,t.projectType,stageFor(t)].filter(Boolean).join(' · ')));
        const css = {'In review':'pending','Approved':'approved','Changes requested':'changes'}[t.status] || '';
        b.append(label,make('span',t.publication?.state ? 'Buffer · '+t.publication.state : t.status,'tag ' + css));
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
  const picked=filePicker($('projectFiles'));
  const isPhoto=file=>file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name);
  function open(t,desc) {
    selected=t;
    picked.clear();
    const canEdit=role==='worker' && !['In review','Approved'].includes(t.status);
    $('taskForm').reset(); $('actions').replaceChildren(); $('existing').replaceChildren(); $('formMsg').textContent='';
    $('slotLabel').textContent=desc + ' · ' + t.status;
    $('taskHeading').textContent=t.title || desc;
    for (const id of ['title','lot','hook','cta','notes','stage','projectType']) {
      $(id).value = id==='stage' ? stageFor(t) : id==='projectType' ? (t.projectType || (t.type && t.type!=='video/mp4' ? 'Raw files':'Finished video')) : t[id] || '';
      $(id).disabled=!canEdit;
    }
    $('lotFields').hidden=t.slot>5;
    $('projectFields').hidden=t.slot<=5;
    $('lot').required=t.slot<=5;
    $('previous').hidden=!t.feedback;
    $('previous').textContent=t.feedback ? 'Reviewer feedback · ' + t.feedback : '';
    $('uploadControls').hidden=!canEdit;
    $('reviewControls').hidden=role!=='reviewer' || t.status!=='In review';
    function configureEntry() {
      const reel=t.slot<=5 || $('projectType').value==='Finished video';
      const ready=$('stage').value===finalStage;
      $('hook').required=$('cta').required=canEdit && reel && ready;
      $('file').multiple=t.slot>5;
      $('file').onchange=()=>{
        if(t.slot>5){picked.add($('file').files);$('file').value='';}
      };
      $('file').accept=t.slot<=5 ? '.mp4' : (reel ? '.mp4,image/*' : '.mp4,.mov,.zip,image/*');
      $('formats').textContent=reel ? (t.slot<=5 ? 'MP4 video' : 'Choose an MP4 and any supporting photos. You can add more photos before submitting.') : 'Choose multiple photos together or add them in batches. You can also attach a video or ZIP.';
      if (canEdit) {
        $('actions').replaceChildren();
        action(ready ? 'Submit for review' : 'Save unfinished draft', ready ? 'submit':'save');
      }
    }
    configureEntry();
    $('stage').onchange=$('projectType').onchange=configureEntry;
    const pub=t.publication;
    const plan=pub?.plan;
    $('bufferControls').hidden=role!=='reviewer' || !['Approved','In review'].includes(t.status) || t.type!=='video/mp4' || (t.projectType && t.projectType!=='Finished video') || pub?.state==='Scheduled';
    $('bufferControls').open=false;
    $('bufferControls').querySelector('button').disabled=$('bufferControls').hidden;
    $('bufferControls').querySelector('button').textContent=pub?.attempted ? 'Retry Buffer push' : t.status==='Approved' ? 'Push to Buffer' : 'Approve and push to Buffer';
    $('receipt').hidden=!pub;
    $('receipt').textContent=pub ? ['Buffer · '+pub.state,pub.message,...(pub.posts || []).map(p=>[p.service,p.status,p.due_at,p.post_id,p.error].filter(Boolean).join(' · '))].filter(Boolean).join('\n') : '';
    $('caption').value=plan?.caption ?? ([t.hook || t.title,t.cta,t.slot<=5?'https://auctions.coinssince1994.com':''].filter(Boolean).join('\n\n'));
    $('ytTitle').value=plan?.youtube_title ?? (t.title || '').slice(0,100);
    $('timezone').textContent=Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (plan?.due_at) {
      const d=new Date(plan.due_at);
      $('due').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    }
    for(const box of document.querySelectorAll('.channels input')) {
      box.checked=plan ? plan.channels.includes(box.value) : true;
      box.disabled=!!pub?.attempted;
    }
    if (t.media) {
      const src=base+'days/'+day+'/'+t.slot+'/media?v='+encodeURIComponent(t.media);
      if (t.type.startsWith('video/')) {
        const v=make('video'); v.controls=true; v.preload='metadata'; v.playsInline=true; v.src=src; $('existing').append(v);
      } else if (t.type.startsWith('image/')) {
        const i=make('img'); i.alt=t.title; i.src=src; $('existing').append(i);
      }
      const link=make('a','Download submitted file'); link.href=src+'&download=1'; $('existing').append(link);
    }

    for(const [index,photo] of (t.photos || []).entries()){
      const row=make('p');
      const link=make('a','Photo '+(index+1)+' · '+photo.name);
      link.href=base+'days/'+day+'/'+t.slot+'/photos?id='+photo.id;
      link.target='_blank';link.rel='noopener';
      const download=make('a','Download');
      download.href=link.href+'&download=1';
      row.append(link,document.createTextNode(' · '),download);$('existing').append(row);
    }
    if (!$('reviewControls').hidden) { action('Request changes','changes',true); action('Approve','approve'); }
    $('editor').showModal();
  }
  $('taskForm').onsubmit=async e=>{
    e.preventDefault(); if (busy) return;
    const intent=e.submitter?.value;
    if (!intent || (intent==='publish' && (!$('bufferControls').open || $('bufferControls').hidden))) return;
    const route='/'+selected.slot;
    const send=(path,body)=>api(route+path,{method:'POST',headers:{'Content-Type':'application/json','If-Match':String(selected.version)},body:JSON.stringify(body)});
    busy=true; $('file').disabled=true; $('projectFiles').inert=true; $('bufferControls').querySelector('button').disabled=true; $('actions').querySelectorAll('button').forEach(b=>b.disabled=true); $('close').disabled=true;
    try {
      if (intent==='publish') {
        const due = new Date($('due').value);
        if (!Number.isFinite(+due)) throw Error('Choose a publishing date and time.');
        const data = await send('/publish',{caption:$('caption').value, youtube_title:$('ytTitle').value,
          channels:Array.from(document.querySelectorAll('.channels input:checked'), box=>box.value),due_at:due.toISOString()});
        if (data.publication?.state!=='Scheduled') {
          $('editor').close();
          await load();
          open(data, $('slotLabel').textContent.split(' · ')[0]);
          $('bufferControls').open=true;
          $('formMsg').textContent=data.publication?.message || 'Check the channel results before retrying.';
          return;
        }
      } else if (['changes','approve'].includes(intent)) {
        await send('/decision',{status:intent==='approve'?'Approved':'Changes requested', feedback:$('feedback').value});
      } else {
        const entries=picked.entries;
        const photos=entries.filter(p=>isPhoto(p.file));
        const primary=entries.filter(p=>!isPhoto(p.file));
        if(primary.length>1)throw Error('Choose one video or ZIP alongside your photos.');
        const f=selected.slot<=5 ? $('file').files[0] : primary[0]?.file;
        const reel=selected.slot<=5 || $('projectType').value==='Finished video';
        if(intent==='submit' && reel && !(f ? /\.mp4$/i.test(f.name) : selected.type==='video/mp4'))throw Error('Choose the finished MP4 to submit.');
        if(intent==='submit' && !f && !selected.media && !photos.length && !selected.photos?.length)throw Error('Choose files to submit.');
        if([...(f?[f]:[]),...photos.map(p=>p.file)].some(file=>file.size<1 || file.size>=25000000))throw Error('Each file must be smaller than 25 MB.');
        selected=await send('',Object.fromEntries(['title','lot','hook','cta','notes','stage','projectType'].map(k=>[k,$(k).value])));
        for(const [index,item] of photos.entries()){
          if(selected.photos?.some(p=>p.id===item.id))continue;
          $('formMsg').textContent='Uploading photo '+(index+1)+' of '+photos.length+'…';
          selected=await api(route+'/photos?id='+item.id,{method:'POST',headers:{...photoHeaders(item),'If-Match':String(selected.version)},body:item.file});
        }
        if (f) {
          const types={mp4:'video/mp4',mov:'video/quicktime',zip:'application/zip',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
          $('formMsg').textContent='Uploading file…';
          await api(route+'/media',{method:'POST',headers:{'Content-Type':types[f.name.split('.').pop().toLowerCase()]||'application/octet-stream','If-Match':String(selected.version)},body:f});
        } else if (intent==='submit') {
          await send('/submit',{});
        }
      }
      $('editor').close(); await load();
    } catch(err) { $('formMsg').textContent=err.message; }
    finally { busy=false; $('file').disabled=false; $('projectFiles').inert=false; $('bufferControls').querySelector('button').disabled=$('bufferControls').hidden; $('close').disabled=false; $('actions').querySelectorAll('button').forEach(b=>b.disabled=false); }
  };
  $('editor').addEventListener('cancel',e=>{if (busy) e.preventDefault();});
  $('editor').addEventListener('close',()=> { if (!$('editor').open) $('existing').replaceChildren(); });
  $('close').onclick=()=>$('editor').close();
  $('refresh').onclick=load; $('day').onchange=load; await load();
}

function enableWorkflowUpdates() {
  const check = $('workflowCheck');
  if (!check) return;
  const dialog = $('workflowDialog');
  let release;
  function display(data) {
    release = data;
    const available = data.status === 'update_available';
    check.classList.toggle('available', available);
    check.textContent = available ? 'Update available · Get setup instructions' : 'Check for updates';
    $('workflowSummary').textContent = available
      ? data.version + ' is ready to download.' + (data.installed ? ' Last confirmed: ' + data.installed + '.' : ' First installation for Sam.')
      : data.version + ' is confirmed installed.';
    $('workflowVersion').textContent = data.version;
    $('workflowChanges').textContent = data.changes;
    $('workflowDownload').href = base + 'workflow/archive?version=' + encodeURIComponent(data.version);
    $('confirmInstall').hidden = !available;
    $('setupPrompt').value = [
      'Install the current Coins & Auctions Since 1994 video workflow in this coin project on my workstation. The desk showed ' + data.version + '. Complete the setup in this session.',
      'Use the existing Fused MCP connection (fused_publish or fused_reel) to call get_video_workflow_update with no arguments to obtain the latest version, download_url and SHA-256. If the connection needs configuration, use the project’s existing FUSED_INSTRUCTIONS_TOKEN environment credential and https://fused-client-instructions.luxraycoco.workers.dev/mcp. Keep the credential out of chat, files you commit and command output.',
      'Download the ZIP from that exact Fused HTTPS host using the existing bearer credential. Verify its SHA-256 against the MCP result before extracting. Install it in .fused-workflows/<returned-version>/ under this project. Preserve prior versions and my media. If this version is already there, verify its files against the checked archive and reuse it.',
      'Read the release’s START-HERE.md. From the coin project root, use the project Python environment to run python .fused-workflows/<returned-version>/tools/preview.py check-env, substituting the actual version. Resolve missing dependencies in the project’s local environment and rerun the check. If access or a required permission is missing, tell me exactly what is needed.',
      'Only after check-env passes, record the exact installed version in .fused-workflows/installed-version.txt, show the bundled example contact sheet and report the version, folder and check result. Use this release for future lot previews, including its lint, scene checks and owner approvals. Stop at setup and preview.'
    ].join('\n\n');
  }
  async function refresh(open = false) {
    check.disabled = true;
    try {
      const response = await fetch(base+'workflow', {cache:'no-store'});
      if (!response.ok) throw Error();
      display(await response.json());
      $('workflowFeedback').textContent = '';
      if (open) dialog.showModal();
    } catch {
      $('workflowSummary').textContent = 'Could not check the current release. Try again.';
      check.textContent = 'Retry update check';
      check.classList.remove('available');
    } finally { check.disabled = false; }
  }
  check.onclick = () => refresh(true);
  $('workflowClose').onclick = () => dialog.close();
  $('copySetup').onclick = async () => {
    try {
      await navigator.clipboard.writeText($('setupPrompt').value);
      $('workflowFeedback').textContent = 'Copied. Paste into the project chat in Codex.';
    } catch {
      $('setupPrompt').focus(); $('setupPrompt').select();
      $('workflowFeedback').textContent = 'The prompt is selected. Use your browser’s Copy command.';
    }
  };
  $('confirmInstall').onclick = async () => {
    $('confirmInstall').disabled = true;
    try {
      const response = await fetch(base+'workflow',{method:'POST',headers:{'If-Match':release.version}});
      if (!response.ok) throw Error(await response.text());
      display(await response.json());
      $('workflowFeedback').textContent = 'Installation confirmed for Sam’s desk.';
    } catch (error) { $('workflowFeedback').textContent = error.message; }
    finally { $('confirmInstall').disabled = false; }
  };
  refresh();
}
