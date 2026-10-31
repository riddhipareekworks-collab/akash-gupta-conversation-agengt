import worker from '../worker/index.js';
import {loadConfig} from './config.mjs';
import {createPool,createDatabase,migrate} from './postgres.mjs';
import {createStorage} from './storage.mjs';
import {createAuth} from './auth.mjs';
import {transferRoutes} from './transfer.mjs';
import {installReactionPack} from './reaction-pack.mjs';

// One initialization/pool per warm function instance, shared by concurrent requests.
// Importing/building this module never loads .env or connects to a database.
export function createVercelHandler({readEnv=()=>process.env,makePool=createPool,app=worker}={}) {
  let ready;
  async function initialize() {
    const config=loadConfig(readEnv()),pool=makePool(config.DATABASE_URL,config);
    pool.on?.('error',()=>console.error('An idle database connection failed.'));
    try {await migrate(pool);await installReactionPack(pool);}
    catch(error){await pool.end();throw error;}
    return {config,pool,env:{...config,DB:createDatabase(pool,config),BUCKET:createStorage(pool,config)},auth:createAuth(config,pool)};
  }
  return async function fetch(request) {
    try {
      ready??=initialize().catch(error=>{ready=undefined;throw error;});
      const {config,pool,env,auth}=await ready;
      const incoming=new URL(request.url),url=new URL(config.APP_ORIGIN+incoming.pathname+incoming.search);
      const method=request.method;
      let response;
      if(url.pathname==='/healthz'&&['GET','HEAD'].includes(method)) {
        await pool.query('SELECT 1');response=Response.json({ok:true});
      } else {
        const limit=url.pathname==='/login'?8192:url.pathname==='/api/admin/import'?20*1024*1024:4*1024*1024;
        if(Number(request.headers.get('content-length')||0)>limit) return new Response('Request too large.',{status:413});
        const chunks=[];let size=0;
        if(request.body){const reader=request.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return new Response('Request too large.',{status:413});}chunks.push(value);}}finally{reader.releaseLock();}}
        const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
        const canonical=new Request(url,{method:method==='HEAD'?'GET':method,headers:request.headers,...(['GET','HEAD'].includes(method)?{}:{body})});
        // Vercel overwrites this header at its proxy; do not use it off-platform.
        const ip=config.VERCEL==='1'?request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown':'local';
        const access=await auth(canonical,ip);
        response=access.response||await transferRoutes(access.request,pool,config)||await app.fetch(access.request,env);
      }
      const headers=new Headers(response.headers);
      headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');
      if(url.pathname==='/healthz'||url.pathname.startsWith('/admin')||url.pathname.startsWith('/api/'))headers.set('Cache-Control','no-store');
      return new Response(method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
    } catch {
      // Never log credentials, incoming bodies, or transcript text.
      console.error('Vercel request failed. Check server environment settings and database connectivity.');
      return Response.json({error:'The service is temporarily unavailable. Check the server configuration.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
  };
}
