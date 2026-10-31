import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createVercelHandler} from '../server/vercel.mjs';
import {testPool,config} from './helpers.mjs';
import {loadConfig} from '../server/config.mjs';
import entry from '../api/index.mjs';

test('Vercel entry is lazy and chooses trusted platform origins',()=>{
  assert.equal(typeof entry.fetch,'function');
  const env={...config,DATABASE_URL:'postgresql://test:test@localhost/test',APP_ORIGIN:undefined,VERCEL:'1',VERCEL_ENV:'production',VERCEL_PROJECT_PRODUCTION_URL:'app.example.com',VERCEL_URL:'build.example.com'};
  assert.equal(loadConfig(env).APP_ORIGIN,'https://app.example.com');
  assert.equal(loadConfig({...env,VERCEL_ENV:'preview'}).APP_ORIGIN,'https://build.example.com');
  assert.equal(loadConfig({...env,APP_ORIGIN:'https://custom.example.com'}).APP_ORIGIN,'https://custom.example.com');
});

test('Vercel function preserves routes, session storage, login, cookies, images, HEAD, CSRF and body limits',async()=>{
  const pool=await testPool();let instances=0;
  const env={...config,DATABASE_URL:'postgresql://test:test@localhost/test',VERCEL:'1'};
  const fetch=createVercelHandler({readEnv:()=>env,makePool:()=>{instances++;return pool;}});
  const request=(path,options={})=>new Request(config.APP_ORIGIN+path,options);
  try{
    const [health,home]=await Promise.all([fetch(request('/healthz')),fetch(request('/'))]);
    assert.equal(instances,1);assert.equal(health.status,200);assert.equal(home.status,200);assert.match(await home.text(),/Aakash Meter/);
    const head=await fetch(request('/',{method:'HEAD'}));assert.equal(head.status,200);assert.equal(await head.text(),'');
    const asset=await fetch(request('/home-tour-poster.png'));assert.equal(asset.headers.get('content-type'),'image/png');
    const gated=await fetch(request('/admin/sessions'));assert.equal(gated.status,303);assert.equal(gated.headers.get('Cache-Control'),'no-store');
    const spoof=await fetch(request('/api/admin/sessions',{headers:{'oai-authenticated-user-email':config.ADMIN_OWNER_EMAIL}}));assert.equal(spoof.status,401);
    const create=await fetch(request('/api/chat/sessions',{method:'POST',headers:{Origin:config.APP_ORIGIN},body:JSON.stringify({surface:'live',greeting:'Vercel test'})}));assert.equal(create.status,201);const {session}=await create.json();
    const history=await fetch(request('/api/chat/history',{method:'POST',headers:{Origin:config.APP_ORIGIN},body:JSON.stringify({session})}));assert.equal(history.status,200);assert.match(await history.text(),/Vercel test/);
    const csrf=await fetch(request('/api/chat/sessions',{method:'POST',headers:{Origin:'https://attacker.example'},body:'{}'}));assert.equal(csrf.status,403);
    const login=await fetch(request('/login',{method:'POST',headers:{Origin:config.APP_ORIGIN,'Content-Type':'application/x-www-form-urlencoded','x-forwarded-for':'192.0.2.10'},body:new URLSearchParams({username:config.ADMIN_OWNER_EMAIL,password:config.ADMIN_PASSWORD,next:'/admin/sessions'})}));assert.equal(login.status,303);
    const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);
    const admin=await fetch(request('/api/admin/sessions',{headers:{Cookie:cookie.split(';')[0]}}));assert.equal(admin.status,200);
    const huge=await fetch(request('/login',{method:'POST',body:'x'.repeat(9000)}));assert.equal(huge.status,413);
    const upload=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlSAAAAAASUVORK5CYII=','base64'));
    const image=await fetch(request('/api/admin/reaction-images',{method:'POST',headers:{Origin:config.APP_ORIGIN,Cookie:cookie.split(';')[0],'Content-Type':'image/png'},body:upload}));assert.equal(image.status,201);const imageData=await image.json();
    const restored=await fetch(request(imageData.url));assert.equal(restored.status,200);assert.deepEqual(new Uint8Array(await restored.arrayBuffer()),upload);
  }finally{await pool.end();}
});

test('Vercel returns a safe configuration error without exposing credentials',async()=>{
  const fetch=createVercelHandler({readEnv:()=>({})});
  const result=await fetch(new Request('https://app.example.com/'));assert.equal(result.status,503);assert.match(await result.text(),/server configuration/);
});
