import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

export function approvedOwnerHook(root,slug) {
  const file=join(root,'ops/reel-hook-exceptions.json');
  if(!existsSync(file))return null;
  const entry=JSON.parse(readFileSync(file,'utf8')).exceptions?.[slug];
  return entry?.approvedBy==='Nick' && entry.preserveExactText===true && entry.spokenText
    && Number.isFinite(Date.parse(entry.approvedAt)) ? entry : null;
}

export function assertOwnerHook(root,slug,spoken,visible) {
  const approved=approvedOwnerHook(root,slug);
  if(!approved)return;
  if(spoken!==approved.spokenText || visible!==approved.spokenText)
    throw Error(`${slug}: spoken and visible hook must exactly match Nick's approved wording`);
}
