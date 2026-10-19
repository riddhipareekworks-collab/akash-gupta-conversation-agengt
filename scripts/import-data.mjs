// Imports a local, private export. Credentials and transcripts never belong in Git.
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createPool,migrate} from '../server/postgres.mjs';
import {createStorage} from '../server/storage.mjs';

export const tables = {
  chat_sessions:['id','token_hash','nickname','visitor_name','surface','started_at','updated_at','closed_at'],
  chat_turns:['id','session_id','status','started_at','finished_at','response_json','response_status'],
  chat_messages:['id','session_id','event_id','role','kind','content','metadata_json','created_at'],
  chat_session_state:['session_id','data_json','updated_at'],
  demo_bookings:['id','request_id','session_id','show_id','quantity','email','receipt_json','created_at'],
};
export async function importTables(pool,data) {
  for (const name of Object.keys(tables)) if (!Array.isArray(data[name])) throw new Error('Missing export table: '+name);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    // A full import is intentionally restricted to an empty target to avoid ID collisions.
    await client.query('LOCK TABLE '+Object.keys(tables).join(',')+' IN ACCESS EXCLUSIVE MODE');
    for (const name of Object.keys(tables)) {
      if ((await client.query('SELECT 1 FROM '+name+' LIMIT 1')).rows.length) throw new Error('Import requires an empty target database.');
    }
    for (const [name,columns] of Object.entries(tables)) {
      for (const row of data[name]) await client.query(`INSERT INTO ${name} (${columns.join(',')}) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')})`,columns.map(c=>row[c]??null));
    }
    await client.query("SELECT setval(pg_get_serial_sequence('chat_messages','id'), COALESCE((SELECT MAX(id) FROM chat_messages),1), EXISTS(SELECT 1 FROM chat_messages))");
    await client.query('COMMIT');
  } catch(error) {await client.query('ROLLBACK');throw error;}
  finally {client.release();}
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const folder=process.argv[2];
  if (!folder || !process.env.DATABASE_URL) {console.error('Usage: npm run data:import -- /path/to/private-export (with DATABASE_URL set)');process.exit(1);}
  const pool=createPool(process.env.DATABASE_URL);
  try {
    const data=JSON.parse(await readFile(join(folder,'database.json'),'utf8'));
    const storage=createStorage(pool,process.env);
    // Upload objects before importing references. Re-running uploads is safe if DB import fails.
    let files=[];try{files=await readdir(join(folder,'reaction-images'));}catch(error){if(error.code!=='ENOENT')throw error;}
    const types={png:'image/png',jpg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
    for(const file of files){if(!/^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(file))throw new Error('Unexpected asset filename.');await storage.put('agent/reaction-images/'+file,await readFile(join(folder,'reaction-images',file)),{httpMetadata:{contentType:types[file.split('.').at(-1)]}});}
    await migrate(pool);
    await importTables(pool,data);
    try {const settings=await readFile(join(folder,'settings.json'),'utf8');await storage.put('agent/settings.json',settings);}catch(error){if(error.code!=='ENOENT')throw error;}
    console.log('Private data import completed.');
  } catch {console.error('Import failed. Check export completeness, empty target tables, and connection settings. Existing target rows are not overwritten.');process.exitCode=1;}
  finally {await pool.end();}
}
