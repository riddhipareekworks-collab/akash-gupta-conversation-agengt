import {createHash} from 'node:crypto';
import {tables} from '../scripts/import-data.mjs';

export const transferPage=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Transfer saved data | Aakash Gupta</title><style>body{font:16px/1.6 system-ui;max-width:700px;margin:60px auto;padding:24px;background:#f6f2e9}button,input{font:inherit;padding:12px;margin:12px 0}button{background:#ed482d;color:white;border:0;border-radius:10px}#status{white-space:pre-wrap}</style><a href="/admin">Back to admin</a><h1>Transfer saved data</h1><p>Import the private backup from the previous website. Existing conversations are kept. Saved agent settings and referenced reaction images are restored from the backup.</p><form id="transfer"><label>Backup file <input id="file" type="file" accept="application/json,.json" required></label><br><button id="submit">Import saved data</button></form><p id="status" role="status"></p><p><a href="/admin/sessions">Open chat history</a></p><script>document.getElementById('transfer').onsubmit=async e=>{e.preventDefault();const button=document.getElementById('submit'),status=document.getElementById('status'),file=document.getElementById('file').files[0];if(!file)return;if(file.size>20*1024*1024){status.textContent='Backup is too large.';return;}button.disabled=true;status.textContent='Importing saved data…';try{const response=await fetch('/api/admin/import',{method:'POST',headers:{'Content-Type':'application/json'},body:file});const data=await response.json();if(!response.ok)throw Error(data.error||'Import failed.');status.textContent=data.duplicate?'This backup has already been imported.':'Import complete. '+data.sessions+' sessions, '+data.messages+' messages and '+data.images+' images restored.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};</script></html>`;

export async function importBackup(pool,document) {
  if (document?.format !== 'aakash-backup-v1' || !document.database || !Array.isArray(document.images)) throw new Error('Invalid backup format.');
  const data=document.database;
  for (const name of Object.keys(tables)) if (!Array.isArray(data[name]) || data[name].length>25000) throw new Error('Invalid table data.');
  if (document.images.length>100 || !document.settings?.settings) throw new Error('Incomplete backup.');
  const images=document.images.map(image=>{
    if (!/^agent\/reaction-images\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(image.key)||!['image/png','image/jpeg','image/webp','image/gif'].includes(image.contentType)||typeof image.base64!=='string'||image.base64.length>4200000) throw new Error('Invalid image.');
    const content=Buffer.from(image.base64,'base64');
    if (!content.length || content.length>3145728 || content.toString('base64')!==image.base64) throw new Error('Invalid image data.');
    return {...image,content};
  });
  for (const [name,columns] of Object.entries(tables)) for(const row of data[name]) {
    if(!row || typeof row!=='object')throw new Error('Invalid row.');
    for(const col of columns) if(row[col]!=null&&!['string','number'].includes(typeof row[col]))throw new Error('Invalid field.');
  }
  const digest=createHash('sha256').update(JSON.stringify(document)).digest('hex');
  const client=await pool.connect();
  const counts={sessions:0,messages:0,images:0};
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(817230942)');
    if((await client.query('SELECT digest FROM data_imports WHERE digest=$1',[digest])).rows.length){await client.query('COMMIT');return {duplicate:true};}
    for(const [name,allColumns] of Object.entries(tables)) {
      const columns=name==='chat_messages'?allColumns.filter(c=>c!=='id'):allColumns;
      const rows=name==='chat_messages'?[...data[name]].sort((a,b)=>a.id-b.id):data[name];
      for(const row of rows){const result=await client.query(`INSERT INTO ${name} (${columns.join(',')}) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT DO NOTHING`,columns.map(c=>row[c]??null));if(name==='chat_sessions')counts.sessions+=result.rowCount;if(name==='chat_messages')counts.messages+=result.rowCount;}
    }
    for(const image of images){const result=await client.query('INSERT INTO app_images(key,content,content_type) VALUES($1,$2,$3) ON CONFLICT(key) DO NOTHING',[image.key,image.content,image.contentType]);counts.images+=result.rowCount;}
    await client.query('INSERT INTO app_settings(key,document) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET document=excluded.document,updated_at=now()',['agent/settings.json',JSON.stringify(document.settings)]);
    await client.query('INSERT INTO data_imports(digest) VALUES($1)',[digest]);
    await client.query('COMMIT');return counts;
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}

export async function transferRoutes(request,pool,config) {
 const url=new URL(request.url);
 if(url.pathname==='/admin/transfer')return new Response(transferPage,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 if(url.pathname!=='/api/admin/import')return null;
 if(request.method!=='POST'||request.headers.get('Origin')!==config.APP_ORIGIN)return Response.json({error:'Forbidden.'},{status:403});
 if(config.ASSET_STORAGE==='r2')return Response.json({error:'This transfer requires PostgreSQL image storage.'},{status:409});
 try{return Response.json(await importBackup(pool,await request.json()));}
 catch{return Response.json({error:'The backup could not be imported. No transcript rows or settings were changed. Check that this is a complete backup from the previous site.'},{status:400});}
}
