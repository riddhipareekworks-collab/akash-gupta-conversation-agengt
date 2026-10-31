import {readFile} from 'node:fs/promises';
const packRoot=new URL('../assets/reaction-pack/',import.meta.url);
// One-time additive import. Later owner edits/deletions are never restored on restart.
export async function installReactionPack(pool){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(23102026)');
  const marker='migration/reaction-pack-2026-10-23';
  if((await client.query('SELECT key FROM app_settings WHERE key=$1',[marker])).rows.length){await client.query('COMMIT');return;}
  const row=(await client.query('SELECT document FROM app_settings WHERE key=$1 FOR UPDATE',['agent/settings.json'])).rows[0];
  if(!row){await client.query('ROLLBACK');return;}
  const document=JSON.parse(row.document),rules=JSON.parse(await readFile(new URL('rules.json',packRoot),'utf8'));
  const existing=document.settings.reactions||[];
  const added=rules.filter(r=>!existing.some(old=>old.id===r.id));
  if(existing.length+added.length>30)throw Error('Reaction pack would exceed the saved rule limit.');
  for(const rule of rules){const bytes=await readFile(new URL(rule.image.split('/').at(-1),packRoot));await client.query('INSERT INTO app_images(key,content,content_type) VALUES ($1,$2,$3) ON CONFLICT(key) DO NOTHING',['agent'+rule.image,bytes,'image/png']);}
  document.settings.reactions=[...added,...existing];
  await client.query('UPDATE app_settings SET document=$2,updated_at=now() WHERE key=$1',['agent/settings.json',JSON.stringify(document)]);
  await client.query('INSERT INTO app_settings(key,document) VALUES ($1,$2)',[marker,JSON.stringify({installedAt:new Date().toISOString(),ruleIds:rules.map(r=>r.id)})]);
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
