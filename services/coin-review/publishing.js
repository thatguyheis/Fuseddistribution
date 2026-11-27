// The publishing service owns Buffer credentials, channel mappings and per-channel delivery claims.
const origin = 'https://fused-client-instructions.luxraycoco.workers.dev';
const channels = ['instagram', 'facebook', 'youtube'];
const confirmed = new Set(['scheduled', 'sending', 'sent']);
async function rpc(env, method, params) {
  if (!env.PUBLISHER || !env.C1994_PUBLISH_TOKEN) throw Error('Publishing connection is unavailable.');
  const response = await env.PUBLISHER.fetch(new Request(origin + '/mcp', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.C1994_PUBLISH_TOKEN, 'Content-Type':'application/json', Accept:'application/json, text/event-stream', 'MCP-Protocol-Version':'2025-11-25' },
    body: JSON.stringify({jsonrpc:'2.0', id:1, method, params})
  }));
  if (!response.ok) throw Error('Publishing service returned HTTP ' + response.status + '.');
  const text = await response.text();
  const data = text.trimStart().startsWith('{') ? JSON.parse(text) : text.split('\n')
    .filter(line => line.startsWith('data:')).map(line => JSON.parse(line.slice(5))).find(message => message.id === 1);
  if (!data?.result) throw Error('Publishing service did not confirm the result.');
  return data.result;
}
async function tool(env, name, args) {
  const result = await rpc(env, 'tools/call', {name, arguments:args});
  const text = result.content?.[0]?.text;
  if (result.isError) throw Error(text || 'Publishing request declined.');
  return JSON.parse(text);
}
export async function checkPublisher(env) {
  const result = await rpc(env, 'tools/list', {});
  if (!['schedule_post','create_video_upload'].every(name => result.tools?.some(tool => tool.name === name))) throw Error('Scheduling is unavailable for this account.');
  const inventory = await tool(env, 'list_videos', {});
  if (!Array.isArray(inventory.videos)) throw Error('Publishing inventory unavailable.');
}
export function publishPlan(input) {
  const caption = typeof input.caption === 'string' && input.caption.trim();
  const title = typeof input.youtube_title === 'string' && input.youtube_title.trim();
  const selected = input.channels;
  if (!Array.isArray(selected) || !selected.length || selected.length > 3 || !selected.every(s => channels.includes(s)) || !caption || caption.length > 2200) throw Error('Choose channels and enter a caption of up to 2,200 characters.');
  if (selected.includes('youtube') && (!title || title.length > 100)) throw Error('Enter a YouTube title of up to 100 characters.');
  const due = Date.parse(input.due_at);
  const minutes = (due - Date.now()) / 60000;
  if (!Number.isFinite(due) || minutes < 15 || minutes > 5*24*60 - 60) throw Error('Choose a time at least 15 minutes ahead and within four days and 23 hours.');
  return {caption, ...(selected.includes('youtube') ? {youtube_title:title}:{}), channels:[...new Set(selected)], due_at:new Date(due).toISOString().replace(/\.\d{3}Z$/, 'Z')};
}
export async function stageVideo(env, task, bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const sha256 = Array.from(hash, n => n.toString(16).padStart(2,'0')).join('');
  const ticket = await tool(env, 'create_video_upload', {filename:'desk-'+task.media+'.mp4',bytes:task.size,sha256});
  const url = new URL(ticket.upload_url);
  if (url.origin !== origin || url.pathname !== '/v1/uploads/'+ticket.video_id) throw Error('Publishing service returned an invalid upload address.');
  const upload = await env.PUBLISHER.fetch(new Request(url, {method:'PUT',headers:{'Content-Type':'video/mp4'},body:bytes}));
  if (!upload.ok) throw Error('Video staging failed (HTTP '+upload.status+'). Try again.');
  const stored = await upload.json();
  if (stored.status !== 'ready' || stored.video_id !== ticket.video_id) throw Error('Video staging was not confirmed.');
  return { videoId:stored.video_id, expires:stored.expires_at };
}
export async function schedule(env, publication, plan) {
  const prior = publication.posts || [];
  const remaining = plan.channels.filter(channel => !prior.some(p => p.service === channel && confirmed.has(p.status)));
  if (!remaining.length) return prior;
  const result = await tool(env,'schedule_post',{...plan,channels:remaining,video_id:publication.videoId});
  if (!Array.isArray(result.posts) || result.video_id !== publication.videoId) throw Error('Scheduling was not confirmed. Reopen this item to check.');
  return [...prior.filter(p => !result.posts.some(n => n.service === p.service)), ...result.posts];
}
export const allScheduled = (plan,posts) => plan.channels.every(c => posts.some(p => p.service===c && confirmed.has(p.status)));
