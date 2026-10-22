import assert from 'node:assert/strict';
import {test} from 'node:test';
import {testPool} from './helpers.mjs';
import {migrate} from '../server/postgres.mjs';
import {installReactionPack} from '../server/reaction-pack.mjs';
test('Sticker import preserves existing settings and owner edits across restarts',async()=>{
 const pool=await testPool();try{
  await migrate(pool);const settings={persona:'Keep my persona',tone:'Keep tone',reactions:[{id:'existing',name:'Keep old rule',enabled:true}]};
  await pool.query('INSERT INTO app_settings(key,document) VALUES($1,$2)',['agent/settings.json',JSON.stringify({settings,updatedAt:'unchanged'})]);
  await installReactionPack(pool);
  let doc=JSON.parse((await pool.query('SELECT document FROM app_settings WHERE key=$1',['agent/settings.json'])).rows[0].document);
  assert.equal(doc.settings.persona,settings.persona);assert.equal(doc.settings.tone,settings.tone);assert.deepEqual(doc.settings.reactions.at(-1),settings.reactions[0]);assert.equal(doc.settings.reactions.length,6);assert.equal((await pool.query('SELECT key FROM app_images')).rows.length,5);
  doc.settings.reactions=doc.settings.reactions.filter(r=>r.id!=='discount-sticker');await pool.query('UPDATE app_settings SET document=$2 WHERE key=$1',['agent/settings.json',JSON.stringify(doc)]);
  await installReactionPack(pool);const again=JSON.parse((await pool.query('SELECT document FROM app_settings WHERE key=$1',['agent/settings.json'])).rows[0].document);assert.deepEqual(again,doc);
 }finally{await pool.end();}
});
