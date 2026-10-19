import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {migrate,createDatabase} from '../server/postgres.mjs';
import {createStorage} from '../server/storage.mjs';
import {createServer} from '../server/index.mjs';
import {createAuth,sessionCookie,readSession,safeNext} from '../server/auth.mjs';
import {testPool,config} from './helpers.mjs';
import worker from '../worker/index.js';

test('PostgreSQL: sessions, idempotency, state, settings, image reactions, and rollback',async()=>{
  const pool=await testPool();
  try{
    await migrate(pool); await migrate(pool);
    const objects=new Map();
    const s3={async send(command){const {Key,Body,ContentType}=command.input;if(command.constructor.name==='PutObjectCommand'){objects.set(Key,{Body,ContentType});return {};}const item=objects.get(Key);if(!item)throw Object.assign(new Error('Missing'),{name:'NoSuchKey'});return {ContentType:item.ContentType,Body:{transformToWebStream:()=>new Blob([item.Body]).stream()}};}};
    const storage=createStorage(pool,config,s3),db=createDatabase(pool),env={...config,DB:db,BUCKET:storage};
    const call=(path,method='GET',body,admin=false)=>worker.fetch(new Request(config.APP_ORIGIN+path,{method,headers:{Origin:config.APP_ORIGIN,'Content-Type':'application/json',...(admin?{'oai-authenticated-user-email':config.ADMIN_OWNER_EMAIL}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
    const create=async name=>{const r=await call('/api/chat/sessions','POST',{surface:'live',visitorName:name,greeting:'Welcome'});assert.equal(r.status,201,await r.clone().text());return(await r.json()).session;};
    const [a,b]=await Promise.all([create('Alpha'),create('Beta')]);
    assert.notEqual(a.id,b.id);
    const event={session:a,eventId:crypto.randomUUID(),kind:'idle',content:'A-only'};
    await Promise.all([call('/api/chat/events','POST',event),call('/api/chat/events','POST',event)]);
    const get=async s=>await(await call('/api/admin/sessions/'+s.id,'GET',null,true)).json();
    assert.equal((await get(a)).messages.filter(m=>m.content==='A-only').length,1);
    assert.equal((await get(b)).messages.some(m=>m.content==='A-only'),false);
    assert.equal((await call('/api/chat/history','POST',{session:{id:b.id,token:a.token}})).status,403);
    const originalFetch=globalThis.fetch;
    globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Here is information about Aakash.',language:'English',visitorName:'',idlePrompt:'',scope:'aakash',scopeNotice:'',intent:'other',showIds:[],suggestions:[]})}]}]});
    try{
      const payload={session:a,turnId:crypto.randomUUID(),messages:[{role:'user',content:'Tell me about Aakash'}],context:{language:'English',personaScale:1}};
      const responses=await Promise.all([call('/api/chat','POST',payload),call('/api/chat','POST',payload)]);
      for(const r of responses)assert.ok([200,409].includes(r.status),await r.clone().text());
      assert.ok(responses.some(r=>r.status===200));
      assert.equal((await call('/api/chat','POST',payload)).status,200);
      assert.equal((await get(a)).messages.filter(m=>m.content==='Tell me about Aakash').length,1);
    }finally{globalThis.fetch=originalFetch;}
    const listed=await(await call('/api/admin/sessions?q=alpha','GET',null,true)).json();
    assert.equal(listed.sessions.length,1);
    assert.equal((await call('/api/admin/sessions')).status,403);
    const settings=await(await call('/api/admin/settings','GET',null,true)).json();
    settings.settings.persona='Test persona persisted in PostgreSQL';
    assert.equal((await call('/api/admin/settings','PUT',settings.settings,true)).status,200);
    const reloaded=createStorage(pool,config,s3);
    assert.equal((await(await reloaded.get('agent/settings.json')).json()).settings.persona,settings.settings.persona);
    await storage.put('agent/reaction-images/test.png',new Uint8Array([1,2,3]),{httpMetadata:{contentType:'image/png'}});
    const image=await reloaded.get('agent/reaction-images/test.png');
    assert.deepEqual(new Uint8Array(await new Response(image.body).arrayBuffer()),new Uint8Array([1,2,3]));
    assert.equal(await reloaded.get('agent/reaction-images/missing.png'),null);
    const upload=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlSAAAAAASUVORK5CYII=','base64');
    const uploaded=await worker.fetch(new Request(config.APP_ORIGIN+'/api/admin/reaction-images',{method:'POST',headers:{Origin:config.APP_ORIGIN,'Content-Type':'image/png','oai-authenticated-user-email':config.ADMIN_OWNER_EMAIL},body:upload}),env);
    assert.equal(uploaded.status,201,await uploaded.clone().text());
    const imageResult=await uploaded.json();
    const restoredImage=await worker.fetch(new Request(config.APP_ORIGIN+imageResult.url),{...env,BUCKET:reloaded});
    assert.equal(restoredImage.status,200);assert.equal(restoredImage.headers.get('content-type'),'image/png');
    await assert.rejects(db.batch([
      db.prepare('UPDATE chat_sessions SET nickname = ? WHERE id = ?').bind('Must roll back',a.id),
      db.prepare('INSERT INTO chat_sessions(id) VALUES (?)').bind(a.id),
    ]));
    assert.notEqual((await get(a)).session.nickname,'Must roll back');
    const transcript=await(await call('/api/admin/sessions/'+a.id+'/export','GET',null,true)).text();
    assert.ok(transcript.includes('Tell me about Aakash'));assert.ok(!transcript.includes(a.token));
  }finally{await pool.end();}
});

test('Login: header spoofing, team isolation, expiry, CSRF, throttling, private-by-default',async()=>{
  const pool=await testPool();
  try{
    await migrate(pool);const auth=createAuth(config,pool);
    const req=(path,options={})=>new Request(config.APP_ORIGIN+path,options);
    const spoof=await auth(req('/api/admin/sessions',{headers:{'oai-authenticated-user-email':config.ADMIN_OWNER_EMAIL}}));
    assert.equal(spoof.response.status,401);
    assert.equal((await auth(req('/'))).response.status,303);
    const adminCookie=sessionCookie('admin',config), teamCookie=sessionCookie('team',config);
    assert.ok(adminCookie.includes('HttpOnly'));assert.ok(adminCookie.includes('Secure'));
    const admin=await auth(req('/api/admin/sessions',{headers:{Cookie:adminCookie}}));
    assert.equal(admin.request.headers.get('oai-authenticated-user-email'),config.ADMIN_OWNER_EMAIL);
    assert.equal((await auth(req('/api/admin/sessions',{headers:{Cookie:teamCookie}}))).response.status,403);
    const team=await auth(req('/',{headers:{Cookie:teamCookie,'oai-authenticated-user-email':config.ADMIN_OWNER_EMAIL}}));
    assert.equal(team.request.headers.has('oai-authenticated-user-email'),false);
    assert.equal(readSession(req('/',{headers:{Cookie:sessionCookie('admin',config,Date.now()-9*3600000)}}),config),null);
    assert.equal(readSession(req('/',{headers:{Cookie:adminCookie}}),{...config,ADMIN_PASSWORD:'changed-password-123'}),null);
    assert.equal(safeNext('//evil.test'),'/');assert.equal(safeNext('/\\evil.test'),'/');
    const login=(password,origin=config.APP_ORIGIN)=>auth(req('/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:config.ADMIN_OWNER_EMAIL,password,next:'/admin/sessions'})}),'login-test');
    assert.equal((await login(config.ADMIN_PASSWORD,'https://evil.test')).response.status,403);
    const success=(await login(config.ADMIN_PASSWORD)).response;
    assert.equal(success.status,303);assert.equal(success.headers.get('Location'),'/admin/sessions');
    for(let i=0;i<10;i++)assert.equal((await login('wrong')).response.status,401);
    assert.equal((await login(config.ADMIN_PASSWORD)).response.status,429);
  }finally{await pool.end();}
});

test('HTTP server serves assets, health and gated admin using the canonical origin',async()=>{
  const pool=await testPool();await migrate(pool);
  const server=createServer({...config,SITE_ACCESS:'public'},pool,createStorage(pool,config,{send:async()=>{throw new Error('Unexpected storage request');}}));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  try{
    assert.equal((await fetch(base+'/healthz')).status,200);
    const home=await fetch(base+'/');assert.equal(home.status,200);assert.ok((await home.text()).includes('Aakash Meter'));
    const photo=await fetch(base+'/home-tour-poster.png');assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/png');
    assert.equal((await fetch(base+'/api/admin/sessions',{headers:{'oai-authenticated-user-email':config.ADMIN_OWNER_EMAIL}})).status,401);
    const login=await fetch(base+'/admin',{redirect:'manual'});assert.equal(login.status,303);
    assert.equal((await fetch(base+'/api/chat/sessions',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/chat/sessions',{method:'POST',headers:{'Content-Type':'application/json',Origin:config.APP_ORIGIN,Host:'attacker.test'},body:JSON.stringify({surface:'live',greeting:'Hi'})})).status,201);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await pool.end();}
});
