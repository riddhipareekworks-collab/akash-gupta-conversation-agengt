import http from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import worker from '../worker/index.js';
import { loadConfig } from './config.mjs';
import { createPool, createDatabase, migrate } from './postgres.mjs';
import { createStorage } from './storage.mjs';
import { createAuth } from './auth.mjs';

export function createServer(config, pool, bucket, app = worker) {
  const env = { ...config, DB:createDatabase(pool), BUCKET:bucket }, auth = createAuth(config,pool);
  return http.createServer(async (incoming, outgoing) => {
    try {
      // Canonical origin, never an untrusted Host/X-Forwarded-Host header.
      const path = incoming.url || '/';
      if (!path.startsWith('/') || path.startsWith('//')) { outgoing.writeHead(400).end(); return; }
      const url = new URL(config.APP_ORIGIN + path);
      if (url.pathname === '/healthz' && ['GET','HEAD'].includes(incoming.method)) {
        await pool.query('SELECT 1');
        outgoing.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end('{"ok":true}'); return;
      }
      const chunks=[]; let size=0;
      // Existing uploads allow 3 MB images plus multipart overhead; previews allow 2.1 MB.
      const limit = url.pathname === '/login' ? 8192 : 4 * 1024 * 1024;
      if (Number(incoming.headers['content-length'] || 0) > limit) { outgoing.writeHead(413).end('Request too large.'); incoming.resume(); return; }
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > limit) { outgoing.writeHead(413).end('Request too large.'); return; }
        chunks.push(chunk);
      }
      const method = incoming.method || 'GET';
      const request = new Request(url,{method:method==='HEAD'?'GET':method,headers:incoming.headers,
        ...(['GET','HEAD'].includes(method) ? {} : {body:Buffer.concat(chunks)})});
      // Render proxy appends the client address; ignore any attacker-supplied leading entries.
      const forwarded = incoming.headers['x-forwarded-for'];
      const ip = config.RENDER === 'true' && typeof forwarded === 'string' ? forwarded.split(',').at(-1).trim() : incoming.socket.remoteAddress;
      const access = await auth(request,ip);
      const response = access.response || await app.fetch(access.request,env);
      outgoing.statusCode = response.status;
      for (const [key,value] of response.headers) outgoing.setHeader(key,value);
      outgoing.setHeader('X-Content-Type-Options','nosniff');
      outgoing.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
      if (config.SITE_ACCESS !== 'public' || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) outgoing.setHeader('Cache-Control','no-store');
      if (method === 'HEAD' || !response.body) { outgoing.end(); return; }
      await pipeline(Readable.fromWeb(response.body),outgoing);
    } catch {
      // Do not log request bodies, passwords, connection strings, or transcript contents.
      console.error('Request failed; check database and storage connectivity.');
      if (!outgoing.headersSent) outgoing.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'}).end('{"error":"The service is temporarily unavailable. Please try again."}');
      else outgoing.destroy();
    }
  });
}

export async function start() {
  let config;
  try { config=loadConfig(process.env); }
  catch (error) { console.error(error.message); process.exitCode=1; return; }
  const pool=createPool(config.DATABASE_URL);
  pool.on('error',()=>console.error('An idle database connection failed.'));
  try { await migrate(pool); }
  catch { console.error('Database setup failed. Check DATABASE_URL, database permissions, and connectivity.'); await pool.end(); process.exitCode=1; return; }
  const server=createServer(config,pool,createStorage(pool,config));
  server.requestTimeout=180000; server.headersTimeout=15000;
  server.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Website started; database migrations are up to date.'));
  const shutdown=()=>{server.close(()=>pool.end().finally(()=>process.exit(0)));setTimeout(()=>process.exit(1),10000).unref();};
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await start();
