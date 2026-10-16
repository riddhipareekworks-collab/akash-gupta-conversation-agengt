import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {storageTestWorker} from './database-test-helper.mjs';
const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const {default:base}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const worker=storageTestWorker(base);
const env={OPENAI_API_KEY:'test-only',ADMIN_OWNER_EMAIL:'owner@test.local',BUCKET:{get:async()=>null}};
globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Model output must not leak competing show details.',language:'English',scope:'other_comedian',scopeNotice:'',redirectHumour:'microphone',intent:'show_schedule',showIds:['AG001'],suggestions:[]})}]}]});
async function ask(q,language='Hinglish',tone='akash'){
 const response=await worker.fetch(new Request('https://test.local/api/chat',{method:'POST',headers:{Origin:'https://test.local'},body:JSON.stringify({messages:[{role:'user',content:q}],context:{language,tone}})}),env);
 assert.equal(response.status,200);return response.json();
}
const notice='Yeh platform sirf Aakash Gupta par focused hai. Main kisi aur comedian ke baare mein jaankari ya rai nahi de sakta.';
for(const tone of ['normal','akash']){
 const out=await ask('Samay Raina ke show tickets chahiye','Hinglish',tone);
 assert.equal(out.reaction,'other-comedian-shows');assert.equal(out.reply,notice);assert.deepEqual(out.shows,[]);assert.ok(out.suggestions.every(s=>/Aakash|आकाश/i.test(s.query)));
}
const english=await ask('Show me other comedy shows','English','normal');assert.equal(english.reaction,'other-comedian-shows');assert.match(english.reply,/This platform focuses only on Aakash Gupta/);
const classified=await ask('Tickets for a different performer please','English');assert.equal(classified.reaction,'other-comedian-shows');assert.ok(!classified.reply.includes('Model output'));
const video=await ask('Samay Raina ke videos chahiye');assert.equal(video.reaction,undefined);
const image=await base.fetch(new Request('https://test.local/chat-reaction.png'),{});assert.equal(image.headers.get('Content-Type'),'image/png');assert.equal(createHash('sha256').update(Buffer.from(await image.arrayBuffer())).digest('hex'),'0d2abe7f84291aaf173e641a5b05624aa9dcd31ff8df2bf0c023290e54522fbb');
const saved=await env.DB.prepare("SELECT metadata_json FROM chat_messages WHERE role='assistant' AND metadata_json LIKE '%other-comedian-shows%' LIMIT 1").first();assert.equal(JSON.parse(saved.metadata_json).reaction,'other-comedian-shows');
const home=await (await base.fetch(new Request('https://test.local/'),{})).text();assert.ok(home.indexOf('reactionBubble(d.reaction);')<home.indexOf('const b=bubble(d.reply)'));assert.match(home,/img\.src='\/chat-reaction\.png'/);
const admin=await (await base.fetch(new Request('https://test.local/admin',{headers:{'oai-authenticated-user-email':'owner@test.local'}}),env)).text();assert.match(admin,/reactionBubble\(d.reaction\);renderRuleReactions\(d.reactionItems\);const b=bubble\(d.reply\)/);
const sessions=await (await base.fetch(new Request('https://test.local/admin/sessions',{headers:{'oai-authenticated-user-email':'owner@test.local'}}),env)).text();assert.match(sessions,/metadata\?\.reaction==='other-comedian-shows'/);
console.log('Passed: supplied image bytes, image before refusal, both tones, language, generic/model-classified competitors, and transcript rendering.');
