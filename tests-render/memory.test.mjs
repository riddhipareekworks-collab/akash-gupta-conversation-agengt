import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {testPool,config} from './helpers.mjs';
import {migrate,createDatabase,createPool} from '../server/postgres.mjs';
import {loadConfig} from '../server/config.mjs';
import {databaseUrl} from '../server/database-config.mjs';
import worker from '../worker/index.js';

test('Supabase connection selection, bounded configuration and verified certificate options',async()=>{
  const url='postgresql://postgres.project:test@pooler.example:5432/postgres?sslmode=require';
  assert.equal(databaseUrl({DATABASE_PROVIDER:'supabase',SUPABASE_DB_URL:url,DATABASE_URL:'old'}),url);
  assert.throws(()=>databaseUrl({DATABASE_PROVIDER:'supabase',DATABASE_URL:url}),/SUPABASE_DB_URL/);
  assert.throws(()=>databaseUrl({DATABASE_PROVIDER:'supabase',SUPABASE_DB_URL:'https://project.supabase.co'}),/PostgreSQL/);
  const loaded=loadConfig({...config,DATABASE_PROVIDER:'supabase',SUPABASE_DB_URL:url});
  assert.equal(loaded.CHAT_CONTEXT_MESSAGES,80);assert.equal(loaded.CHAT_CONTEXT_CHARACTERS,48000);
  assert.throws(()=>loadConfig({...config,DATABASE_URL:url,CHAT_CONTEXT_MESSAGES:999}),/CHAT_CONTEXT_MESSAGES/);
  const pool=createPool(url,{DATABASE_SSL_CA:'certificate\\nline'});
  assert.equal(pool.options.ssl.rejectUnauthorized,true);assert.equal(pool.options.ssl.ca,'certificate\nline');
  assert.ok(!pool.options.connectionString.includes('sslmode'));await pool.end();
});

test('Supabase manual migrations are repeatable, match startup and deny browser roles',async()=>{
  const pool=await testPool();
  try{
    await pool.query('CREATE ROLE anon; CREATE ROLE authenticated;');
    for(let pass=0;pass<2;pass++) for(const file of ['202610310001_chat_storage_and_memory.sql','202610310002_server_only_access.sql'])await pool.query(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
    await migrate(pool);
    assert.equal((await pool.query('SELECT * FROM app_migrations')).rows.length,4);
    assert.equal((await pool.query("SELECT relrowsecurity FROM pg_class WHERE relname='chat_messages'")).rows[0].relrowsecurity,true);
    await pool.query('SET ROLE anon');
    await assert.rejects(pool.query('SELECT content FROM chat_messages'),/permission denied/);
    await pool.query('RESET ROLE');
    await pool.query('SET ROLE authenticated');
    await assert.rejects(pool.query('SELECT document FROM app_settings'),/permission denied/);
    await pool.query('RESET ROLE');
  }finally{await pool.end();}
});

test('Large context and older retrieval remain session-isolated and reach the model as historical data',async()=>{
  const pool=await testPool();const original=globalThis.fetch;
  try{
    await migrate(pool);
    const db=createDatabase(pool),env={...config,DB:db,BUCKET:{get:async()=>null},CHAT_CONTEXT_MESSAGES:80,CHAT_CONTEXT_CHARACTERS:48000};
    const call=(path,body)=>worker.fetch(new Request(config.APP_ORIGIN+path,{method:'POST',headers:{Origin:config.APP_ORIGIN},body:JSON.stringify(body)}),env);
    const create=async()=> (await(await call('/api/chat/sessions',{surface:'live',greeting:'Welcome'})).json()).session;
    const [a,b]=await Promise.all([create(),create()]);
    const insert=(session,event,content)=>db.prepare('INSERT INTO chat_messages(session_id,event_id,role,kind,content,created_at) VALUES (?,?,?,?,?,?)').bind(session.id,event,'user','user',content,new Date().toISOString());
    await db.batch([insert(a,'old','Pineapple is my special reminder about the Aakash outing.'),insert(b,'private','Pineapple BETA PRIVATE must never be disclosed.')]);
    await db.batch(Array.from({length:100},(_,i)=>insert(a,'filler'+i,'Aakash discussion item '+i)));
    const hits=await db.recall(a.id,'pineapple',99999);assert.ok(hits.some(m=>m.content.includes('special reminder')));assert.ok(hits.every(m=>!m.content.includes('BETA PRIVATE')));
    assert.deepEqual(await createDatabase(pool,{CHAT_MEMORY_SEARCH:'false'}).recall(a.id,'pineapple',99999),[]);
    let input;
    globalThis.fetch=async(_url,options)=>{input=JSON.parse(options.body);return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Your special reminder was pineapple.',language:'English',scope:'aakash',intent:'other',showIds:[],suggestions:[]})}]}]});};
    const response=await call('/api/chat',{session:a,turnId:crypto.randomUUID(),messages:[{role:'user',content:'What pineapple reminder did I give you about Aakash?'}],context:{language:'English',personaScale:1}});
    assert.equal(response.status,200,await response.clone().text());
    assert.equal(input.input.length,80);
    assert.match(input.instructions,/special reminder about the Aakash outing/);
    assert.match(input.instructions,/untrusted historical data/);
    assert.ok(!JSON.stringify(input).includes('BETA PRIVATE'));
    // Restarting the adapter retains all messages and the searchable generated vector.
    assert.ok((await createDatabase(pool).recall(a.id,'pineapple',99999)).length);
  }finally{globalThis.fetch=original;await pool.end();}
});
