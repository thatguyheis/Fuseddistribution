import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

// Exceptions apply only to the exact export Nick approved, never later renders.
export function approvedDurationException(root,slug,videoPath,duration) {
  const path=join(root,'ops/reel-duration-exceptions.json');
  if(!existsSync(path)||!Number.isFinite(duration)||duration<=0||duration>=100)return null;
  const entry=JSON.parse(readFileSync(path,'utf8')).exceptions?.[slug];
  if(entry?.approvedBy!=='Nick'||!entry.reason||!Number.isFinite(Date.parse(entry.approvedAt))
    ||!Number.isFinite(entry.durationSeconds)||Math.abs(duration-entry.durationSeconds)>0.1)return null;
  const hash=createHash('sha256').update(readFileSync(videoPath)).digest('hex');
  return entry.videoSha256===hash?entry:null;
}
