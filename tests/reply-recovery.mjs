import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {storageTestWorker} from './database-test-helper.mjs';
const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const {default:base,generateReply,defaults}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {generateReply,defaults};').toString('base64'));
const env={OPENAI_API_KEY:'test-only',BUCKET:{get:async()=>null}};
const good={reply:'Aakash uses observations from everyday life in his comedy.',language:'English',scope:'aakash',intent:'other',showIds:[],suggestions:[],visitorName:''};
const envelope=out=>({output:[{content:[{type:'output_text',text:JSON.stringify(out)}]}]});
let calls=[];let responses=[];
globalThis.fetch=async(_,o)=>{calls.push(JSON.parse(o.body));const next=responses.shift();return next instanceof Response?next:Response.json(next)};
const messages=[{role:'user',content:'Describe his observational comedy.'}];
for(const failed of [{status:'incomplete',output:[]},{output:[]},{output:[{content:[{type:'output_text',text:'{broken'}]}]},envelope({...good,reply:''}),envelope({...good,language:'Hinglish'})]){
 calls=[];responses=[failed,envelope(good)];const response=await generateReply(env,messages,defaults,{language:'English'});assert.equal(response.status,200);assert.equal((await response.json()).reply,good.reply);assert.equal(calls.length,2);assert.equal(calls[0].max_output_tokens,1200);assert.equal(calls[1].max_output_tokens,2200);assert.deepEqual(calls[0].text.format.schema.properties.language.enum,['English']);
}
calls=[];responses=[{status:'incomplete'},{status:'incomplete'}];assert.equal((await generateReply(env,messages,defaults,{language:'English'})).status,502);assert.equal(calls.length,2);
calls=[];responses=[Response.json({error:{code:'insufficient_quota'}},{status:429})];assert.equal((await generateReply(env,messages,defaults,{language:'English'})).status,503);assert.equal(calls.length,1);
// A successful recovery remains a single saved turn, and replay uses the saved result.
calls=[];responses=[{status:'incomplete'},envelope(good)];const worker=storageTestWorker(base);
const req=body=>new Request('https://test.local/api/chat',{method:'POST',headers:{Origin:'https://test.local'},body:JSON.stringify(body)});
const result=await (await worker.fetch(req({messages,context:{language:'English'}}),env)).json();assert.ok(result.reply.includes(good.reply));const counts=env.DB.sqlite.prepare('SELECT role,count(*) n FROM chat_messages GROUP BY role').all();assert.equal(counts.find(x=>x.role==='user').n,1);assert.equal(counts.find(x=>x.role==='assistant').n,1);
const turn=env.DB.sqlite.prepare('SELECT id FROM chat_turns').get();const replay=await (await worker.fetch(req({session:result.session,turnId:turn.id,messages,context:{language:'English'}}),env)).json();assert.equal(replay.duplicate,true);assert.equal(calls.length,2);
console.log('Passed: truncated/empty/malformed/language-invalid reply recovery, canonical language schema, one bounded retry, quota handling, and single-turn transcript/idempotency.');
