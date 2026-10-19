import assert from 'node:assert/strict';
import {test} from 'node:test';
import {testPool} from './helpers.mjs';
import {migrate} from '../server/postgres.mjs';
import {importTables} from '../scripts/import-data.mjs';

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
