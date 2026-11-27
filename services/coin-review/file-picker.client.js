// Keep prior picks when a browser replaces its native FileList after a camera or library selection.
export function filePicker(container, onChange = () => {}) {
  let entries=[];
  function render() {
    container.replaceChildren();
    for(const item of entries) {
      const row=document.createElement('li');
      const label=document.createElement('span');
      label.textContent=item.file.name;
      const remove=document.createElement('button');
      remove.type='button'; remove.className='quiet'; remove.textContent='Remove';
      remove.setAttribute('aria-label','Remove '+item.file.name);
      remove.onclick=()=>{entries=entries.filter(entry=>entry!==item);render();onChange();};
      row.append(label,remove);container.append(row);
    }
  }
  return {
    get entries(){return entries.slice();},
    add(files){for(const file of files)entries.push({file,id:crypto.randomUUID()});render();onChange();},
    clear(){entries=[];render();}
  };
}
export function photoHeaders(item) {
  return {'Content-Type':'application/octet-stream','X-Photo-Name':encodeURIComponent(item.file.name.slice(0,180))};
}
