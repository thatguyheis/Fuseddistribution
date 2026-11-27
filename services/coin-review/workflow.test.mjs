import assert from 'node:assert/strict';
import test from 'node:test';
import { ShiftLog } from './shift-log.js';

test('Sam confirms a specific release and sees a subsequent MCP update across shifts', async () => {
  const records = new Map();
  const storage = {sql:{exec(){}}, get:key=>records.get(key), put:(key,value)=>records.set(key,value)};
  let latest = 'v3.1-abc';
  const env = {C1994_PUBLISH_TOKEN:'test', PUBLISHER:{async fetch(request) {
    const {params} = await request.json();
    assert.equal(params.name,'get_video_workflow_update');
    const installed = params.arguments.installed_version;
    const data = {version:latest,sha256:'a'.repeat(64),changes:'Example',status:installed===latest?'current':'update_available'};
    return Response.json({id:1,result:{content:[{type:'text',text:JSON.stringify(data)}]}});
  }}};
  const get = () => new ShiftLog({storage},env).fetch(new Request('https://desk.internal/workflow'));
  const confirm = version => new ShiftLog({storage},env).fetch(new Request('https://desk.internal/workflow',{method:'POST',headers:{'If-Match':version}}));
  assert.equal((await (await get()).json()).installed,null);
  assert.equal((await (await confirm(latest)).json()).status,'current');
  assert.equal((await (await get()).json()).status,'current');
  latest = 'v3.1-def';
  assert.equal((await confirm('v3.1-abc')).status,409);
  const available = await (await get()).json();
  assert.equal(available.status,'update_available');
  assert.equal(available.installed,'v3.1-abc');
  assert.equal(available.version,latest);
});
