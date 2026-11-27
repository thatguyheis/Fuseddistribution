const base='/coin-review/highlights/';
const el=id=>document.getElementById(id);
const fullInvite=()=>/^#[A-Za-z0-9_-]{43}$/.test(location.hash);
if (location.pathname.startsWith(base)) {
  window.addEventListener('hashchange',()=>{if(fullInvite())location.reload();});
  if (fullInvite()) {
    const token=location.hash.slice(1);
    history.replaceState(null,'',location.pathname);
    try {
      const r=await fetch(base+'session',{method:'POST',headers:{'X-Invite':token}});
      if(!r.ok)throw Error('This staff invitation is invalid. Ask for the current link.');
      location.replace(base);
    } catch(e) { document.querySelector('main').textContent=e.message; }
  } else if (el('highlightForm')) {
    const form=el('highlightForm');
    let photo=null, id=crypto.randomUUID();
    function pick(file) {
      photo=file || null;
      el('photoName').textContent=photo ? photo.name : '';
      el('removePhoto').hidden=!photo;
      id=crypto.randomUUID();
    }
    el('cameraButton').onclick=()=>el('camera').click();
    el('fileButton').onclick=()=>el('library').click();
    for(const input of [el('camera'),el('library')]) input.onchange=()=>{
      if(input.files[0])pick(input.files[0]);
      input.value='';
    };
    el('removePhoto').onclick=()=>pick(null);
    form.oninput=()=>{id=crypto.randomUUID();};
    form.onsubmit=async event=>{
      event.preventDefault();
      const data=new FormData(form);
      const message=el('formStatus');
      if(!String(data.get('highlight')).trim() && !photo){message.textContent='Describe the highlight or attach a photo.';return;}
      if(photo){
        if(photo.size>12*1024*1024){message.textContent='Choose a photo under 12 MB.';return;}
        data.set('photo',photo);
      }
      const controls=Array.from(form.elements);
      controls.forEach(c=>c.disabled=true);
      message.textContent='Sending request…';
      try {
        const r=await fetch(base+'requests/'+id,{method:'POST',body:data});
        if(!r.ok)throw Error(await r.text() || 'The request could not be sent. Please retry.');
        const receipt=await r.json();
        el('reference').textContent='The production desk received your request. Reference '+receipt.id.slice(0,8).toUpperCase()+'.';
        form.hidden=true;el('confirmation').hidden=false;el('another').focus();
      }catch(e){message.textContent=e.message;}
      finally{controls.forEach(c=>c.disabled=false);}
    };
    el('another').onclick=()=>{
      form.reset();pick(null);el('formStatus').textContent='';
      form.hidden=false;el('confirmation').hidden=true;form.elements.role.focus();
    };
  }
} else if(el('requestInbox')) {
  const list=el('requestItems'), message=el('inboxStatus'), more=el('moreRequests');
  let cursor=null;
  function add(tag,text,parent) {
    const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;
  }
  function show(item) {
    const entry=document.createElement('details');list.append(entry);
    const summary=add('summary',item.highlight || 'Shop photo',entry);
    if(summary.textContent.length>110)summary.textContent=summary.textContent.slice(0,107)+'…';
    add('p',[item.role,item.name].filter(Boolean).join(' · '),entry);
    if(item.highlight)add('p',item.highlight,entry);
    const display=(date,time)=>date ? date+(time?' at '+time+' PT':'') : '';
    const show=[item.showName,item.platform,display(item.showDate,item.showTime)].filter(Boolean).join(' · ');
    if(show)add('p','Show · '+show,entry);
    if(item.deadline)add('p','Content deadline · '+display(item.deadline,item.deadlineTime),entry);
    const submitted=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(item.submitted));
    add('small','Received '+submitted+' PT · '+item.id.slice(0,8).toUpperCase(),entry);
    if(item.photo) {
      const link=add('a','Open submitted photo',entry);link.href=base+'requests/'+item.id+'/photo';link.target='_blank';link.rel='noopener';
    }
  }
  async function load(append=false) {
    more.disabled=el('refreshRequests').disabled=true;
    try{
      const r=await fetch(base+'inbox'+(append?'?before='+cursor:''),{cache:'no-store'});
      if(!r.ok)throw Error('Could not load the requests. Refresh to try again.');
      const data=await r.json();
      if(!append)list.replaceChildren();
      data.items.forEach(show);cursor=data.next;more.hidden=!cursor;
      message.textContent=list.childElementCount?'':'No highlight requests yet.';
    }catch(e){message.textContent=e.message;}
    finally{more.disabled=el('refreshRequests').disabled=false;}
  }
  el('refreshRequests').onclick=()=>load();
  more.onclick=()=>load(true);
  el('copyRequestLink').onclick=async()=>{
    const link=el('staffRequestLink');
    try{await navigator.clipboard.writeText(link.href);el('shareStatus').textContent='Staff request link copied.';}
    catch{el('shareStatus').textContent='Use Copy Link on the staff request link.';}
  };
  load();
}
