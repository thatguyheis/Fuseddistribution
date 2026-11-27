import {filePicker,photoHeaders} from '/coin-review/file-picker.js';
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
    let id=crypto.randomUUID(), finalAttempt=false;
    function edited() {
      if(finalAttempt){id=crypto.randomUUID();finalAttempt=false;}
    }
    const picked=filePicker(el('staffFiles'),edited);
    el('cameraButton').onclick=()=>el('camera').click();
    el('fileButton').onclick=()=>el('library').click();
    for(const input of [el('camera'),el('library')]) input.onchange=()=>{
      picked.add(input.files);
      input.value='';
    };
    form.oninput=edited;
    form.onsubmit=async event=>{
      event.preventDefault();
      const data=new FormData(form);
      const message=el('formStatus');
      const photos=picked.entries;
      if(!String(data.get('highlight')).trim() && !photos.length){message.textContent='Describe the highlight or attach photos.';return;}
      if(photos.some(p=>p.file.size>12*1024*1024)){message.textContent='Each photo must be 12 MiB or smaller.';return;}
      data.set('photoIds',JSON.stringify(photos.map(p=>p.id)));
      const controls=Array.from(form.elements);
      controls.forEach(c=>c.disabled=true);
      message.textContent='Sending request…';
      try {
        for(const [index,item] of photos.entries()){
          if(item.uploadedFor===id)continue;
          message.textContent='Uploading photo '+(index+1)+' of '+photos.length+'…';
          const response=await fetch(base+'requests/'+id+'/photos/'+item.id,{method:'PUT',headers:photoHeaders(item),body:item.file});
          if(!response.ok)throw Error(item.file.name+' · '+await response.text());
          item.uploadedFor=id;
        }
        finalAttempt=true;
        const r=await fetch(base+'requests/'+id,{method:'POST',body:data});
        if(!r.ok){
          if(r.status===409)for(const item of photos)delete item.uploadedFor;
          throw Error(await r.text() || 'The request could not be sent. Please retry.');
        }
        const receipt=await r.json();
        el('reference').textContent='The production desk received your request. Reference '+receipt.id.slice(0,8).toUpperCase()+'.';
        form.hidden=true;el('confirmation').hidden=false;el('another').focus();
      }catch(e){message.textContent=e.message;}
      finally{controls.forEach(c=>c.disabled=false);}
    };
    el('another').onclick=()=>{
      form.reset();picked.clear();id=crypto.randomUUID();finalAttempt=false;el('formStatus').textContent='';
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
    const photos=item.photos?.length ? item.photos : (item.photo?[item.photo]:[]);
    for(const [index,photo] of photos.entries()){
      const label=photo.name ? 'Photo '+(index+1)+' · '+photo.name : 'Open submitted photo';
      const link=add('a',label,entry);
      link.href=base+'requests/'+item.id+(photo.id?'/photos/'+photo.id:'/photo');
      link.target='_blank';link.rel='noopener';
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
