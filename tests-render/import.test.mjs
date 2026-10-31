import assert from 'node:assert/strict';
import {test} from 'node:test';
import {testPool} from './helpers.mjs';
import {migrate} from '../server/postgres.mjs';
import {importTables} from '../scripts/import-data.mjs';
import {importBackup} from '../server/transfer.mjs';

test('History import preserves IDs and timestamps, resets sequence, and refuses overwrite',async()=>{
 const pool=await testPool();
 try {
  await migrate(pool);
  const id=crypto.randomUUID(),at='2026-10-14T10:00:00.000Z';
  const data={chat_sessions:[{id,token_hash:'previous-hash',nickname:'Audience-import',surface:'live',started_at:at,updated_at:at}],chat_turns:[],chat_session_state:[],demo_bookings:[],chat_messages:[{id:20,session_id:id,event_id:'imported-message',role:'user',kind:'message',content:'Old message',created_at:at}]};
  const broken={...data,chat_messages:[{...data.chat_messages[0],session_id:'missing-session'}]};
  await assert.rejects(importTables(pool,broken));
  assert.equal((await pool.query('SELECT * FROM chat_sessions')).rows.length,0);
  await importTables(pool,data);
  const row=(await pool.query('SELECT * FROM chat_messages')).rows[0];
  assert.equal(row.id,20);assert.equal(row.created_at,at);assert.equal(row.content,'Old message');
  const inserted=await pool.query("INSERT INTO chat_messages(session_id,event_id,role,kind,content,created_at) VALUES($1,'new-event','assistant','reply','New message',$2) RETURNING id",[id,at]);
  assert.equal(inserted.rows[0].id,21);
  await assert.rejects(importTables(pool,data),/empty target/);
  assert.equal((await pool.query('SELECT * FROM chat_messages')).rows.length,2);
 } finally {await pool.end();}
});

test('Admin transfer merges into a used database atomically and ignores repeat backups',async()=>{
 const pool=await testPool();
 try {
  await migrate(pool);const at='2026-10-14T10:00:00.000Z',id=crypto.randomUUID();
  const session={id,token_hash:'old-hash',nickname:'Old visitor',surface:'live',started_at:at,updated_at:at};
  const existing=crypto.randomUUID();await pool.query('INSERT INTO chat_sessions(id,token_hash,nickname,surface,started_at,updated_at) VALUES($1,$2,$3,$4,$5,$6)',[existing,'new-hash','New visitor','live',at,at]);
  await pool.query("INSERT INTO chat_messages(session_id,event_id,role,kind,content,created_at) VALUES($1,'new','user','message','New chat',$2)",[existing,at]);
  const imageKey='agent/reaction-images/'+crypto.randomUUID()+'.png';
  const backup={format:'aakash-backup-v1',database:{chat_sessions:[session],chat_turns:[],chat_session_state:[],demo_bookings:[],chat_messages:[{id:1,session_id:id,event_id:'old',role:'user',kind:'message',content:'Old chat',created_at:at}]},settings:{settings:{persona:'Preserved persona'},updatedAt:at},images:[{key:imageKey,contentType:'image/png',base64:Buffer.from([137,80,78,71]).toString('base64')}]};
  assert.deepEqual(await importBackup(pool,backup),{sessions:1,messages:1,images:1});
  assert.deepEqual(await importBackup(pool,backup),{duplicate:true});
  const messages=(await pool.query('SELECT * FROM chat_messages ORDER BY id')).rows;
  assert.equal(messages.length,2);assert.equal(messages[0].content,'New chat');assert.equal(messages[1].content,'Old chat');assert.notEqual(messages[0].id,messages[1].id);
  assert.equal(JSON.parse((await pool.query('SELECT document FROM app_settings')).rows[0].document).settings.persona,'Preserved persona');
  assert.equal((await pool.query('SELECT content FROM app_images')).rows[0].content.length,4);
  await assert.rejects(importBackup(pool,{...backup,images:[{key:'../bad',base64:'bad',contentType:'image/png'}]}));
 }finally{await pool.end();}
});
