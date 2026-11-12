import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

export function hookDurationLimit(root,slug,spokenText) {
  const path=join(root,'ops/reel-hook-exceptions.json');
  if(!existsSync(path))return 3.5;
  const entry=JSON.parse(readFileSync(path,'utf8')).exceptions?.[slug];
  if(entry?.approvedBy==='Nick' && Number.isFinite(Date.parse(entry.approvedAt)) && entry.reason
    && (entry.spokenText===spokenText || entry.spokenText.replace(/\s*[—–]\s*/g, ', ')===spokenText) && Number.isFinite(entry.maxSeconds)
    && entry.maxSeconds>=3.5 && entry.maxSeconds<=8)return entry.maxSeconds;
  return 3.5;
}
